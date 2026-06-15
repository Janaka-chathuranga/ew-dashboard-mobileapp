import { useSession } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface DirectoryUser {
  id: string;
  displayName: string;
  email: string;
  companyName: string | null;
  departmentName: string | null;
  groupName: string | null;
  designationName: string | null;
}

/**
 * Active users for assignee pickers, with their org context (company,
 * department, group, designation) so the picker can search by designation and
 * show the assignee's org details. RLS: profiles are a readable directory.
 */
export async function fetchUsers(): Promise<DirectoryUser[]> {
  // Explicit FK hints: profiles↔groups has two relationships (group_id and
  // groups.lead_user_id), so the embed must disambiguate or the query errors.
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `id, display_name, email,
       company:companies!profiles_company_id_fkey ( name ),
       department:departments!profiles_department_id_fkey ( name ),
       group:groups!profiles_group_id_fkey ( name ),
       designation:designations!profiles_designation_id_fkey ( name )`
    )
    .eq("active", true)
    .order("display_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p: any) => ({
    id: p.id,
    displayName: p.display_name,
    email: p.email,
    companyName: p.company?.name ?? null,
    departmentName: p.department?.name ?? null,
    groupName: p.group?.name ?? null,
    designationName: p.designation?.name ?? null,
  }));
}

export function useUsers() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
