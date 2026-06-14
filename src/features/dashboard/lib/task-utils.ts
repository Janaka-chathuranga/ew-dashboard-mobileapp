import type { JiraIssue } from "@/features/issues";

// Per-user task bucketing, ported verbatim from the web dashboard
// (lib/task-utils.ts) so the mobile metrics match exactly.

export function isToday(date: string | Date): boolean {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
}

export function isCurrentMonth(date: string | Date): boolean {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
}

export function isCurrentMonthNotToday(date: string | Date): boolean {
  return isCurrentMonth(date) && !isToday(date);
}

export function isInActiveSprint(task: JiraIssue): boolean {
  const sprintField = (task.fields as any).customfield_10020;
  if (!sprintField) return false;
  const sprints = Array.isArray(sprintField) ? sprintField : [sprintField];
  return sprints.some((sprint: any) => {
    if (!sprint) return false;
    if (typeof sprint === "string") {
      return sprint.toLowerCase().includes("active");
    }
    if (typeof sprint === "object" && sprint.state) {
      return sprint.state.toLowerCase() === "active";
    }
    return false;
  });
}

export function isTaskInDateRange(task: JiraIssue): boolean {
  if (!task.fields.customfield_10015 || !(task.fields as any).duedate) {
    return false;
  }
  const today = new Date();
  const startDate = new Date(task.fields.customfield_10015);
  const dueDate = new Date((task.fields as any).duedate);
  const isSameDayAsStart = isToday(startDate);
  const isSameDayAsDue = isToday(dueDate);
  const isTodayInRange = today >= startDate && today <= dueDate;
  return isSameDayAsStart || isSameDayAsDue || isTodayInRange;
}

export function wasCompletedToday(task: JiraIssue): boolean {
  const isDone =
    task.fields.status.statusCategory.name === "Done" ||
    task.fields.status.name.toLowerCase().includes("done") ||
    task.fields.status.name.toLowerCase().includes("closed") ||
    task.fields.status.name.toLowerCase().includes("resolved");
  if (!isDone) return false;
  if (task.fields.resolutiondate) {
    return isToday(task.fields.resolutiondate);
  }
  return isToday(task.fields.updated);
}

