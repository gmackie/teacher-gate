# Handing a feedback draft to the teacher

Use this shape. Keep it short; the teacher reviews the findings in their own product.

```
Draft feedback for submission <submissionId> (draft <draftId>) — waiting for your review.

Suggested findings:
1. <criterion title> — <observation>
   Evidence: "<quote>" · Uncertainty: <low|medium|high>
2. ...

Needs your attention:
- <finding id>: states a grade or level; edit before release.   (only if flagged)
- <n> findings were discarded by verification.                  (only if notable)

Next: accept, edit or reject each finding in the review screen. <If policy is releasable:> You can
release once every finding is decided. <If teacher-only:> This activity keeps AI findings for you
only; they cannot be released to the student.
```

## Phrases to use and avoid

| Use | Avoid |
|---|---|
| "suggested finding", "draft", "for your review" | "the feedback is", "final", "approved" |
| "the draft cites…" | "the student scored…", "this is a Level 2" |
| "you can release it once…" | "I released / sent / shared it" |
| "the draft was skipped because the policy is none" | "I worked around the policy" |

## Skipped drafts

| `skipReason` | Tell the teacher |
|---|---|
| `ai-help-policy` | The activity's AI-help policy is `none`, so no model read the work. |
| `no-text` | The submission had no text to read. |
| `input-too-large` | The work is longer than the configured limit; nothing was truncated or sent. |
| `moderation` | The work was held by moderation before drafting. |
