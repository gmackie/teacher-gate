// Task 4 in the demo: the teacher states a goal, dry-runs it on the three synthetic responses to see
// what the AI would flag (nothing reaches students), records the AI's and their own judgements, and
// reads how often the two agree, with a drift alert when agreement falls.
import type { DryRun, Goal, GoalReport } from "@teacher-gate/core";
import { useId, useState, type ReactNode } from "react";
import { api, TEACHER } from "./api";
import { activity, submissions } from "./data";

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function pct(x: number | null): string {
  return x === null ? "not enough data" : `${Math.round(x * 100)}%`;
}

const AI_LABELS = { true: "Met", false: "Not met", null: "Could not verify" } as const;

export function GoalsTask(): ReactNode {
  const uid = useId().replace(/:/g, "");
  const [statement, setStatement] = useState("Uses measured data from the investigation as evidence for the claim.");
  const [criterionId, setCriterionId] = useState("evidence");
  const [goal, setGoal] = useState<Goal | undefined>(undefined);
  const [dry, setDry] = useState<DryRun | undefined>(undefined);
  const [tracked, setTracked] = useState(false);
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<GoalReport | undefined>(undefined);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  };

  const create = () => run("Saving your goal…", async () => {
    const g = await api.createGoal(TEACHER, { activityId: activity.id, statement, ...(criterionId === "" ? {} : { criterionId }) });
    setGoal(g);
    setDry(undefined);
    setTracked(false);
    setMine({});
    setReport(undefined);
  });
  const dryRun = () => run("Checking the goal on past work with the model… a local model can take a minute.", async () => {
    setDry(await api.dryRunGoal(TEACHER, goal!.id, submissions));
  });
  const track = () => run("Recording the AI's judgements…", async () => {
    for (const s of submissions) await api.evaluateGoal(TEACHER, goal!.id, s);
    setTracked(true);
  });
  const judge = (submissionId: string, met: boolean) => run("Recording your judgement…", async () => {
    await api.judgeGoal(TEACHER, goal!.id, submissionId, met);
    setMine((m) => ({ ...m, [submissionId]: met }));
  });
  const loadReport = () => run("Comparing judgements…", async () => {
    setReport(await api.goalReport(TEACHER, goal!.id));
  });

  return (
    <section aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`}>Goals and monitoring</h2>
      <p>
        State a goal for this activity. Teacher Gate turns it into a check the model runs on students' work, shows you what it would
        flag before you rely on it, and tracks how often the AI's judgement matches yours. Nothing here is shown to students.
      </p>
      <div className="tg-panel">
        <label htmlFor={`${uid}-statement`}>Your goal</label>
        <textarea id={`${uid}-statement`} value={statement} onChange={(e) => setStatement(e.target.value)} />
        <label htmlFor={`${uid}-criterion`}>Rubric criterion it relates to</label>
        <select id={`${uid}-criterion`} value={criterionId} onChange={(e) => setCriterionId(e.target.value)}>
          <option value="">None</option>
          {activity.rubric.criteria.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <div className="tg-actions">
          <button type="button" className="tg-primary" disabled={busy !== "" || statement.trim().length < 5} onClick={() => void create()}>
            {goal === undefined ? "Create goal" : "Create a new goal"}
          </button>
        </div>
      </div>
      <p role="status" className="tg-muted">{busy !== "" ? busy : goal !== undefined ? `Goal saved: "${goal.statement}"` : ""}</p>
      {error !== "" ? <p className="tg-blockers" role="alert">{error}</p> : null}

      {goal !== undefined ? (
        <>
          <h3>1. Dry run on past work</h3>
          <p>See what the check would say on the three synthetic responses. Each judgement quotes the work; one whose quote is not in the work is marked "Could not verify".</p>
          <div className="tg-actions">
            <button type="button" disabled={busy !== ""} onClick={() => void dryRun()}>{dry === undefined ? "Dry run" : "Dry run again"}</button>
          </div>
        </>
      ) : null}

      {goal !== undefined && dry !== undefined ? (
        <>
          <table className="tg-table">
            <caption>{`Dry run: met ${dry.met}, not met ${dry.notMet}, could not verify ${dry.unverified}`}</caption>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">AI judgement</th>
                <th scope="col">Evidence quoted from the work</th>
                <th scope="col">Your judgement</th>
              </tr>
            </thead>
            <tbody>
              {dry.results.map((r) => (
                <tr key={r.submissionId}>
                  <th scope="row">{r.learnerRef}</th>
                  <td>{AI_LABELS[String(r.met) as keyof typeof AI_LABELS]}{r.rationale !== undefined ? <span className="tg-muted">{` — ${r.rationale}`}</span> : null}</td>
                  <td>{r.evidence.length === 0 ? "None" : <ul className="tg-plain">{r.evidence.map((q, i) => <li key={i}><q>{q}</q></li>)}</ul>}</td>
                  <td>
                    <div className="tg-actions" role="group" aria-label={`Your judgement for ${r.learnerRef}`}>
                      <button type="button" aria-pressed={mine[r.submissionId] === true} disabled={busy !== ""} onClick={() => void judge(r.submissionId, true)}>Met</button>
                      <button type="button" aria-pressed={mine[r.submissionId] === false} disabled={busy !== ""} onClick={() => void judge(r.submissionId, false)}>Not met</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>2. Monitor agreement</h3>
          <p>Record the AI's judgements for tracking, give your own above, then compare. In use, this runs as students submit, and you are warned when agreement drifts down.</p>
          <div className="tg-actions">
            <button type="button" disabled={busy !== "" || tracked} onClick={() => void track()}>{tracked ? "AI judgements recorded" : "Record the AI's judgements"}</button>
            <button type="button" disabled={busy !== "" || !tracked || Object.keys(mine).length === 0} onClick={() => void loadReport()}>Compare with my judgements</button>
          </div>
        </>
      ) : null}

      {report !== undefined ? (
        <div className="tg-panel" aria-labelledby={`${uid}-report`}>
          <h3 id={`${uid}-report`}>Agreement report</h3>
          <dl className="tg-facts">
            <dt>Pairs compared</dt>
            <dd>{report.overall.pairs}</dd>
            <dt>The AI agreed with you</dt>
            <dd>{pct(report.overall.agreement)}</dd>
            <dt>Cohen's kappa</dt>
            <dd>{report.overall.kappa === null ? "not enough variation to compute" : report.overall.kappa.toFixed(2)}</dd>
            <dt>AI judgements it could not verify</dt>
            <dd>{report.unverifiedAi}</dd>
          </dl>
          {report.drift !== undefined ? <p className="tg-warning" role="alert">{report.drift.alert}</p> : <p className="tg-muted">No drift alert: an alert needs at least two time windows with enough judgements each.</p>}
        </div>
      ) : null}
    </section>
  );
}
