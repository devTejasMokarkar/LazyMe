import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export interface SendEmailRequest {
  to: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  coverLetter: string;
  resumeData?: any;
  attachments?: Array<{ filename: string; content: string }>;
}

// Rate limiting: Max 10 emails per hour per IP
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_EMAILS_PER_HOUR = 10;
const HOUR_IN_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + HOUR_IN_MS });
    return true;
  }
  
  if (record.count >= MAX_EMAILS_PER_HOUR) {
    return false;
  }
  
  record.count++;
  return true;
}

function createEmailBody(coverLetter: string, fromName: string): string {
  return `
${coverLetter}

---
This email was sent via LazyMe AI - AI Job Application Engine
https://lazyme.ai
`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    
    // Rate limit check
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 10 emails per hour." },
        { status: 429 }
      );
    }

    const body: SendEmailRequest = await req.json();
    const { to, fromEmail, fromName, subject, coverLetter, resumeData, attachments } = body;

    // Validation
    if (!to || !fromEmail || !fromName || !subject || !coverLetter) {
      return NextResponse.json(
        { error: "Missing required fields: to, fromEmail, fromName, subject, coverLetter" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to) || !emailRegex.test(fromEmail)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    // Check if email service is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      // Return preview mode if SMTP not configured
      return NextResponse.json({
        success: false,
        mode: "preview",
        message: "Email service not configured. Here's your email preview:",
        preview: {
          to,
          from: `${fromName} <${fromEmail}>`,
          subject,
          body: createEmailBody(coverLetter, fromName),
        },
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Prepare email
    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      text: createEmailBody(coverLetter, fromName),
      attachments: attachments || [],
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      to,
      subject,
    });
  } catch (error: any) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: "Failed to send email: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
