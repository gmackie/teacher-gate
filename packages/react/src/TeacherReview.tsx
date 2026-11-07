// The teacher's review of an AI draft: a reference component to copy and adapt.
//
// It shows the student's work with each finding's evidence highlighted in place, and beside it every
// finding with what the teacher needs to judge it: the criterion, the observation, the suggested
// level (teacher only), the model's uncertainty, whether the evidence had to be re-anchored, and a
// warning when the text states a grade. The teacher accepts, edits or rejects each one, and releases
// only when nothing blocks release. The component holds no data of its own: it renders a
// `TeacherDraftView` from the service and calls back with `DecisionInput`s, so the service's rules
// (only a teacher acting directly decides; nothing is released with open findings) stay in force.
import type { AppliedPreference, Artifact, Criterion, DecisionInput, TeacherDraftView, TeacherFindingView } from "@teacher-gate/core";
import { useCallback, useId, useState, type ReactNode } from "react";
import { revealElement } from "./highlight";
import { WorkView, type EvidenceRange } from "./work";

/** Plain-language labels for why a finding was dropped (`DropReason`). */
export const DROP_REASON_LABELS: Record<string, string> = {
  "invalid-schema": "the model's output was malformed",
  "forbidden-field": "it tried to assign a score or grade",
  "unknown-criterion": "it named a criterion not in the rubric",
  "unselected-criterion": "it addressed a criterion you did not select",
  "unknown-level": "it named a level the criterion does not have",
  "unknown-artifact": "it cited work that was not submitted",
  "quote-not-found": "quote not found in the work",
  "range-mismatch": "its quote did not match the cited position",
};

const UNCERTAINTY_LABELS: Record<string, string> = { low: "Low (the model is fairly sure)", medium: "Medium", high: "High (treat with caution)" };
const DECISION_LABELS: Record<string, string> = { accept: "Accepted", edit: "Edited", reject: "Rejected" };
const SKIP_LABELS: Record<string, string> = {
  "ai-help-policy": "this activity's AI help policy does not allow AI to read the work",
  "no-text": "the submission has no text",
  "input-too-large": "the submission is too long to send to the model",
  moderation: "the work was held by moderation",
};

/** Props for {@link TeacherReview}. */
export interface TeacherReviewProps {
  view: TeacherDraftView;
  /** The submitted work the draft's evidence points into. */
  work: readonly Artifact[];
  /** Records one decision. The parent should refresh `view` afterwards. Reject the promise to report failure. */
  onDecide: (input: DecisionInput) => Promise<void>;
  /** Releases the draft. The parent should refresh `view` afterwards. */
  onRelease: () => Promise<void>;
  /** The rubric's criteria, so an edit can choose any level. Without it only the suggested level is offered. */
  criteria?: readonly Criterion[];
  /** The heading level of the component's title. Default 2. */
  headingLevel?: 2 | 3;
}

type Mode = { kind: "idle" } | { kind: "edit"; text: string; levelId: string } | { kind: "reject"; reason: string };

/** Pluralizes "finding". */
function findings(n: number): string {
  return `${n} finding${n === 1 ? "" : "s"}`;
}

