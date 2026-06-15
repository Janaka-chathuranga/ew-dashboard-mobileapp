import { useSession } from "@/context/auth-context";
import { fetchAdminUsers } from "@/features/admin";
import { fetchUserTasks } from "@/features/issues";
import { useMyScopeDepartments } from "@/features/org";
import { useQuery } from "@tanstack/react-query";
import { categorizeUserTasks, type CategorizedTasks } from "../lib/task-utils";

export interface TeamMemberCard {
  userId: string;
  displayName: string;
  email: string;
  active: boolean;
  cats: CategorizedTasks;
}

/**
 * The all-users dashboard, mirroring the web home page: one card per user with
 * their current-month task buckets. Scope:
 *   - admin                → every active user
 *   - head / department-lead → users in the departments they oversee
 *   - everyone else        → just themselves
 * RLS still governs which tasks each card can actually read.
 */
export function useTeamDashboard() {
  const { user, isAuthenticated } = useSession();
  const isAdmin = user?.role === "admin";
  const isHeadLike =
    isAdmin || user?.role === "head" || user?.role === "department-lead";
  const { data: scopeDepts = [] } = useMyScopeDepartments();

  return useQuery({
    queryKey: ["team-dashboard", user?.id, isHeadLike, scopeDepts.join(",")],
    enabled: isAuthenticated && !!user,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TeamMemberCard[]> => {
      let people: {
        id: string;
        displayName: string;
        email: string;
        active: boolean;
      }[];

      if (isHeadLike) {
        const all = await fetchAdminUsers();
        const scoped = isAdmin
          ? all
          : all.filter(
              (u) => u.departmentId && scopeDepts.includes(u.departmentId)
            );
        people = scoped
          .filter((u) => u.active)
          .map((u) => ({
            id: u.accountId,
            displayName: u.displayName,
            email: u.emailAddress,
            active: u.active,
          }));
      } else {
        people = [
          {
            id: user!.id,
            displayName: user!.displayName,
            email: user!.email,
            active: true,
          },
        ];
      }

      return Promise.all(
        people.map(async (p) => {
          let cats: CategorizedTasks;
          try {
            cats = categorizeUserTasks(await fetchUserTasks(p.id));
          } catch {
            cats = categorizeUserTasks([]);
          }
          return {
            userId: p.id,
            displayName: p.displayName,
            email: p.email,
            active: p.active,
            cats,
          };
        })
      );
    },
  });
}
