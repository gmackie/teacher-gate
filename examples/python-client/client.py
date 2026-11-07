#!/usr/bin/env python3
"""A minimal Teacher Gate client in Python, using only the standard library.

It runs the whole teacher-in-control loop on one synthetic CER paragraph from
data/synthetic/cer-feedback.json: put the activity, draft feedback, read the teacher's view,
accept / edit / reject each finding, release, then read what the student sees.

    python3 examples/python-client/client.py [item id, default syn-cer-01]

Environment: TEACHER_GATE_URL (default http://localhost:8787) and TEACHER_GATE_TOKEN (a
`product` token; omit it when the service runs with TEACHER_GATE_INSECURE_DEV=1).
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = os.environ.get("TEACHER_GATE_URL", "http://localhost:8787").rstrip("/")
TOKEN = os.environ.get("TEACHER_GATE_TOKEN")
TEACHER = {"id": "example-teacher", "role": "teacher"}
DATA = Path(__file__).resolve().parents[2] / "data" / "synthetic" / "cer-feedback.json"


class ApiError(Exception):
    def __init__(self, status, body):
        super().__init__(f"HTTP {status} {body.get('error')}: {body.get('message')}")
        self.status = status


def call(actor, method, path, body=None):
    """Calls /v1<path> as `actor` ({"id", "role"}) and returns the parsed JSON."""
    headers = {"x-actor-id": actor["id"], "x-actor-role": actor["role"]}
    if TOKEN:
        headers["authorization"] = f"Bearer {TOKEN}"
    data = None
    if body is not None:
        headers["content-type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(f"{BASE}/v1{path}", data=data, headers=headers, method=method)
    try:
        # Drafting with a local model can take minutes.
        with urllib.request.urlopen(req, timeout=900) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise ApiError(e.code, json.loads(e.read().decode("utf-8") or "{}")) from None


def q(s):
    return urllib.parse.quote(s, safe="")


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    item_id = sys.argv[1] if len(sys.argv) > 1 else "syn-cer-01"
    item = next((i for i in data["items"] if i["id"] == item_id), None)
    if item is None:
        sys.exit(f"No item {item_id} in cer-feedback.json")
    activity = data["activity"]

    with urllib.request.urlopen(f"{BASE}/healthz", timeout=10) as res:
        print(f"Service at {BASE}, model {json.loads(res.read())['model']}")

    # 1. The teacher sets up the activity: rubric and AI-help policy ("releasable").
    call(TEACHER, "PUT", f"/activities/{q(activity['id'])}", activity)

    # 2. Draft feedback. learnerRef is opaque: never a name or email.
    submission = {
        "id": f"sub-{item['id']}",
        "activityId": activity["id"],
        "learnerRef": item["learnerRef"],
        "artifacts": [{"id": "work", "text": item["text"]}],
    }
    print("Drafting (a local 7B model can take 10-60 seconds)...")
    draft = call(TEACHER, "POST", "/drafts", submission)

    # 3. The teacher's view: verified findings with quoted evidence.
    view = call(TEACHER, "GET", f"/drafts/{q(draft['id'])}")
    print(f"Draft {draft['id']}: {view['draft']['status']}; dropped by the verifier: {view['droppedByReason']}")
    if not view["findings"]:
        print("No verified findings to review, so there is nothing to release.")
        return

    # 4. Decide on every finding: accept, edit, reject in turn. Text flagged as stating a grade or
    #    level cannot be released as written, so it is always edited.
    for i, f in enumerate(view["findings"]):
        print(f"\n{f['id']} [{f['criterionTitle']}, uncertainty {f['uncertainty']}] {f['observation']}")
        for e in f["excerpts"]:
            print(f'   evidence: "{e["quote"]}"')
        if "gradeLanguage" in f or i % 3 == 1:
            choice = {"findingId": f["id"], "decision": "edit",
                      "text": f'Next step: look again at "{f["excerpts"][0]["quote"]}" and say what it shows about your claim.'}
        elif i % 3 == 0:
            choice = {"findingId": f["id"], "decision": "accept"}
        else:
            choice = {"findingId": f["id"], "decision": "reject", "reason": "Not what we focused on this week."}
        call(TEACHER, "POST", f"/drafts/{q(draft['id'])}/decisions", choice)
        print(f"   teacher: {choice['decision']}")

    # 5. Release, once nothing blocks it. Only a teacher acting directly can do this.
    view = call(TEACHER, "GET", f"/drafts/{q(draft['id'])}")
    if view["releaseBlockers"]:
        print("\nNot released: " + " ".join(view["releaseBlockers"]))
        return
    release = call(TEACHER, "POST", f"/drafts/{q(draft['id'])}/release")
    print(f"\nReleased {len(release['findings'])} finding(s) by {release['releasedBy']} at {release['releasedAt']}")

    # 6. What the student sees. The student's id must be the submission's learnerRef.
    student = {"id": item["learnerRef"], "role": "student"}
    sv = call(student, "GET", f"/submissions/{q(submission['id'])}/student-view")
    print(f"\nStudent view for {item['learnerRef']} ({sv.get('notice', '')}):")
    for f in sv["findings"]:
        print(f"- {f['criterion']}: {f['text']}")

    # A student cannot read the teacher's draft.
    try:
        call(student, "GET", f"/drafts/{q(draft['id'])}")
    except ApiError as e:
        print(f"\nA student reading the draft gets HTTP {e.status}.")


if __name__ == "__main__":
    main()
