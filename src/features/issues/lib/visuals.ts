import { Ionicons } from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Tailwind classes for a priority pill (low/medium/high). */
export function priorityPill(priority: string): { bg: string; text: string } {
  switch (priority) {
    case "high":
      return { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300" };
    case "medium":
      return {
        bg: "bg-amber-100 dark:bg-amber-900/40",
        text: "text-amber-700 dark:text-amber-300",
      };
    default:
      return {
        bg: "bg-slate-100 dark:bg-slate-700",
        text: "text-slate-600 dark:text-slate-300",
      };
  }
}

/** Tailwind classes for a status pill, keyed on the Jira statusCategory name. */
export function statusPill(categoryName: string): { bg: string; text: string } {
  switch (categoryName) {
    case "Done":
      return {
        bg: "bg-green-100 dark:bg-green-900/40",
        text: "text-green-700 dark:text-green-300",
      };
    case "In Progress":
      return {
        bg: "bg-yellow-100 dark:bg-yellow-900/40",
        text: "text-yellow-700 dark:text-yellow-300",
      };
    default:
      return {
        bg: "bg-blue-100 dark:bg-blue-900/40",
        text: "text-blue-700 dark:text-blue-300",
      };
  }
}

/** Icon + color for an issue type. */
export function typeVisual(type: string): { icon: IoniconName; color: string } {
  switch (type) {
    case "bug":
      return { icon: "bug", color: "#ef4444" };
    case "story":
      return { icon: "bookmark", color: "#22c55e" };
    case "epic":
      return { icon: "flash", color: "#a855f7" };
    case "subtask":
      return { icon: "git-branch", color: "#3b82f6" };
    default:
      return { icon: "checkbox-outline", color: "#3b82f6" };
  }
}
