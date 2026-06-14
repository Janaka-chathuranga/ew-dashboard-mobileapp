import { useSession } from "@/context/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBoard, fetchBoardAll, moveIssueToStatus } from "../api/board";

export const ALL_PROJECTS = "all" as const;

/** Board for a single project, or the aggregated all-projects board. */
export function useBoard(projectId: string) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["board", projectId],
    queryFn: () =>
      projectId === ALL_PROJECTS ? fetchBoardAll() : fetchBoard(projectId),
    enabled: isAuthenticated && !!projectId,
    staleTime: 30 * 1000,
  });
}

/** Move an issue to a new status (column), then refresh boards + lists. */
export function useMoveIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      issueId,
      statusKey,
    }: {
      issueId: string;
      statusKey: string;
    }) => moveIssueToStatus(issueId, statusKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["issue"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
    },
  });
}
