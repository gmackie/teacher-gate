# Python client

A Python 3 client for the Teacher Gate HTTP service, using only the standard library
(`urllib.request`, `json`): [`client.py`](client.py).

## Run

Start the service (see [examples/README.md](../README.md)), then from the repository root:

```sh
python3 examples/python-client/client.py              # item syn-cer-01
python3 examples/python-client/client.py syn-cer-35   # a prompt-injection item
```

| Variable | Default | Meaning |
|---|---|---|
| `TEACHER_GATE_URL` | `http://localhost:8787` | The service |
| `TEACHER_GATE_TOKEN` | none | A `product` token; omit in insecure dev mode |

## What it does

The same steps as the [Node client](../node-client/README.md): put the activity, draft, read the
teacher view, decide on every finding (accept, edit, reject in turn; grade-language findings are
always edited), release if nothing blocks it, read the student view, and confirm a student gets
403 on the draft.

Errors from the service raise `ApiError` with the HTTP status and the service's
`{ error, message }`.

## Using it in your backend

Copy `call()`. Set the actor headers from your signed-in session, never from the browser, and keep
the `product` token on the server.
