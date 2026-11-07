// The teacher's review of a class misconception brief (Task 2): a reference component to copy and
// adapt. The model mapped responses to known misconceptions, quoting each one; Teacher Gate kept
// only mappings whose quote is exactly in that response. Here the teacher confirms, rejects or
// reassigns every mapping, and only then can save. The saved brief holds confirmed patterns only.
import type { BriefDraft, MappingDecision, MappingDecisionInput, Misconception, SavedBrief } from "@teacher-gate/core";
import { useId, useState, type ReactNode } from "react";

/** A brief as the service returns it from `GET /v1/briefs/:id` (`getBrief`). */
export interface BriefState {
  draft: BriefDraft;
  decisions: MappingDecision[];
  saved?: SavedBrief;
  /** Mapping IDs not decided yet. */
  open: string[];
}

/** Props for {@link BriefReview}. */
export interface BriefReviewProps {
  brief: BriefState;
  /** Records one decision. The parent should refresh `brief` afterwards. */
  onDecide: (input: MappingDecisionInput) => Promise<void>;
  /** Saves the brief. The parent should refresh `brief` afterwards. */
  onSave: () => Promise<void>;
  /** The heading level of the component's title. Default 2. */
  headingLevel?: 2 | 3;
}

const DROP_LABELS: Record<string, string> = {
  "invalid-schema": "malformed output",
  "unknown-misconception": "named a misconception not in the catalog",
  "unknown-response": "cited a response not in the class set",
  "quote-not-found": "quote not found in the response",
};

function describeDecision(d: MappingDecision, catalog: readonly Misconception[]): string {
  if (d.decision === "confirm") return "Confirmed";
  if (d.decision === "reject") return "Rejected";
  return `Reassigned to "${catalog.find((c) => c.id === d.misconceptionId)?.title ?? d.misconceptionId}"`;
}

