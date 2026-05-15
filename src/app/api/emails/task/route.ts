import { NextRequest, NextResponse } from "next/server";
import { FROM_EMAIL, sendEmail } from "@/lib/resend";
import { taskEmail } from "@/lib/email-templates";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, task } = await req.json() as {
      email: string;
      task: {
        title: string;
        description: string;
        priority: string;
        dueDate: string;
        senderName: string;
      };
    };

    if (!email || !task?.title) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const result = await sendEmail({
      from: FROM_EMAIL,
      to: email,
      subject: `📋 Nueva tarea asignada: ${task.title}`,
      html: taskEmail(task),
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
