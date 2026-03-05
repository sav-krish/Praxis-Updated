/**
 * Optional Resend integration. Enable with USE_RESEND=true and RESEND_API_KEY.
 * Resend can be wired in later when needed.
 */
export async function sendViaResend(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Praxis <onboarding@resend.dev>",
        to: [to],
        subject,
        html: body.replace(/\n/g, "<br>"),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err || res.statusText };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
