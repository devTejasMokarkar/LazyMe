import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export interface BulkRecipient {
  email: string;
  name?: string;
  company?: string;
}

export interface BulkSendRequest {
  recipients: BulkRecipient[];
  fromEmail: string;
  fromName: string;
  subjectTemplate: string;
  bodyTemplate: string;
  resumeId?: string;
  throttleMs?: number;
  attachment?: { filename: string; content: string; contentType?: string };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 200;
const DEFAULT_THROTTLE_MS = 1000;

function renderTemplate(tpl: string, r: BulkRecipient): string {
  const name = (r.name || "Hiring Manager").trim();
  const company = (r.company || "your company").trim();
  return tpl
    .replace(/\{name\}/gi, name)
    .replace(/\{company\}/gi, company)
    .replace(/\{email\}/gi, r.email);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function buildBody(coverLetter: string): string {
  return `${coverLetter}\n\n---\nSent via LazyMe AI — https://lazyme.ai\n`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: BulkSendRequest;
  try {
    body = (await req.json()) as BulkSendRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    recipients,
    fromEmail,
    fromName,
    subjectTemplate,
    bodyTemplate,
    resumeId,
    throttleMs = DEFAULT_THROTTLE_MS,
    attachment,
  } = body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return new Response(JSON.stringify({ error: "No recipients provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (recipients.length > MAX_RECIPIENTS) {
    return new Response(
      JSON.stringify({ error: `Max ${MAX_RECIPIENTS} recipients per batch` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!fromEmail || !fromName || !subjectTemplate || !bodyTemplate) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: fromEmail, fromName, subjectTemplate, bodyTemplate",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!EMAIL_REGEX.test(fromEmail)) {
    return new Response(JSON.stringify({ error: "Invalid sender email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cleanRecipients: BulkRecipient[] = recipients
    .map((r) => ({
      email: (r.email || "").trim().toLowerCase(),
      name: r.name?.trim() || "",
      company: r.company?.trim() || "",
    }))
    .filter((r) => EMAIL_REGEX.test(r.email));

  if (cleanRecipients.length === 0) {
    return new Response(JSON.stringify({ error: "No valid email addresses" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const attachments: Array<{ filename: string; content: string | Buffer; contentType?: string }> = [];

  if (resumeId) {
    try {
      const resume = await prisma.userResume.findFirst({
        where: { id: resumeId, userId: session.user.id },
      });
      if (resume?.rawText) {
        const safeName = (resume.name || "Resume").replace(/[^\w\-\s]/g, "_").trim() || "Resume";
        attachments.push({
          filename: `${safeName}.txt`,
          content: resume.rawText,
          contentType: "text/plain; charset=utf-8",
        });
      }
    } catch (e: any) {
      logger.warn({ err: e?.message }, "bulk-email: failed to load resume");
    }
  }

  if (attachment?.filename && attachment?.content) {
    try {
      attachments.push({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, "base64"),
        contentType: attachment.contentType,
      });
    } catch {
      // ignore malformed attachment
    }
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpConfigured = Boolean(smtpHost && smtpPort && smtpUser && smtpPass);

  let transporter: nodemailer.Transporter | null = null;
  if (smtpConfigured) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort!),
      secure: parseInt(smtpPort!) === 465,
      auth: { user: smtpUser!, pass: smtpPass! },
    });
  }

  const encoder = new TextEncoder();
  const throttle = Math.max(0, Math.min(10000, Number(throttleMs) || DEFAULT_THROTTLE_MS));

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      send({
        type: "start",
        total: cleanRecipients.length,
        mode: smtpConfigured ? "send" : "preview",
        throttleMs: throttle,
      });

      let successful = 0;
      let failed = 0;
      const failures: Array<{ email: string; error: string }> = [];

      for (let i = 0; i < cleanRecipients.length; i++) {
        const r = cleanRecipients[i];
        const subject = renderTemplate(subjectTemplate, r);
        const text = buildBody(renderTemplate(bodyTemplate, r));

        try {
          if (!smtpConfigured || !transporter) {
            send({
              type: "progress",
              index: i,
              email: r.email,
              status: "preview",
              subject,
            });
          } else {
            await transporter.sendMail({
              from: `${fromName} <${fromEmail}>`,
              to: r.email,
              subject,
              text,
              attachments,
            });
            successful++;
            send({
              type: "progress",
              index: i,
              email: r.email,
              status: "sent",
              subject,
            });
          }
        } catch (e: any) {
          failed++;
          const errMsg = e?.message || "Unknown error";
          failures.push({ email: r.email, error: errMsg });
          send({
            type: "progress",
            index: i,
            email: r.email,
            status: "failed",
            error: errMsg,
          });
        }

        if (i < cleanRecipients.length - 1 && throttle > 0) {
          await sleep(throttle);
        }
      }

      send({
        type: "done",
        total: cleanRecipients.length,
        successful,
        failed,
        failures,
        mode: smtpConfigured ? "send" : "preview",
      });
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