/** The teacher's review of one AI draft. See the module comment. */
export function TeacherReview({ view, work, onDecide, onRelease, criteria, headingLevel = 2 }: TeacherReviewProps): ReactNode {
  const uid = useId().replace(/:/g, "");
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const H = headingLevel === 2 ? "h2" : "h3";
  const H2 = headingLevel === 2 ? "h3" : "h4";

  const findingId = (id: string) => `${uid}-finding-${id}`;
  const headingId = (id: string) => `${uid}-finding-${id}-title`;
  const markPrefix = `${uid}-evidence-`;
  const index = new Map(view.findings.map((f, i) => [f.id, i + 1]));

  const evidence: EvidenceRange[] = view.findings.flatMap((f) => f.excerpts.map((e) => ({ key: f.id, artifactId: e.artifactId, start: e.start, end: e.end })));

  const focusFinding = useCallback((id: string) => {
    setFocused(id);
    revealElement(`${uid}-finding-${id}`);
  }, [uid]);
  const focusEvidence = (id: string) => {
    setFocused(id);
    revealElement(`${markPrefix}${id}`);
  };

  /** Runs one action, announcing progress and the outcome in the live region. Resolves to success. */
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

  const blockersId = `${uid}-blockers`;
  const droppedTotal = Object.values(view.droppedByReason).reduce((a, b) => a + b, 0);
  const releasable = !view.released && view.releaseBlockers.length === 0 && view.draft.status === "completed";

  return (
    <div className="tg-root tg-review">
      <H>Review AI feedback</H>
      <p className="tg-notice">{view.notice}</p>

      {view.draft.status !== "completed" ? (
        <p className="tg-warning" role="status">
          {view.draft.status === "skipped"
            ? `No feedback was drafted: ${SKIP_LABELS[view.draft.skipReason ?? ""] ?? view.draft.skipReason ?? "skipped"}.`
            : view.draft.status === "invalid-output"
              ? "The model's output could not be read, so there are no findings. Try drafting again or use another model."
              : "The model could not be reached. Try drafting again."}
        </p>
      ) : null}

      <AppliedPreferences preferences={view.draft.appliedPreferences} Heading={H2} />

      {droppedTotal > 0 ? (
        <section aria-labelledby={`${uid}-dropped`}>
          <H2 id={`${uid}-dropped`}>Checked and dropped</H2>
          <p className="tg-muted">Findings that failed Teacher Gate's checks are never shown. Their content is not kept.</p>
          <ul>
            {Object.entries(view.droppedByReason).map(([reason, n]) => (
              <li key={reason}>{`${findings(n)} dropped: ${DROP_REASON_LABELS[reason] ?? reason}`}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="tg-layout">
        <section className="tg-panel" aria-labelledby={`${uid}-work`}>
          <H2 id={`${uid}-work`}>Student work</H2>
          <p className="tg-muted">Highlighted text is evidence the model cited. Select a highlight to see its finding.</p>
          <WorkView
            work={work}
            evidence={evidence}
            focusedKey={focused}
            describedBy={headingId}
            label={(k) => `Finding ${index.get(k) ?? k}: ${view.findings.find((f) => f.id === k)?.criterionTitle ?? ""}`}
            onActivate={focusFinding}
            idPrefix={markPrefix}
          />
        </section>

        <section aria-labelledby={`${uid}-findings`}>
          <H2 id={`${uid}-findings`}>{`Findings (${view.findings.length})`}</H2>
          <ol className="tg-findings">
            {view.findings.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                number={index.get(f.id)!}
                id={findingId(f.id)}
                headingId={headingId(f.id)}
                focused={focused === f.id}
                locked={view.released || busy}
                levels={criteria?.find((c) => c.id === f.criterionId)?.levels}
                onShowEvidence={() => focusEvidence(f.id)}
                onFocus={() => setFocused(f.id)}
                onDecide={(input, label) => run(label, () => onDecide(input))}
                Heading={H2 === "h3" ? "h4" : "h5"}
              />
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby={`${uid}-release`} className="tg-panel" style={{ marginTop: "1.5rem" }}>
        <H2 id={`${uid}-release`}>Release to the student</H2>
        {view.released ? (
          <p className="tg-decision">Released. The student now sees the findings you accepted or edited, in your words.</p>
        ) : view.releaseBlockers.length > 0 ? (
          <div id={blockersId} className="tg-blockers">
            <p style={{ margin: 0 }}>Release is not possible yet:</p>
            <ul>{view.releaseBlockers.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        ) : (
          <p id={blockersId}>Every finding is decided. Only accepted and edited findings will be released; levels and uncertainty are never shown to the student.</p>
        )}
        <div className="tg-actions">
          <button type="button" className="tg-primary" disabled={!releasable || busy} aria-describedby={view.released ? undefined : blockersId} onClick={() => void run("Release", onRelease)}>
            {view.released ? "Released" : "Release to student"}
          </button>
        </div>
      </section>

      <p role="status" aria-live="polite" className="tg-muted">{status}</p>
    </div>
  );
}

/** The Task 3 preferences that shaped a draft, so the teacher can see what steered the model. */
export function AppliedPreferences({ preferences, Heading = "h3" }: { preferences: readonly AppliedPreference[]; Heading?: "h2" | "h3" | "h4" }): ReactNode {
  const id = useId();
  if (preferences.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <Heading id={id}>What shaped this draft</Heading>
      <ul>
        {preferences.map((p) => (
          <li key={p.id}>
            {p.description}
            <span className="tg-tag">{p.source === "guidance" ? "your settings" : "your past decisions"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface FindingCardProps {
  finding: TeacherFindingView;
  number: number;
  id: string;
  headingId: string;
  focused: boolean;
  locked: boolean;
  levels: Criterion["levels"] | undefined;
  onShowEvidence: () => void;
  onFocus: () => void;
  /** Resolves to whether the decision was recorded. */
  onDecide: (input: DecisionInput, label: string) => Promise<boolean>;
  Heading: "h4" | "h5";
}

function FindingCard({ finding: f, number, id, headingId, focused, locked, levels, onShowEvidence, onFocus, onDecide, Heading }: FindingCardProps): ReactNode {
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const fieldId = useId();
  const levelOptions = levels ?? (f.suggestedLevelId === undefined ? [] : [{ id: f.suggestedLevelId, label: f.suggestedLevelLabel ?? f.suggestedLevelId }]);
  const decide = async (input: DecisionInput, label: string) => {
    // A failed decision keeps the form open so the teacher's text is not lost.
    if (await onDecide(input, label)) setMode({ kind: "idle" });
  };
  const anyLocated = f.excerpts.some((e) => e.anchoring === "located");

  return (
    <li id={id} tabIndex={-1} className={`tg-finding${focused ? " tg-finding--focused" : ""}`} onFocus={onFocus} aria-labelledby={headingId}>
      <Heading id={headingId} style={{ margin: 0 }}>{`Finding ${number}: ${f.criterionTitle}`}</Heading>
      <p>{f.observation}</p>
      {f.gradeLanguage !== undefined ? (
        <p className="tg-warning">
          <strong>States a grade or level.</strong> Students must not see grades in AI feedback; edit this text before release. Accepting it as written will block release.
        </p>
      ) : null}
      <dl>
        {f.suggestedLevelLabel !== undefined ? (
          <>
            <dt>Suggested level</dt>
            <dd>{f.suggestedLevelLabel}<span className="tg-tag">teacher only</span></dd>
          </>
        ) : null}
        <dt>Uncertainty</dt>
        <dd>{UNCERTAINTY_LABELS[f.uncertainty] ?? f.uncertainty}</dd>
        <dt>Evidence</dt>
        <dd>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {f.excerpts.map((e, i) => <li key={i}><q>{e.quote}</q></li>)}
          </ul>
          <button type="button" className="tg-link" onClick={onShowEvidence}>Show in the work</button>
        </dd>
      </dl>
      {anyLocated ? (
        <p className="tg-muted">The model gave the wrong position for a quote; Teacher Gate found the exact text in the work and highlights it there. Check it is the passage meant.</p>
      ) : null}

      {f.decision !== undefined ? (
        <p className="tg-decision">
          {`Decision: ${DECISION_LABELS[f.decision.decision] ?? f.decision.decision}`}
          {f.decision.levelId !== undefined ? ` (level ${levels?.find((l) => l.id === f.decision!.levelId)?.label ?? f.decision.levelId}, teacher only)` : ""}
          {f.decision.reason !== undefined ? `. Reason: ${f.decision.reason}` : ""}
        </p>
      ) : (
        <p className="tg-muted">Not decided yet.</p>
      )}
      {f.decision?.text !== undefined ? <blockquote className="tg-quote">{f.decision.text}</blockquote> : null}

      {mode.kind === "edit" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void decide({ findingId: f.id, decision: "edit", text: mode.text, ...(mode.levelId === "" ? {} : { levelId: mode.levelId }) }, `Edit finding ${number}`);
          }}
        >
          <label htmlFor={`${fieldId}-text`}>Feedback the student will see</label>
          <textarea id={`${fieldId}-text`} value={mode.text} onChange={(e) => setMode({ ...mode, text: e.target.value })} required />
          {levelOptions.length > 0 ? (
            <>
              <label htmlFor={`${fieldId}-level`}>Level (teacher only, optional)</label>
              <select id={`${fieldId}-level`} value={mode.levelId} onChange={(e) => setMode({ ...mode, levelId: e.target.value })}>
                <option value="">No level</option>
                {levelOptions.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </>
          ) : null}
          <div className="tg-actions">
            <button type="submit" className="tg-primary" disabled={locked || mode.text.trim() === ""}>Save edit</button>
            <button type="button" onClick={() => setMode({ kind: "idle" })}>Cancel</button>
          </div>
        </form>
      ) : mode.kind === "reject" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void decide({ findingId: f.id, decision: "reject", ...(mode.reason.trim() === "" ? {} : { reason: mode.reason.trim() }) }, `Reject finding ${number}`);
          }}
        >
          <label htmlFor={`${fieldId}-reason`}>Reason (optional; helps future drafts)</label>
          <input id={`${fieldId}-reason`} type="text" value={mode.reason} onChange={(e) => setMode({ ...mode, reason: e.target.value })} style={{ width: "100%", boxSizing: "border-box" }} />
          <div className="tg-actions">
            <button type="submit" className="tg-primary" disabled={locked}>Confirm reject</button>
            <button type="button" onClick={() => setMode({ kind: "idle" })}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="tg-actions" role="group" aria-label={`Decide on finding ${number}`}>
          <button type="button" disabled={locked} onClick={() => void decide({ findingId: f.id, decision: "accept" }, `Accept finding ${number}`)}>Accept</button>
          <button type="button" disabled={locked} onClick={() => setMode({ kind: "edit", text: f.decision?.text ?? f.observation, levelId: f.decision?.levelId ?? f.suggestedLevelId ?? "" })}>Edit</button>
          <button type="button" disabled={locked} onClick={() => setMode({ kind: "reject", reason: "" })}>Reject</button>
        </div>
      )}
    </li>
  );
}
