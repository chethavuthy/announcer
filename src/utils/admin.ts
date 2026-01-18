export function isAdmin(userId: number): boolean {
  const adminIds = process.env.ADMIN_IDS?.split(',').map(id => id.trim()) || [];
  return adminIds.includes(userId.toString());
}

export function isSuperAdmin(userId: number): boolean {
  const superAdminId = process.env.SUPER_ADMIN_ID?.trim();
  if (!superAdminId) return false;
  return superAdminId === userId.toString();
}
