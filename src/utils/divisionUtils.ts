/**
 * Simple utility to check if a user has divisions for product transfers
 */
export function userHasDivisions(user: any): boolean {
  return (
    user?.divisions &&
    Array.isArray(user.divisions) &&
    user.divisions.length > 0
  );
}

/**
 * Checks if a transfer would be a self-transfer
 */
export function isSelfTransfer(fromUserId: string, toUserId: string): boolean {
  return fromUserId === toUserId;
}

/**
 * Gets the division name by ID from user's divisions
 */
export function getDivisionNameById(
  user: any,
  divisionId: string
): string | null {
  if (!user?.divisions) return null;
  const division = user.divisions.find((d: any) => d.id === divisionId);
  return division?.name || null;
}
