import { NextRequest, NextResponse } from "next/server";
import { FROM_EMAIL, sendBatch } from "@/lib/resend";
import { newsEmail } from "@/lib/email-templates";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { news, emails } = await req.json() as {
      news: { id: string; title: string; description: string };
      emails: string[];
    };

    if (!news?.id || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Missing fields", news, emailCount: emails?.length }, { status: 400 });
    }

    const html = newsEmail(news);
    let totalSent = 0;

    for (let i = 0; i < emails.length; i += 100) {
      const chunk = emails.slice(i, i + 100);
      const batch = chunk.map((to) => ({
        from: FROM_EMAIL,
        to,
        subject: `📰 Nueva Noticia: ${news.title}`,
        html,
      }));
      totalSent += await sendBatch(batch);
    }

    return NextResponse.json({ sent: totalSent, total: emails.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
