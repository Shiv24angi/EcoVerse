export const normalizeEmail = (email?: string | null): string => {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};
