// The demo: one page with two tasks.
// - Feedback (Task 1 and 3): the teacher drafts AI feedback on a synthetic response, reviews it with
//   <TeacherReview>, releases it, then switches to what that student sees.
// - Misconception brief (Task 2): the teacher drafts a brief over a synthetic class set, confirms
//   each mapping with <BriefReview>, and saves it.
// All the rules (who may decide, what can be released) are enforced by the service; this page only
// renders its views and sends the teacher's choices.
import type { StudentFeedbackView, TeacherDraftView } from "@teacher-gate/core";
import { BriefReview, StudentFeedback, TeacherReview, teacherGateStyles, type BriefState } from "@teacher-gate/react";
import { useEffect, useState, type ReactNode } from "react";
import { api, TEACHER } from "./api";
import { activity, classSet, misconceptions, submissions } from "./data";

type Tab = "feedback" | "brief";

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function App(): ReactNode {
  const [tab, setTab] = useState<Tab>("feedback");
  const [health, setHealth] = useState<string>("Connecting to the Teacher Gate service…");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const h = await api.health();
        await api.putActivity(TEACHER, activity);
        if (!live) return;
        setHealth(`Connected. Model: ${h.model}.`);
        setReady(true);
      } catch (error) {
        if (live) setHealth(`Could not reach the service: ${message(error)} Start it with \`pnpm demo\`.`);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="tg-root demo">
      <style>{teacherGateStyles}</style>
      <header>
        <h1>Teacher Gate demo</h1>
        <p>
          All students, responses and misconceptions here are <strong>synthetic</strong>: written for this demo, with no real student data.
          You are acting as the teacher.
        </p>
        <p role="status" className="tg-muted">{health}</p>
        <nav aria-label="Demo tasks" className="tg-actions">
          <button type="button" aria-pressed={tab === "feedback"} onClick={() => setTab("feedback")}>Feedback on one response</button>
          <button type="button" aria-pressed={tab === "brief"} onClick={() => setTab("brief")}>Class misconception brief</button>
        </nav>
      </header>
      <main>
        {!ready ? null : tab === "feedback" ? <FeedbackTask /> : <BriefTask />}
      </main>
    </div>
  );
}

function FeedbackTask(): ReactNode {
  const [selected, setSelected] = useState(submissions[0]!.id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [view, setView] = useState<TeacherDraftView | undefined>(undefined);
  const [studentView, setStudentView] = useState<StudentFeedbackView | undefined>(undefined);
  const [as, setAs] = useState<"teacher" | "student">("teacher");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const submission = submissions.find((s) => s.id === selected)!;
  const draftId = drafts[selected];

  // Load the teacher's or the student's view whenever the selection or the role changes.
  useEffect(() => {
    let live = true;
    setError("");
    (async () => {
      try {
        if (as === "teacher") {
          const v = draftId === undefined ? undefined : await api.getDraft(TEACHER, draftId);
          if (live) setView(v);
        } else {
          const v = await api.studentView({ id: submission.learnerRef, role: "student" }, submission.id);
          if (live) setStudentView(v);
        }
      } catch (e) {
        if (live) setError(message(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [as, draftId, submission]);

  const draft = async () => {
    setBusy("Drafting feedback with the model… a local model can take a minute.");
    setError("");
    try {
      const d = await api.draft(TEACHER, submission);
      setDrafts((m) => ({ ...m, [submission.id]: d.id }));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  };
  const refresh = async () => {
    if (draftId !== undefined) setView(await api.getDraft(TEACHER, draftId));
  };

  return (
    <section aria-labelledby="feedback-title">
      <h2 id="feedback-title">Feedback on one response</h2>
      <p>{activity.prompt}</p>
      <div className="tg-actions" role="group" aria-label="Choose a student response">
        {submissions.map((s) => (
          <button key={s.id} type="button" aria-pressed={s.id === selected} onClick={() => setSelected(s.id)}>
            {s.learnerRef}
          </button>
        ))}
      </div>
      <div className="tg-actions" role="group" aria-label="View as">
        <button type="button" aria-pressed={as === "teacher"} onClick={() => setAs("teacher")}>Teacher view</button>
        <button type="button" aria-pressed={as === "student"} onClick={() => setAs("student")}>{`Student view (as ${submission.learnerRef})`}</button>
      </div>
      {error !== "" ? <p className="tg-blockers" role="alert">{error}</p> : null}

      {as === "student" ? (
        studentView === undefined ? <p>Loading…</p> : <StudentFeedback view={studentView} work={submission.artifacts} headingLevel={3} />
      ) : (
        <>
          {view === undefined ? (
            <div className="tg-panel">
              <h3>{`Response from ${submission.learnerRef}`}</h3>
              <p className="tg-work-text">{submission.artifacts[0]!.text}</p>
            </div>
          ) : null}
          <div className="tg-actions">
            <button type="button" className="tg-primary" disabled={busy !== ""} onClick={() => void draft()}>
              {draftId === undefined ? "Draft AI feedback" : "Draft again"}
            </button>
            <span role="status" className="tg-muted">{busy}</span>
          </div>
          {view !== undefined ? (
            <TeacherReview
              view={view}
              work={submission.artifacts}
              criteria={activity.rubric.criteria}
              headingLevel={3}
              onDecide={async (input) => {
                await api.decide(TEACHER, view.draft.id, input);
                await refresh();
              }}
              onRelease={async () => {
                await api.release(TEACHER, view.draft.id);
                await refresh();
              }}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function BriefTask(): ReactNode {
  const [briefId, setBriefId] = useState<string | undefined>(undefined);
  const [brief, setBrief] = useState<BriefState | undefined>(undefined);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const refresh = async (id = briefId) => {
    if (id !== undefined) setBrief(await api.getBrief(TEACHER, id));
  };
  const draft = async () => {
    setBusy("Drafting the brief with the model… a local model can take a minute.");
    setError("");
    try {
      const d = await api.draftBrief(TEACHER, classSet, misconceptions);
      setBriefId(d.id);
      await refresh(d.id);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <section aria-labelledby="brief-title">
      <h2 id="brief-title">Class misconception brief</h2>
      <p>{classSet.item.prompt}</p>
      <details>
        <summary>{`The class set (${classSet.responses.length} synthetic responses)`}</summary>
        <ul>{classSet.responses.map((r) => <li key={r.id}><strong>{`${r.learnerRef}: `}</strong>{r.text}</li>)}</ul>
      </details>
      <details>
        <summary>{`The misconception catalog (${misconceptions.length} synthetic entries, CC-BY-4.0)`}</summary>
        <ul>{misconceptions.map((m) => <li key={m.id}><strong>{m.title}.</strong> {m.description}</li>)}</ul>
      </details>
      {error !== "" ? <p className="tg-blockers" role="alert">{error}</p> : null}
      <div className="tg-actions">
        <button type="button" className="tg-primary" disabled={busy !== ""} onClick={() => void draft()}>
          {briefId === undefined ? "Draft brief" : "Draft again"}
        </button>
        <span role="status" className="tg-muted">{busy}</span>
      </div>
      {brief !== undefined ? (
        <BriefReview
          brief={brief}
          headingLevel={3}
          onDecide={async (input) => {
            await api.decideMapping(TEACHER, brief.draft.id, input);
            await refresh();
          }}
          onSave={async () => {
            await api.saveBrief(TEACHER, brief.draft.id);
            await refresh();
          }}
        />
      ) : null}
    </section>
  );
}