/** The teacher's review of a misconception brief. See the module comment. */
export function BriefReview({ brief, onDecide, onSave, headingLevel = 2 }: BriefReviewProps): ReactNode {
  const uid = useId().replace(/:/g, "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const H = headingLevel === 2 ? "h2" : "h3";
  const H2 = headingLevel === 2 ? "h3" : "h4";
  const H3 = headingLevel === 2 ? "h4" : "h5";
  const { draft, saved } = brief;
  const decisions = new Map(brief.decisions.map((d) => [d.mappingId, d]));
  const groups = draft.catalog
    .map((m) => ({ misconception: m, mappings: draft.mappings.filter((x) => x.misconceptionId === m.id) }))
    .filter((g) => g.mappings.length > 0);
  const droppedByReason: Record<string, number> = {};
  for (const d of draft.dropped) droppedByReason[d.reason] = (droppedByReason[d.reason] ?? 0) + 1;

  const run = async (label: string, action: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setStatus(`${label}…`);
    try {
      await action();
      setStatus(`${label}: done.`);
      return true;
    } catch (error) {
      setStatus(`${label} failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const locked = busy || saved !== undefined;
  const saveHelpId = `${uid}-save-help`;

  return (
    <div className="tg-root tg-brief">
      <H>Misconception brief</H>
      <p className="tg-notice">AI-suggested patterns for you to check. Nothing is saved until you have confirmed or rejected every mapping.</p>
      <blockquote className="tg-quote">{draft.item.prompt}</blockquote>
      <p className="tg-muted">{`${draft.responses} responses read; ${draft.mappings.length} mapping${draft.mappings.length === 1 ? "" : "s"} passed the quote check.`}</p>
      {draft.dropped.length > 0 ? (
        <ul>
          {Object.entries(droppedByReason).map(([reason, n]) => (
            <li key={reason}>{`${n} mapping${n === 1 ? "" : "s"} dropped: ${DROP_LABELS[reason] ?? reason}`}</li>
          ))}
        </ul>
      ) : null}
      {draft.invalidBatches > 0 ? <p className="tg-warning">{`${draft.invalidBatches} batch(es) of responses got no readable answer from the model; those responses were not mapped.`}</p> : null}
      {groups.length === 0 ? <p>The model mapped no responses to the catalog's misconceptions.</p> : null}

      {groups.map((g) => (
        <section key={g.misconception.id} aria-labelledby={`${uid}-${g.misconception.id}`}>
          <H2 id={`${uid}-${g.misconception.id}`}>{`${g.misconception.title} (${g.mappings.length})`}</H2>
          <p className="tg-muted">{g.misconception.description}</p>
          <ul className="tg-findings">
            {g.mappings.map((m) => {
              const d = decisions.get(m.id);
              return (
                <li key={m.id} className="tg-finding">
                  <H3 id={`${uid}-map-${m.id}`} style={{ margin: 0 }}>{`${m.learnerRef}, response ${m.responseId}`}</H3>
                  <blockquote className="tg-quote">{m.quote}</blockquote>
                  <p className="tg-muted">{`Uncertainty: ${m.uncertainty}`}</p>
                  <p className={d === undefined ? "tg-muted" : "tg-decision"}>{d === undefined ? "Not decided yet." : describeDecision(d, draft.catalog)}</p>
                  <MappingActions
                    mappingId={m.id}
                    labelledBy={`${uid}-map-${m.id}`}
                    current={m.misconceptionId}
                    catalog={draft.catalog}
                    locked={locked}
                    onDecide={(input, label) => run(label, () => onDecide(input))}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {draft.strengths.length > 0 ? (
        <section aria-labelledby={`${uid}-strengths`}>
          <H2 id={`${uid}-strengths`}>Strengths to build on</H2>
          <ul>{draft.strengths.map((s, i) => <li key={i}>{`${s.note} (${s.learnerRef}): `}<q>{s.quote}</q></li>)}</ul>
        </section>
      ) : null}

      <section aria-labelledby={`${uid}-save`} className="tg-panel" style={{ marginTop: "1.5rem" }}>
        <H2 id={`${uid}-save`}>Save the brief</H2>
        {saved === undefined ? (
          <p id={saveHelpId}>{brief.open.length > 0 ? `Decide on every mapping first (${brief.open.length} open).` : "Every mapping is decided. Only confirmed and reassigned mappings will be saved."}</p>
        ) : null}
        {saved === undefined ? (
          <div className="tg-actions">
            <button type="button" className="tg-primary" disabled={locked || brief.open.length > 0} aria-describedby={saveHelpId} onClick={() => void run("Save brief", onSave)}>
              Save brief
            </button>
          </div>
        ) : (
          <>
            <p className="tg-decision">{`Saved by ${saved.savedBy}.`}</p>
            <pre className="tg-pre" aria-label="Saved brief (Markdown)">{saved.markdown}</pre>
          </>
        )}
      </section>

      <p role="status" aria-live="polite" className="tg-muted">{status}</p>
    </div>
  );
}

interface MappingActionsProps {
  mappingId: string;
  labelledBy: string;
  current: string;
  catalog: readonly Misconception[];
  locked: boolean;
  onDecide: (input: MappingDecisionInput, label: string) => Promise<boolean>;
}

function MappingActions({ mappingId, labelledBy, current, catalog, locked, onDecide }: MappingActionsProps): ReactNode {
  const selectId = useId();
  const others = catalog.filter((c) => c.id !== current);
  const [target, setTarget] = useState(others[0]?.id ?? "");
  return (
    <div className="tg-actions" role="group" aria-labelledby={labelledBy}>
      <button type="button" disabled={locked} onClick={() => void onDecide({ mappingId, decision: "confirm" }, `Confirm ${mappingId}`)}>Confirm</button>
      <button type="button" disabled={locked} onClick={() => void onDecide({ mappingId, decision: "reject" }, `Reject ${mappingId}`)}>Reject</button>
      {others.length > 0 ? (
        <>
          <label htmlFor={selectId} style={{ display: "inline", margin: 0 }}>Reassign to</label>
          <select id={selectId} value={target} disabled={locked} onChange={(e) => setTarget(e.target.value)}>
            {others.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button type="button" disabled={locked || target === ""} onClick={() => void onDecide({ mappingId, decision: "reassign", misconceptionId: target }, `Reassign ${mappingId}`)}>Reassign</button>
        </>
      ) : null}
    </div>
  );
}
