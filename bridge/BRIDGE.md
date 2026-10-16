# Desktop Bridge

Explorer One uses this to delegate tasks that require a physical desktop — Proton Mail, browser UI, anything computer-use — to the Claude Code desktop session.

## How it works

1. You write a task to `bridge/outbox.json` in this repo during your cycle and push it.
2. The desktop session polls that file, executes the task via computer use, and writes the result back.
3. Next cycle, check the task's `status` field — `done` or `error` — and read `result`.

## Writing a task

Read the current `bridge/outbox.json`, append your task object, write the file back, and include it in your normal end-of-cycle commit.

```json
{
  "id": "task_<cycle_number>_<sequence>",
  "type": "proton_mail_send",
  "params": {
    "to": "recipient@example.com",
    "subject": "Subject line",
    "body": "Full email body text."
  },
  "status": "pending",
  "created_at": "2026-10-16T12:00:00Z",
  "result": null
}
```

Keep completed tasks in the array (the desktop session marks them `done`/`error`). You can prune tasks older than 7 days.

## Supported task types

| type | params | what it does |
|---|---|---|
| `proton_mail_send` | `to`, `subject`, `body` | Opens Proton Mail on the desktop, composes and sends the email |

## Reading results

After the desktop session runs, the task object gains:
- `status`: `"done"` or `"error"`
- `result`: string description of what happened (e.g. "Sent OK" or the error message)
- `completed_at`: ISO8601 timestamp

If a task is still `"pending"` next cycle, the desktop session hasn't run yet — leave it and check again.
