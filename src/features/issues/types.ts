// The legacy "Jira shape" the web dashboard/reports were built against. Supabase
// issue rows are mapped into this shape by mapIssueToJira (see api/issues.ts).
// Ported from the web app's types/jira.ts so the dashboard bucketing logic
// (categorizeUserTasks) is identical across both apps.

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  companyId?: string | null;
  departmentId?: string | null;
  groupId?: string | null;
  assignedBy?: { accountId: string; displayName: string } | null;
  fields: {
    summary: string;
    description?: { content: any[] } | string | null;
    status: {
      name: string;
      id: string;
      statusCategory: {
        name: string;
        colorName: string;
      };
    };
    priority: {
      name: string;
      id: string;
      iconUrl?: string;
    };
    issuetype: {
      name: string;
      id: string;
      iconUrl?: string;
    };
    assignee: {
      accountId: string;
      displayName: string;
      emailAddress?: string;
      active: boolean;
    } | null;
    created: string;
    updated: string;
    project?: any;
    resolutiondate?: string | null;
    duedate?: string | null;
    customfield_10020?: any; // Sprint field
    customfield_10015?: any; // Start date
    timetracking?: {
      originalEstimate?: string | null;
      originalEstimateSeconds?: number | null;
      timeSpent?: string | null;
      timeSpentSeconds?: number | null;
    } | null;
  };
}

export interface ProjectStatus {
  key: string;
  label: string;
  category: string;
}

/** Payload accepted by createIssue / updateIssue (maps onto the RPCs). */
export interface AdminTaskInput {
  title: string;
  reporterId: string;
  statusId: string; // status KEY (e.g. "todo"), not a uuid
  projectId?: string | null; // defaults to the first project
  description?: string;
  priority?: string;
  type?: string;
  companyId?: string | null;
  departmentId?: string | null;
  groupId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  estimate?: string | null; // "2w 4d 6h 45m"
  spent?: string | null; // "2w 4d 6h 45m"
}

/** An issue's current values, shaped for the edit form. */
export interface EditableIssue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: string;
  type: string;
  statusKey: string;
  assigneeId: string | null;
  companyId: string | null;
  departmentId: string | null;
  groupId: string | null;
  startDate: string | null;
  dueDate: string | null;
  estimate: string;
  spent: string;
  assignedByName: string | null;
}

export const ISSUE_PRIORITIES = ["low", "medium", "high"] as const;
export const ISSUE_TYPES = [
  "story",
  "task",
  "bug",
  "epic",
  "subtask",
] as const;
