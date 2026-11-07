// Language and reading level in the demo. After release, the teacher asks the model to rewrite the
// approved feedback in another language or at a lower reading level, reads the rewrite, and approves
// it; only then can the student choose to see it. The rewrite starts from the teacher's released
// words, never from the model's draft.
import type { ReleaseVariant } from "@teacher-gate/core";
import { useId, useState, type ReactNode } from "react";
import { api, TEACHER } from "./api";

/** Languages offered in the demo, as BCP 47 tags. */
export const LANGUAGES: { tag: string; name: string }[] = [
  { tag: "es", name: "Spanish" },
  { tag: "vi", name: "Vietnamese" },
  { tag: "zh", name: "Chinese" },
  { tag: "ar", name: "Arabic" },
  { tag: "fr", name: "French" },
];

/** A short label for a variant: "Spanish, grade 4 reading level". */
export function variantLabel(v: { language?: string; readingLevel?: number }): string {
  const parts = [];
  if (v.language !== undefined) parts.push(LANGUAGES.find((l) => l.tag === v.language)?.name ?? v.language);
  if (v.readingLevel !== undefined) parts.push(`grade ${v.readingLevel} reading level`);
  return parts.join(", ");
}

export interface VariantPanelProps {
  draftId: string;
  variants: readonly ReleaseVariant[];
  onChange: (variants: ReleaseVariant[]) => void;
  /** Released finding texts by id, to show beside the rewrite. */
  originals: Record<string, string>;
}

export function VariantPanel({ draftId, variants, onChange, originals }: VariantPanelProps): ReactNode {
  const uid = useId().replace(/:/g, "");
  const [language, setLanguage] = useState("es");
  const [readingLevel, setReadingLevel] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };
  const draft = () => run("Rewriting with the model… a local model can take a minute.", async () => {
    const v = await api.draftVariant(TEACHER, draftId, { ...(language === "" ? {} : { language }), ...(readingLevel === "" ? {} : { readingLevel: Number(readingLevel) }) });
    onChange([...variants, v]);
  });
  const approve = (id: string) => run("Approving…", async () => {
    const v = await api.approveVariant(TEACHER, draftId, id);
    onChange(variants.map((x) => (x.id === id ? v : x)));
  });

  return (
    <section className="tg-panel" aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`}>Language and reading level</h3>
      <p>
        Rewrite the feedback you released in another language or at a lower reading level. The model starts from your approved words
        and must keep their meaning; the student sees a rewrite only after you approve it.
      </p>
      <div className="tg-actions">
        <div>
          <label htmlFor={`${uid}-lang`}>Language</label>
          <select id={`${uid}-lang`} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">Keep English</option>
            {LANGUAGES.map((l) => <option key={l.tag} value={l.tag}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-level`}>Reading level</label>
          <select id={`${uid}-level`} value={readingLevel} onChange={(e) => setReadingLevel(e.target.value)}>
            <option value="">Keep as written</option>
            {[3, 4, 5, 6, 7, 8].map((g) => <option key={g} value={String(g)}>{`US grade ${g}`}</option>)}
          </select>
        </div>
      </div>
      <div className="tg-actions">
        <button type="button" disabled={busy !== "" || (language === "" && readingLevel === "")} onClick={() => void draft()}>Draft rewrite</button>
        <span role="status" className="tg-muted">{busy}</span>
      </div>
      {error !== "" ? <p className="tg-blockers" role="alert">{error}</p> : null}
      {variants.map((v) => (
        <article key={v.id} className="tg-variant" aria-label={`Rewrite: ${variantLabel(v)}`}>
          <h4>{`Rewrite: ${variantLabel(v)}`}{v.approvedAt !== undefined ? <span className="tg-tag">approved</span> : <span className="tg-tag">not shown to the student yet</span>}</h4>
          <ul>
            {v.findings.map((f) => (
              <li key={f.findingId} lang={v.language}>
                {f.text}
                {originals[f.findingId] !== undefined ? <span className="tg-muted" lang="en">{` (your words: ${originals[f.findingId]})`}</span> : null}
              </li>
            ))}
          </ul>
          {v.approvedAt === undefined ? (
            <button type="button" className="tg-primary" disabled={busy !== ""} onClick={() => void approve(v.id)}>Approve for the student</button>
          ) : null}
        </article>
      ))}
    </section>
  );
}
