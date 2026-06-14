import { useSession } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface OrgUnit {
  id: string;
  name: string;
}

export async function fetchCompanies(): Promise<OrgUnit[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as OrgUnit[];
}

export async function fetchDepartments(companyId?: string): Promise<OrgUnit[]> {
  let q = supabase.from("departments").select("id, name").order("name");
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as OrgUnit[];
}

export async function fetchGroups(departmentId?: string): Promise<OrgUnit[]> {
  let q = supabase.from("groups").select("id, name").order("name");
  if (departmentId) q = q.eq("department_id", departmentId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as OrgUnit[];
}

export function useCompanies() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartments(companyId?: string) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["departments", companyId ?? "all"],
    queryFn: () => fetchDepartments(companyId),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGroups(departmentId?: string) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["groups", departmentId ?? "all"],
    queryFn: () => fetchGroups(departmentId),
    enabled: isAuthenticated && !!departmentId,
    staleTime: 5 * 60 * 1000,
  });
}

export async function fetchDesignations(): Promise<OrgUnit[]> {
  const { data, error } = await supabase
    .from("designations")
    .select("id, name")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as OrgUnit[];
}

export function useDesignations() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["designations"],
    queryFn: fetchDesignations,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
