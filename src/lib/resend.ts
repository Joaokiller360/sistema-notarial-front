export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ id?: string; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json() as { id?: string; message?: string; name?: string };
  if (!res.ok) return { error: body.message ?? body.name ?? "Resend error" };
  return { id: body.id };
}

export async function sendBatch(payloads: EmailPayload[]): Promise<number> {
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payloads),
  });
  const body = await res.json() as { data?: { id: string }[] };
  return body.data?.length ?? 0;
}
