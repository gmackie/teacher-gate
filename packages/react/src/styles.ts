// The components' stylesheet, as a string so it can be dropped into a `<style>` element or copied
// into your own CSS. Plain CSS, no framework. Every class is prefixed `tg-`.
//
// Accessibility intent (WCAG 2.2 AA): text colors meet 4.5:1 on their backgrounds; highlights are
// underlined (double where findings overlap) so they never rely on color alone; the focused
// highlight adds a solid outline; every control shows a visible focus ring and is at least 24px
// (here 32px) tall.

/** The stylesheet for the Teacher Gate reference components. */
export const teacherGateStyles = `
.tg-root { font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1b1b1f; }
.tg-root h2, .tg-root h3, .tg-root h4 { line-height: 1.25; margin: 0 0 .5rem; }
.tg-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; }
@media (max-width: 800px) { .tg-layout { grid-template-columns: minmax(0, 1fr); } }
.tg-panel { border: 1px solid #8a8a93; border-radius: 8px; padding: 1rem; background: #fff; }
.tg-work-text { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0 0 1rem; }
.tg-notice { border-left: 4px solid #1f4e9b; background: #eef3fb; padding: .5rem .75rem; margin: 0 0 1rem; }
.tg-warning { border-left: 4px solid #8a4b00; background: #fff4e0; color: #4a2a00; padding: .5rem .75rem; margin: .5rem 0; }
.tg-blockers { border-left: 4px solid #a3122a; background: #fdeef0; color: #5c0a18; padding: .5rem .75rem; margin: .5rem 0; }
.tg-muted { color: #4a4a52; }
.tg-tag { display: inline-block; border: 1px solid currentColor; border-radius: 4px; padding: 0 .35rem; font-size: .8125rem; margin-left: .25rem; }

.tg-mark { background: #fff1a8; color: #1b1b1f; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; border-radius: 2px; cursor: default; }
.tg-mark[tabindex] { cursor: pointer; }
.tg-mark--overlap { background: #ffd970; text-decoration-style: double; }
.tg-mark--focused { background: #ffc94d; outline: 2px solid #1b1b1f; outline-offset: 1px; text-decoration-thickness: 3px; }

.tg-findings { list-style: none; margin: 0; padding: 0; display: grid; gap: .75rem; }
.tg-finding { border: 1px solid #8a8a93; border-radius: 8px; padding: .75rem; }
.tg-finding--focused { border: 3px solid #1f4e9b; padding: calc(.75rem - 2px); }
.tg-finding dl { display: grid; grid-template-columns: max-content 1fr; gap: .125rem .75rem; margin: .5rem 0; }
.tg-finding dt { font-weight: 600; }
.tg-finding dd { margin: 0; }
.tg-decision { font-weight: 600; }

.tg-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .5rem; align-items: center; }
.tg-root button, .tg-root select, .tg-root textarea, .tg-root input { font: inherit; }
.tg-root button { min-height: 32px; min-width: 32px; padding: .25rem .75rem; border: 1px solid #1b1b1f; border-radius: 6px; background: #fff; color: #1b1b1f; cursor: pointer; }
.tg-root button.tg-primary { background: #1f4e9b; border-color: #1f4e9b; color: #fff; }
.tg-root button:disabled { background: #e8e8ec; border-color: #8a8a93; color: #4a4a52; cursor: not-allowed; }
.tg-root select, .tg-root input { min-height: 32px; border: 1px solid #5f5f68; border-radius: 6px; padding: .125rem .5rem; background: #fff; color: #1b1b1f; }
.tg-root textarea { width: 100%; box-sizing: border-box; min-height: 5rem; border: 1px solid #5f5f68; border-radius: 6px; padding: .5rem; color: #1b1b1f; background: #fff; }
.tg-root label { font-weight: 600; display: block; margin: .5rem 0 .25rem; }
.tg-root :focus-visible { outline: 3px solid #0b57d0; outline-offset: 2px; }
.tg-root .tg-link { border: none; background: none; padding: 0; min-height: 24px; color: #1f4e9b; text-decoration: underline; }
.tg-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.tg-pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f4f4f6; border: 1px solid #8a8a93; border-radius: 6px; padding: .75rem; font: 14px/1.5 ui-monospace, Menlo, Consolas, monospace; }
.tg-quote { margin: .25rem 0; padding-left: .75rem; border-left: 3px solid #5f5f68; }
`;
