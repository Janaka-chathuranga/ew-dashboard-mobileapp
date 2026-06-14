import { useSession } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAllIssues,
  fetchIssueDetail,
  fetchUserTasks,
} from "../api/issues";

/** All issues the signed-in user can see (RLS-scoped). */
export function useAllIssues() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["issues"],
    queryFn: fetchAllIssues,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

/** A single issue by UUID id. */
export function useIssue(issueId: string | undefined) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => fetchIssueDetail(issueId as string),
    enabled: isAuthenticated && !!issueId,
    staleTime: 60 * 1000,
  });
}

/** Tasks assigned to a user for a date window (defaults to current month). */
export function useUserTasks(
  userId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["user-tasks", userId, startDate, endDate],
    queryFn: () => fetchUserTasks(userId as string, startDate, endDate),
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000,
  });
}
