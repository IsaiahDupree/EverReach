export function isAdmin(userId?: string | null): boolean {
  if (!userId) return false;
  const csv = process.env.ADMIN_USER_IDS || '';
  const ids = csv.split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}
