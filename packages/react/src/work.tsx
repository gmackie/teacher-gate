// The student's work, artifact by artifact, with each finding's evidence highlighted in place. Shared
// by the teacher's review and the student's view, so both show evidence the same way.
import type { Artifact } from "@teacher-gate/core";
import type { ReactNode } from "react";
import { HighlightedText, type HighlightRange } from "./highlight";

/** One piece of evidence: a range of one artifact, belonging to a finding `key`. */
export interface EvidenceRange extends HighlightRange {
  artifactId: string;
}

/** Props for {@link WorkView}. */
export interface WorkViewProps {
  work: readonly Artifact[];
  evidence: readonly EvidenceRange[];
  focusedKey?: string | undefined;
  describedBy?: (key: string) => string;
  label?: (key: string) => string;
  onActivate?: (key: string) => void;
  /** Prefix for mark IDs; the first mark of each key gets `${idPrefix}${key}`. */
  idPrefix?: string;
  headingLevel?: 2 | 3;
}

/** Renders each artifact (with its label, if any) and the evidence highlighted within it. */
export function WorkView({ work, evidence, headingLevel = 3, ...rest }: WorkViewProps): ReactNode {
  const H = headingLevel === 2 ? "h2" : "h3";
  const seen = new Set<string>();
  return work.map((artifact, i) => {
    // A key's anchor ID goes on its first appearance across all artifacts.
    const ranges = evidence.filter((e) => e.artifactId === artifact.id);
    const keysHere = new Set(ranges.map((r) => r.key));
    const fresh = new Set([...keysHere].filter((k) => !seen.has(k)));
    for (const k of keysHere) seen.add(k);
    return (
      <section key={artifact.id} aria-label={artifact.label ?? (work.length > 1 ? `Part ${i + 1}` : "Student work")}>
        {work.length > 1 || artifact.label !== undefined ? <H>{artifact.label ?? `Part ${i + 1}`}</H> : null}
        <p className="tg-work-text">
          <HighlightedText
            text={artifact.text}
            ranges={ranges}
            focusedKey={rest.focusedKey}
            {...(rest.describedBy === undefined ? {} : { describedBy: rest.describedBy })}
            {...(rest.label === undefined ? {} : { label: rest.label })}
            {...(rest.onActivate === undefined ? {} : { onActivate: rest.onActivate })}
            // Keys already anchored in an earlier artifact keep their marks but not the anchor ID.
            {...(rest.idPrefix === undefined ? {} : { idPrefix: rest.idPrefix, anchorKeys: fresh })}
          />
        </p>
      </section>
    );
  });
}
