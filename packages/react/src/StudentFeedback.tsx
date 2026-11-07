// What the student sees: the feedback their teacher released, in the teacher's words, with the
// evidence highlighted in their own work. It renders a `StudentFeedbackView`, which the service
// builds from the release snapshot alone, so there is no level, score, uncertainty or rejected
// finding here to hide: none of it is in the data.
import type { Artifact, StudentFeedbackView } from "@teacher-gate/core";
import { useId, useState, type ReactNode } from "react";
import { revealElement } from "./highlight";
import { WorkView, type EvidenceRange } from "./work";

/** Props for {@link StudentFeedback}. */
export interface StudentFeedbackProps {
  view: StudentFeedbackView;
  work: readonly Artifact[];
  /** The heading level of the component's title. Default 2. */
  headingLevel?: 2 | 3;
}

function Item({ heading: Heading, id, criterion, text, quotes }: { heading: "h4" | "h5"; id: string; criterion: string; text: string; quotes: string[] }): ReactNode {
  return (
    <>
      <Heading id={id} style={{ margin: 0 }}>{criterion}</Heading>
      <p>{text}</p>
      {quotes.length > 0 ? (
        <p className="tg-muted">
          {"From your work: "}
          {quotes.map((q, i) => <q key={i}>{q}</q>).reduce<ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, "; ", el]), [])}
        </p>
      ) : null}
    </>
  );
}

/** The student's released feedback. See the module comment. */
export function StudentFeedback({ view, work, headingLevel = 2 }: StudentFeedbackProps): ReactNode {
  const uid = useId().replace(/:/g, "");
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const H = headingLevel === 2 ? "h2" : "h3";
  const H2 = headingLevel === 2 ? "h3" : "h4";
  const key = (i: number) => `n${i + 1}`;
  const itemId = (k: string) => `${uid}-item-${k}`;
  const markPrefix = `${uid}-evidence-`;
  const evidence: EvidenceRange[] = view.findings.flatMap((f, i) => f.evidence.map((e) => ({ key: key(i), artifactId: e.artifactId, start: e.start, end: e.end })));

  if (view.findings.length === 0) {
    return (
      <div className="tg-root tg-student">
        <H>Your feedback</H>
        <p>No feedback has been shared with you yet.</p>
      </div>
    );
  }
  return (
    <div className="tg-root tg-student">
      <H>Your feedback</H>
      {view.notice !== undefined ? <p className="tg-notice">{view.notice}</p> : null}
      {view.variant !== undefined ? <p className="tg-notice">{view.variant.notice}</p> : null}
      <div className="tg-layout">
        <section aria-labelledby={`${uid}-list`}>
          <H2 id={`${uid}-list`}>What your teacher noticed</H2>
          <ol className="tg-findings">
            {view.findings.map((f, i) => (
              <li key={key(i)} id={itemId(key(i))} tabIndex={-1} className={`tg-finding${focused === key(i) ? " tg-finding--focused" : ""}`}>
                <Item heading={H2 === "h3" ? "h4" : "h5"} id={`${itemId(key(i))}-title`} criterion={f.criterion} text={f.text} quotes={f.evidence.map((e) => e.quote)} />
                <button
                  type="button"
                  className="tg-link"
                  onClick={() => {
                    setFocused(key(i));
                    revealElement(`${markPrefix}${key(i)}`);
                  }}
                >
                  Show in my work
                </button>
              </li>
            ))}
          </ol>
        </section>
        <section className="tg-panel" aria-labelledby={`${uid}-work`}>
          <H2 id={`${uid}-work`}>Your work</H2>
          <WorkView
            work={work}
            evidence={evidence}
            focusedKey={focused}
            describedBy={(k) => `${itemId(k)}-title`}
            label={(k) => view.findings[Number(k.slice(1)) - 1]?.criterion ?? ""}
            onActivate={(k) => {
              setFocused(k);
              revealElement(itemId(k));
            }}
            idPrefix={markPrefix}
          />
        </section>
      </div>
    </div>
  );
}