export function categorizeUserTasks(tasks: JiraIssue[]) {
  return {
    dailyTasks: tasks.filter((task) => {
      const isInDateRange = isTaskInDateRange(task);
      const isActiveSprint = isInActiveSprint(task);
      const isTodoStatus =
        task.fields.status.statusCategory.name === "To Do" ||
        task.fields.status.name.toLowerCase().includes("to do") ||
        task.fields.status.name.toLowerCase().includes("open") ||
        task.fields.status.name.toLowerCase().includes("backlog");
      return isInDateRange && isActiveSprint && isTodoStatus;
    }),

    inProgressTasks: tasks.filter((task) => {
      const isInDateRange = isTaskInDateRange(task);
      const isActiveSprint = isInActiveSprint(task);
      const isInProgress =
        task.fields.status.statusCategory.name === "In Progress" ||
        task.fields.status.name.toLowerCase().includes("progress") ||
        task.fields.status.name.toLowerCase().includes("development") ||
        task.fields.status.name.toLowerCase().includes("review");
      return isInDateRange && isActiveSprint && isInProgress;
    }),

    dailyCompleted: tasks.filter((task) => wasCompletedToday(task)),

    pendingBacklog: tasks.filter((task) => {
      const hasStartDate = task.fields.customfield_10015;
      const hasDueDate = (task.fields as any).duedate;
      const isActiveSprint = isInActiveSprint(task);
      if (!hasStartDate || !hasDueDate) return false;

      const startDate = new Date(task.fields.customfield_10015);
      const dueDate = new Date((task.fields as any).duedate);
      const isStartDateToday = isToday(startDate);
      const isDueDateToday = isToday(dueDate);
      const isStartDateBeforeToday = startDate < new Date() && !isStartDateToday;
      const isDueDateExceeded = dueDate < new Date() && !isDueDateToday;

      const isBacklogStatus =
        task.fields.status.statusCategory.name === "To Do" ||
        task.fields.status.name.toLowerCase().includes("to do") ||
        task.fields.status.name.toLowerCase().includes("open") ||
        task.fields.status.name.toLowerCase().includes("progress") ||
        task.fields.status.name.toLowerCase().includes("backlog");

      return (
        isActiveSprint &&
        isStartDateBeforeToday &&
        isDueDateExceeded &&
        isBacklogStatus &&
        hasStartDate &&
        hasDueDate
      );
    }),

    monthlyAssigned: tasks.filter((task) => {
      const hasStartDate = task.fields.customfield_10015;
      const hasDueDate = (task.fields as any).duedate;
      if (!hasStartDate || !hasDueDate) return false;
      return isCurrentMonth(task.fields.customfield_10015);
    }),

    monthlyCompleted: tasks.filter((task) => {
      const isDone =
        task.fields.status.statusCategory.name === "Done" ||
        task.fields.status.name.toLowerCase().includes("done") ||
        task.fields.status.name.toLowerCase().includes("closed") ||
        task.fields.status.name.toLowerCase().includes("resolved");
      if (!isDone) return false;
      if (task.fields.resolutiondate) {
        return isCurrentMonth(task.fields.resolutiondate);
      }
      return isCurrentMonth(task.fields.updated);
    }),

    allTasks: tasks.filter((task) => {
      const hasStartDate = task.fields.customfield_10015;
      const hasDueDate = (task.fields as any).duedate;
      if (!hasStartDate || !hasDueDate) return false;
      return isCurrentMonth(task.fields.customfield_10015);
    }),

    activeSprintTodayTasks: tasks.filter((task) => {
      const isActiveSprint = isInActiveSprint(task);
      const isInDateRange = isTaskInDateRange(task);
      if (task.fields.resolutiondate) {
        return (
          isActiveSprint && isInDateRange && isToday(task.fields.resolutiondate)
        );
      }
      return isActiveSprint && isInDateRange;
    }),

    monthlySpentHours:
      tasks
        .filter((task) => {
          const isDone =
            task.fields.status.statusCategory.name === "Done" ||
            task.fields.status.name.toLowerCase().includes("done") ||
            task.fields.status.name.toLowerCase().includes("closed") ||
            task.fields.status.name.toLowerCase().includes("resolved");
          if (!isDone) return false;
          if (task.fields.resolutiondate) {
            return isCurrentMonth(task.fields.resolutiondate);
          }
          return isCurrentMonth(task.fields.updated);
        })
        .reduce((totalSeconds, task) => {
          const timeSpent = task.fields.timetracking?.timeSpentSeconds ?? 0;
          return totalSeconds + timeSpent;
        }, 0) / 3600,

    dailySpentHours:
      tasks
        .filter((task) => {
          const isInDateRange = isTaskInDateRange(task);
          const isActiveSprint = isInActiveSprint(task);
          return isInDateRange && isActiveSprint;
        })
        .reduce((totalSeconds, task) => {
          const timeSpent = task.fields.timetracking?.timeSpentSeconds ?? 0;
          return totalSeconds + timeSpent;
        }, 0) / 3600,

    monthlyEstimatedHours:
      tasks
        .filter((task) => {
          const hasStartDate = task.fields.customfield_10015;
          const hasDueDate = (task.fields as any).duedate;
          if (!hasStartDate || !hasDueDate) return false;
          return isCurrentMonth(task.fields.customfield_10015);
        })
        .reduce((totalSeconds, task) => {
          const originalEstimate =
            task.fields.timetracking?.originalEstimateSeconds ?? 0;
          return totalSeconds + originalEstimate;
        }, 0) / 3600,
  };
}

export type CategorizedTasks = ReturnType<typeof categorizeUserTasks>;
