import { useSession } from "@/context/auth-context";
import { fetchUserTasks } from "@/features/issues";
import { useQuery } from "@tanstack/react-query";
import { categorizeUserTasks } from "../lib/task-utils";

/**
 * The signed-in user's tasks for the current month, with the same per-user
 * buckets the web dashboard shows (categorizeUserTasks). RLS scopes the rows.
 */
export function useMyDashboard() {
  const { user, isAuthenticated } = useSession();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["user-tasks", userId],
    queryFn: () => fetchUserTasks(userId as string),
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000,
  });

  const stats = query.data ? categorizeUserTasks(query.data) : null;

  return { ...query, stats };
}
