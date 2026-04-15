/** Emails granted admin access to /admin dashboard */
export const ADMIN_EMAILS = [
  "amitkarmakar1980@gmail.com",
  "amitkarmakar.us@gmail.com",
];

export function isAdmin(email: string | undefined | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
