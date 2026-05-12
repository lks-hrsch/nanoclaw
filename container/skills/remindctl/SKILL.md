# Apple Reminders (remindctl)

You have access to Apple Reminders via MCP tools. Use them to manage the user's reminders and lists.

## When to use

✅ Use when the user mentions "reminder", "Apple Reminders", or wants a task to sync to their iPhone/iPad.

❌ Don't use for:
- Scheduling NanoClaw alerts or notifications → use `schedule_task`
- Calendar events or appointments → those belong in Apple Calendar
- One-time in-chat alerts → use `schedule_task` with a system event

When unclear ("remind me to…"), ask: "Apple Reminders (syncs to your phone) or an in-chat alert?"

## Tools

### `reminders_show`
List reminders. Optional `filter`: `today`, `tomorrow`, `week`, `overdue`, `upcoming`, `open`, `completed`, `all`, or a date like `2026-05-20`. Optional `list` to filter by list name.

### `reminders_add`
Add a reminder. Required: `title`. Optional: `list`, `due` (e.g. `"tomorrow"`, `"2026-05-20 09:00"`), `notes`, `priority` (`none`/`low`/`medium`/`high`), `repeat` (`daily`/`weekly`/etc.).

### `reminders_edit`
Edit a reminder by its ID or index (from `reminders_show`). Any field is optional.

### `reminders_complete`
Complete reminders. Pass an array of `ids` (indexes or ID prefixes from `reminders_show`).

### `reminders_delete`
Delete a reminder by ID or index.

### `reminders_lists`
List all reminder lists.

## IDs

IDs come from `reminders_show` output. You can use the short numeric index (e.g. `1`) or the hex ID prefix (e.g. `4A83`). Always fetch current reminders before completing or deleting to get fresh IDs.
