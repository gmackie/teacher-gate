# Tutorial 2: class misconception brief

Task 2 turns a class set of responses to one item into a one-page brief for planning the next
lesson. The model maps responses to known misconceptions, quoting each response. Code checks each
mapping. The teacher confirms, rejects or reassigns every mapping, then saves the brief. Only
confirmed (or reassigned) mappings appear in it.

## What the teacher does

1. Collects responses to one item (an exit ticket, for example) and asks for a brief.
2. Reviews mappings grouped by misconception. Each shows the response's own words.
3. Confirms, rejects or reassigns each mapping to another misconception in the catalog.
4. Saves the brief. It lists confirmed patterns, most common first, with the responses and quotes
   behind each, plus up to five strengths, and a Markdown rendering to print or share.

## Setup

As in [Tutorial 1](task1-verifiable-feedback.md):

```sh
BASE=http://localhost:8787/v1
TEACHER=(-H "X-Actor-Id: t-104" -H "X-Actor-Role: teacher" -H "Content-Type: application/json")
```

The catalog comes from the request, from the server's configured catalog, or from a public good.
The stock `teacher-gate-server` has no configured catalog, so send one. Synthetic examples are in
`data/synthetic/misconceptions.json` (15 entries, three class sets of 14 responses). Real
math misconceptions can come from the Learning Commons Knowledge Graph (see
[public goods](../public-goods.md)).

## The calls, in order

### 1. Draft the brief

```sh
python3 - <<'EOF' > /tmp/brief.json
import json
d = json.load(open("data/synthetic/misconceptions.json"))
cs = d["classSets"][0]
cs = {**cs, "responses": [{k: r[k] for k in ("id", "learnerRef", "text")} for r in cs["responses"]]}
print(json.dumps({"classSet": cs, "misconceptions": d["catalog"]}))
EOF
curl -s -X POST "$BASE/briefs" "${TEACHER[@]}" --data @/tmp/brief.json
```

(The script strips each response's `labels`, which are for evaluation; the `ClassSet` schema
rejects unknown fields.)

Staff, agents and services may draft; students may not. The reply (201):

```json
{ "id": "b7c1…", "kind": "brief", "classSetId": "…", "responses": 14,
  "catalog": [{ "id": "…", "title": "…" }],
  "mappings": [{ "id": "m1", "responseId": "syn-cs-heat-r01", "learnerRef": "syn-L101", "misconceptionId": "syn-mc-heat-02", "quote": "…", "start": 88, "end": 216, "uncertainty": "medium" }],
  "strengths": [{ "responseId": "syn-cs-heat-r04", "learnerRef": "syn-L104", "note": "…", "quote": "…" }],
  "dropped": [{ "reason": "invalid-schema" }],
  "invalidBatches": 0, "usage": { "inputTokens": 0, "outputTokens": 0 }, "skippedResponses": 0 }
```

### 2. Read it back

```sh
BRIEF=b7c1…
curl -s "$BASE/briefs/$BRIEF" "${TEACHER[@]}"
```

Returns `{ draft, decisions, open }`. `open` lists the mapping ids not yet decided.

### 3. Decide on each mapping

```sh
curl -s -X POST "$BASE/briefs/$BRIEF/decisions" "${TEACHER[@]}" -d '{ "mappingId": "m1", "decision": "confirm" }'
curl -s -X POST "$BASE/briefs/$BRIEF/decisions" "${TEACHER[@]}" -d '{ "mappingId": "m2", "decision": "reject" }'
curl -s -X POST "$BASE/briefs/$BRIEF/decisions" "${TEACHER[@]}" -d '{ "mappingId": "m3", "decision": "reassign", "misconceptionId": "syn-mc-heat-01" }'
```

Teacher only. Agents get 403.

### 4. Save

```sh
curl -s -X POST "$BASE/briefs/$BRIEF/save" "${TEACHER[@]}"
```

409 while any mapping is open. Otherwise 201 with the `SavedBrief`:

```json
{ "briefId": "b7c1…", "item": { "id": "…", "prompt": "…" }, "savedBy": "t-104", "savedAt": "…", "responses": 14,
  "patterns": [{ "misconception": { "id": "…", "title": "…", "standards": ["MS-PS3-3"], "source": "synthetic:teacher-gate" }, "count": 3,
    "evidence": [{ "responseId": "syn-cs-heat-r01", "learnerRef": "syn-L101", "quote": "…" }] }],
  "strengths": [], "markdown": "# Misconception brief: …" }
```

The brief names learners by `learnerRef` only. Your product maps those back to names for the
teacher.

## What is verified in code

| Check | Where |
|---|---|
| Responses go to the model inside a random boundary, in batches of at most 12,000 characters and 40 responses | `misconceptions.ts` |
| Responses that are empty or over 4,000 characters are left out, never truncated, and counted | `draftMisconceptionBrief` |
| Only catalog entries sharing a standard with the item are offered (at most 25) | `catalogFor` |
| A mapping is kept only if it parses, names a catalog misconception, names a response in the same batch, and its quote is exactly in that response | `draftMisconceptionBrief` |
| Duplicate response/misconception pairs are kept once | `draftMisconceptionBrief` |
| Strengths are kept only with a quote found in the response (at most 5) | `draftMisconceptionBrief` |
| Only a teacher on `direct` decides or saves; save needs every mapping decided; decisions are final after save | `decideMapping`, `saveBrief` |
| Rejected mappings never reach the saved brief | `saveBrief` |

Test: `packages/core/test/misconceptions.test.ts`.

## What is not verified

- Whether a mapping is pedagogically right. A quote can be real and still not show the named
  misconception. The teacher's confirmation is the check.
- Whether the catalog is right for the class. The synthetic catalog was written by the dataset's
  author and has not been reviewed by teachers.
