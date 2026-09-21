export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "afiq980@gmail.com")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null) {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
