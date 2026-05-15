import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json() as { to: string };
    if (!to) return NextResponse.json({ error: "Missing to" }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
    }

    // Call Resend REST API directly — bypass SDK to isolate issues
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from ?? "onboarding@resend.dev",
        to,
        subject: "Test - Sistema Notarial",
        html: "<p>Test de Resend funcionando.</p>",
      }),
    });

    const body = await response.json();

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      body,
      key_prefix: apiKey.slice(0, 10) + "...",
      from: from ?? "onboarding@resend.dev",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
