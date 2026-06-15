import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createIssue, deleteIssue, updateIssue } from "../api/issues";
import type { AdminTaskInput } from "../types";

/** Invalidate every cache that reflects issue data. */
function useInvalidateIssues() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["issues"] });
    queryClient.invalidateQueries({ queryKey: ["issue"] });
    queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["board"] });
  };
}

export function useCreateIssue() {
  const invalidate = useInvalidateIssues();
  return useMutation({
    mutationFn: (input: AdminTaskInput) => createIssue(input),
    onSuccess: invalidate,
  });
}

export function useUpdateIssue(issueId: string) {
  const invalidate = useInvalidateIssues();
  // Update filters on the UUID id (never the human key) — see api/issues.ts.
  return useMutation({
    mutationFn: (input: Partial<AdminTaskInput>) => updateIssue(issueId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteIssue() {
  const invalidate = useInvalidateIssues();
  return useMutation({
    mutationFn: (issueId: string) => deleteIssue(issueId),
    onSuccess: invalidate,
  });
}
