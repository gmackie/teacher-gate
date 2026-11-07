// Evidence highlighting. A finding cites exact ranges of the student's work, and ranges from
// different findings may overlap or nest. The text is cut at every range boundary into segments;
// each segment knows every highlight that covers it, so overlaps render as one `<mark>` per segment
// rather than as nested or broken markup. Offsets are UTF-16 code units, as in `VerifiedExcerpt`.
import type { KeyboardEvent, ReactNode } from "react";

/** One range to highlight in a text, `[start, end)`, belonging to a highlight `key` (e.g. a finding). */
export interface HighlightRange {
  key: string;
  start: number;
  end: number;
}

/** A run of text and the highlight keys covering it, in the order the ranges were given. */
export interface Segment {
  start: number;
  end: number;
  text: string;
  keys: string[];
}

/**
 * Cuts `text` into segments at every range boundary. Ranges are clamped to the text; empty or
 * inverted ranges are ignored. Adjacent segments always differ in their covering keys or are
 * separated by a boundary, and together they reproduce `text` exactly.
 */
export function segmentText(text: string, ranges: readonly HighlightRange[]): Segment[] {
  const valid = ranges
    .map((r) => ({ key: r.key, start: Math.max(0, Math.min(r.start, text.length)), end: Math.max(0, Math.min(r.end, text.length)) }))
    .filter((r) => r.end > r.start);
  const cuts = new Set<number>([0, text.length]);
  for (const r of valid) {
    cuts.add(r.start);
    cuts.add(r.end);
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!;
    const end = points[i + 1]!;
    if (end <= start) continue;
    const keys = [...new Set(valid.filter((r) => r.start <= start && r.end >= end).map((r) => r.key))];
    out.push({ start, end, text: text.slice(start, end), keys });
  }
  return out;
}

/** Props for {@link HighlightedText}. */
export interface HighlightedTextProps {
  text: string;
  ranges: readonly HighlightRange[];
  /** The highlight shown as focused (stronger outline and underline). */
  focusedKey?: string | undefined;
  /** The element ID describing a key, for `aria-describedby` (e.g. the finding's heading). */
  describedBy?: (key: string) => string;
  /** A short label per key, shown as a tooltip (e.g. "Finding 2: Evidence"). */
  label?: (key: string) => string;
  /** Called when a highlight is activated by click or Enter/Space. Omit for read-only highlights. */
  onActivate?: (key: string) => void;
  /** Prefix for the `id` of each key's first mark, so a finding can scroll its evidence into view. */
  idPrefix?: string;
  /** The keys that get an anchor `id` here; default all. Lets a key anchor in only one of several texts. */
  anchorKeys?: ReadonlySet<string>;
}

/**
 * Renders text with its highlights. Each highlighted segment is a `<mark>` with an underline (so
 * highlights do not depend on color), a double underline where ranges overlap, and
 * `aria-describedby` pointing at the findings it is evidence for.
 */
export function HighlightedText({ text, ranges, focusedKey, describedBy, label, onActivate, idPrefix, anchorKeys }: HighlightedTextProps): ReactNode {
  const segments = segmentText(text, ranges);
  const firstSeen = new Set<string>();
  return segments.map((s) => {
    if (s.keys.length === 0) return <span key={s.start}>{s.text}</span>;
    // The mark a finding scrolls to is the first segment of its first range.
    const anchorKey = s.keys.find((k) => !firstSeen.has(k) && (anchorKeys === undefined || anchorKeys.has(k)));
    for (const k of s.keys) firstSeen.add(k);
    const focused = focusedKey !== undefined && s.keys.includes(focusedKey);
    // Activating a segment cycles to the next covering finding when the focused one is already among them.
    const target = focused && s.keys.length > 1 ? s.keys[(s.keys.indexOf(focusedKey!) + 1) % s.keys.length]! : (s.keys[0] as string);
    const activate = onActivate === undefined ? undefined : () => onActivate(target);
    const onKeyDown = activate === undefined ? undefined : (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    };
    return (
      <mark
        key={s.start}
        id={idPrefix !== undefined && anchorKey !== undefined ? `${idPrefix}${anchorKey}` : undefined}
        className={`tg-mark${focused ? " tg-mark--focused" : ""}${s.keys.length > 1 ? " tg-mark--overlap" : ""}`}
        data-keys={s.keys.join(" ")}
        data-start={s.start}
        data-end={s.end}
        aria-describedby={describedBy === undefined ? undefined : s.keys.map(describedBy).join(" ")}
        title={label === undefined ? undefined : s.keys.map(label).join("; ")}
        tabIndex={activate === undefined ? undefined : 0}
        onClick={activate}
        onKeyDown={onKeyDown}
      >
        {s.text}
      </mark>
    );
  });
}

/** Scrolls an element into view and focuses it, if it exists. Safe where `scrollIntoView` is missing (jsdom). */
export function revealElement(id: string): void {
  const el = typeof document === "undefined" ? null : document.getElementById(id);
  if (el === null) return;
  el.scrollIntoView?.({ block: "center", behavior: "smooth" });
  el.focus({ preventScroll: true });
}
