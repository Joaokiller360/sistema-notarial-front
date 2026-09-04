import { NextRequest, NextResponse } from "next/server";
import { FROM_EMAIL, sendBatch } from "@/lib/resend";
import { notificationEmail } from "@/lib/email-templates";
import { requireAuth } from "@/lib/route-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { emails, notification } = await req.json() as {
      emails: string[];
      notification: {
        subject: string;
        message: string;
        type: string;
        senderName: string;
      };
    };

    if (!Array.isArray(emails) || emails.length === 0 || !notification?.subject) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const html = notificationEmail(notification);
    let totalSent = 0;

    for (let i = 0; i < emails.length; i += 100) {
      const chunk = emails.slice(i, i + 100);
      const batch = chunk.map((to) => ({
        from: FROM_EMAIL,
        to,
        subject: `🔔 ${notification.type}: ${notification.subject}`,
        html,
      }));
      totalSent += await sendBatch(batch);
    }

    return NextResponse.json({ sent: totalSent, total: emails.length });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
