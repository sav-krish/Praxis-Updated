/** Typical Supabase confirmation email delay users report (minutes). */
export const EMAIL_VERIFICATION_WAIT_MINUTES = 5;

export function isLikelyUnverifiedLoginError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid login credentials") ||
    lower.includes("email not confirmed") ||
    lower.includes("email not verified") ||
    lower.includes("user not confirmed")
  );
}

export function verificationWaitMessage(minutes = EMAIL_VERIFICATION_WAIT_MINUTES): string {
  return `Please wait up to ${minutes} minutes for your verification email to arrive, click the link in that email, then sign in.`;
}

export function authRedirectUrl(path: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}
