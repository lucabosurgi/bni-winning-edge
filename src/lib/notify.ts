/**
 * Email notifications to Luca via Brevo transactional email.
 * Silently does nothing if BREVO_API_KEY is not configured, so the
 * calling flow (saving the lead) never breaks because of email.
 */
const NOTIFY_TO = "luca@mindfitnesslab.com";
const NOTIFY_FROM = { name: "Winning Edge Partners", email: "luca@mindfitnesslab.com" };

export async function notifyLuca(subject: string, text: string): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: NOTIFY_FROM,
        to: [{ email: NOTIFY_TO, name: "Luca Bosurgi" }],
        subject,
        textContent: text,
      }),
    });
    if (!res.ok) {
      console.error("[notify] Brevo responded", res.status, await res.text());
    }
  } catch (e) {
    console.error("[notify] failed:", e);
  }
}
