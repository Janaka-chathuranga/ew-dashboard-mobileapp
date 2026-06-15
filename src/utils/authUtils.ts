export enum RoleType {
  ADMIN = "ROLE_ADMIN",
  USER = "ROLE_USER",
}

export const hasUserRole = (
  roles: any[] | undefined,
  requiredRole: RoleType.ADMIN | RoleType.USER
): boolean => {
  const roleArr = roles?.map((role) => role.name) || [];
  console.log("Checking roles:", roles, "for required role:", requiredRole);
  if (!roleArr) return false;
  return roleArr.includes(requiredRole);
};
