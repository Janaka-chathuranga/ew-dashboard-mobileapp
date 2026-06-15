// Supabase Edge Function: privileged user management for the EWIS mobile app.
//
// WHY THIS EXISTS: the mobile app ships only the publishable (anon) key and may
// never call `auth.admin.*` (Hard Rule #2). Creating/updating/deleting auth
// users requires the service-role key, which must stay server-side. This
// function holds that key in its own environment, re-checks the CALLER's role
// server-side (never trusting the client), and mirrors the web app's
// app/admin/actions.ts authorization exactly (admins + scoped department heads).
//
// Deploy:  supabase functions deploy admin-users
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected by
//  the Supabase runtime; the secret key is NEVER bundled into the app.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HEAD_ASSIGNABLE_ROLES = ["member", "team-lead", "department-lead"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Operator {
  id: string;
  role: string;
  isAdmin: boolean;
  canCreateUsers: boolean;
  headDepartments: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "UNAUTHENTICATED" }, 401);

  // Identify the caller from THEIR JWT (RLS-scoped client).
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "UNAUTHENTICATED" }, 401);

  // Privileged client (service role) — used only after the role re-check below.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- getOperator: authoritative role from the DB, not the client ----
  const { data: profile } = await admin
    .from("profiles")
    .select("role, can_create_users, department_id")
    .eq("id", user.id)
    .single();
  if (!profile) return json({ error: "FORBIDDEN" }, 403);

  const { data: heads } = await admin
    .from("department_heads")
    .select("department_id")
    .eq("user_id", user.id);

  const headDepartments = Array.from(
    new Set(
      [
        ...(heads ?? []).map((h: any) => h.department_id),
        profile.department_id,
      ].filter((id: any): id is string => !!id)
    )
  );

  const op: Operator = {
    id: user.id,
    role: profile.role,
    isAdmin: profile.role === "admin",
    canCreateUsers: profile.can_create_users ?? false,
    headDepartments,
  };

  function enforceHeadScope<T extends Record<string, any>>(
    payload: T,
    targetDepartmentId: string | null | undefined
  ): T {
    if (!op.canCreateUsers) throw new Error("FORBIDDEN");
    // Heads may NOT assign admin/head roles (no privilege escalation), but they
    // CAN set permission flags for users in their own departments.
    if (payload.roleId && !HEAD_ASSIGNABLE_ROLES.includes(payload.roleId)) {
      throw new Error("You can only assign member or lead roles.");
    }
    const dept = targetDepartmentId ?? null;
    if (!dept || !op.headDepartments.includes(dept)) {
      throw new Error("You can only manage users in your own departments.");
    }
    // Permission flags pass through unchanged — heads manage all flags except
    // role escalation, scoped to their departments.
    return payload;
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const action = body?.action as string;

  try {
    // Anyone who isn't an admin or a head with can_create_users is rejected.
    if (!op.isAdmin && !op.canCreateUsers) {
      return json({ error: "FORBIDDEN" }, 403);
    }

    if (action === "create") {
      let payload = body.payload ?? {};
      if (!op.isAdmin) payload = enforceHeadScope(payload, payload.departmentId);

      const { data, error } = await admin.auth.admin.createUser({
        email: payload.emailAddress,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          display_name: payload.displayName,
          role: payload.roleId,
        },
      });
      if (error) throw new Error(error.message);
      const userId = data.user.id;

      const { error: perr } = await admin
        .from("profiles")
        .update({
          display_name: payload.displayName,
          role: payload.roleId,
          company_id: payload.companyId || null,
          department_id: payload.departmentId || null,
          group_id: payload.groupId || null,
          designation_id: payload.designationId || null,
          can_manage_tasks: payload.canManageTasks ?? false,
          can_delete_tasks: payload.canDeleteTasks ?? false,
          can_filter_dashboard: payload.canFilterDashboard ?? false,
          can_access_console: payload.canAccessConsole ?? false,
          can_create_users: payload.canCreateUsers ?? false,
          can_create_companies: payload.canCreateCompanies ?? false,
          can_create_departments: payload.canCreateDepartments ?? false,
          can_create_groups: payload.canCreateGroups ?? false,
          can_create_designations: payload.canCreateDesignations ?? false,
          can_create_roles: payload.canCreateRoles ?? false,
          can_create_projects: payload.canCreateProjects ?? false,
        })
        .eq("id", userId);
      if (perr) throw new Error(perr.message);

      if (payload.groupId) {
        await admin
          .from("group_members")
          .upsert({ group_id: payload.groupId, user_id: userId });
      }
      return json({ accountId: userId });
    }

    if (action === "update") {
      const accountId = body.accountId as string;
      let payload = body.payload ?? {};

      if (!op.isAdmin) {
        const { data: target } = await admin
          .from("profiles")
          .select("department_id")
          .eq("id", accountId)
          .single();
        if (
          !target ||
          !target.department_id ||
          !op.headDepartments.includes(target.department_id)
        ) {
          throw new Error("You can only manage users in your own departments.");
        }
        const destDept =
          payload.departmentId !== undefined
            ? payload.departmentId
            : target.department_id;
        payload = enforceHeadScope(payload, destDept);
      }

      if (payload.emailAddress) {
        const { error } = await admin.auth.admin.updateUserById(accountId, {
          email: payload.emailAddress,
          email_confirm: true,
        });
        if (error) throw new Error(error.message);
      }

      const patch: Record<string, unknown> = {};
      const set = (k: string, v: unknown) => {
        if (v !== undefined) patch[k] = v;
      };
      set("display_name", payload.displayName);
      set("email", payload.emailAddress);
      set("role", payload.roleId);
      set("active", payload.active);
      set("company_id", payload.companyId === undefined ? undefined : payload.companyId || null);
      set("department_id", payload.departmentId === undefined ? undefined : payload.departmentId || null);
      set("group_id", payload.groupId === undefined ? undefined : payload.groupId || null);
      set("designation_id", payload.designationId === undefined ? undefined : payload.designationId || null);
      set("can_manage_tasks", payload.canManageTasks);
      set("can_delete_tasks", payload.canDeleteTasks);
      set("can_filter_dashboard", payload.canFilterDashboard);
      set("can_access_console", payload.canAccessConsole);
      set("can_create_users", payload.canCreateUsers);
      set("can_create_companies", payload.canCreateCompanies);
      set("can_create_departments", payload.canCreateDepartments);
      set("can_create_groups", payload.canCreateGroups);
      set("can_create_designations", payload.canCreateDesignations);
      set("can_create_roles", payload.canCreateRoles);
      set("can_create_projects", payload.canCreateProjects);

      const { error } = await admin
        .from("profiles")
        .update(patch)
        .eq("id", accountId);
      if (error) throw new Error(error.message);

      if (payload.groupId !== undefined) {
        await admin.from("group_members").delete().eq("user_id", accountId);
        if (payload.groupId) {
          await admin
            .from("group_members")
            .insert({ group_id: payload.groupId, user_id: accountId });
        }
      }
      return json({ accountId });
    }

    if (action === "delete") {
      const accountId = body.accountId as string;
      if (!op.isAdmin) {
        if (!op.canCreateUsers) throw new Error("FORBIDDEN");
        if (accountId === op.id) throw new Error("You cannot delete your own account.");
        const { data: target } = await admin
          .from("profiles")
          .select("role, department_id")
          .eq("id", accountId)
          .single();
        if (!target) throw new Error("User not found.");
        if (target.role === "admin") throw new Error("You cannot delete an admin.");
        if (
          !target.department_id ||
          !op.headDepartments.includes(target.department_id)
        ) {
          throw new Error("You can only manage users in your own departments.");
        }
      }
      const { error } = await admin.auth.admin.deleteUser(accountId);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Server error" }, 400);
  }
});
