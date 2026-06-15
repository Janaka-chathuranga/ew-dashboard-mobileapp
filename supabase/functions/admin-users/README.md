# `admin-users` Edge Function

Privileged user management for the EWIS mobile app. The app ships only the
publishable (anon) key and **must never call `auth.admin.*`** (Hard Rule #2).
Creating / updating / deleting auth users needs the service-role key, which lives
**only** in this function's environment — never in the bundle.

The function re-checks the caller's role **server-side** (it never trusts the
client) and mirrors the web app's `app/admin/actions.ts` authorization exactly:

- **Admins** may create/update/delete any user and set any role + permission flag.
- **Department heads** with `can_create_users` may manage only non-admin users in
  their own departments, may assign only `member` / `team-lead` / `department-lead`,
  and can **never** grant elevated permission flags.
- Everyone else is rejected with `FORBIDDEN`.

## Deploy (run by the project owner with the Supabase CLI)

```bash
# from this repo root, against the SAME Supabase project the web app uses
npx supabase login                      # or set SUPABASE_ACCESS_TOKEN
npx supabase link --project-ref izmiyhvfihkbwnfnhpuw
npx supabase functions deploy admin-users
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically by the Supabase runtime — you do **not** set them manually, and the
secret key never leaves the server.

## Request shape

`POST /functions/v1/admin-users` with the caller's session JWT in the
`Authorization` header (the mobile client sends this automatically via
`supabase.functions.invoke`).

```jsonc
// create
{ "action": "create", "payload": { "displayName": "...", "emailAddress": "...",
  "password": "...", "roleId": "member", "companyId": null, "departmentId": null,
  "groupId": null, "canManageTasks": false /* admin-only flags */ } }

// update
{ "action": "update", "accountId": "<uuid>", "payload": { "active": false } }

// delete
{ "action": "delete", "accountId": "<uuid>" }
```

## Verify after deploy

1. Sign in on the app as an admin → Profile → **Admin Console** → **New** → create
   a user. Confirm it appears in the list.
2. Sign in as a non-admin **without** `can_access_console` → the Admin Console
   entry is hidden and `/admin` redirects away (client gate); even if the endpoint
   is called directly it returns `FORBIDDEN` (server gate).
3. As a department head with `can_create_users`, confirm you can only manage
   users in your own department and cannot assign admin/elevated flags.
