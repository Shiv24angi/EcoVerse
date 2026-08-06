export const normalizeEmail = (email: string): string => {
  if (!email) return '';
  return email.trim().toLowerCase();
};
