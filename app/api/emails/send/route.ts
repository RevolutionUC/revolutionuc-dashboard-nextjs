import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getTemplateById,
  renderTemplateToHtml,
  renderTemplateToText,
} from "@/lib/templates";

interface SendEmailRequest {
  templateId: string;
  subject?: string;
  body?: string;
  recipients: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId, subject, body, recipients }: SendEmailRequest =
      await request.json();

    // Validate request
    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 },
      );
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient is required" },
        { status: 400 },
      );
    }

    // Verify template exists
    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalidEmails.join(", ")}` },
        { status: 400 },
      );
    }

    const emailSubject = subject || template.subject;

    // Process each recipient
    for (const recipient of recipients) {
      const recipientName = extractNameFromEmail(recipient);

      // Render the template
      const html = await renderTemplateToHtml(templateId, {
        name: recipientName,
        subject: emailSubject,
        body,
      });

      const text = await renderTemplateToText(templateId, {
        name: recipientName,
        subject: emailSubject,
        body,
      });

      if (!html || !text) {
        console.error(`Failed to render template for ${recipient}`);
        continue;
      }

      // =========================================================
      // TODO: INTEGRATE YOUR EMAIL SERVICE HERE
      // =========================================================
      //
      // This is where you send the actual email. Choose one of the
      // following options and implement accordingly:
      //
      // ---------------------------------------------------------
      // OPTION 1: Resend (recommended for react-email)
      // ---------------------------------------------------------
      // npm install resend
      //
      // import { Resend } from 'resend';
      // const resend = new Resend(process.env.RESEND_API_KEY);
      //
      // await resend.emails.send({
      //   from: 'RevolutionUC <noreply@revolutionuc.com>',
      //   to: recipient,
      //   subject: emailSubject,
      //   html: html,
      //   text: text,
      // });
      //
      // ---------------------------------------------------------
      // OPTION 2: SendGrid
      // ---------------------------------------------------------
      // npm install @sendgrid/mail
      //
      // import sgMail from '@sendgrid/mail';
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      //
      // await sgMail.send({
      //   from: 'noreply@revolutionuc.com',
      //   to: recipient,
      //   subject: emailSubject,
      //   html: html,
      //   text: text,
      // });
      //
      // ---------------------------------------------------------
      // OPTION 3: AWS SES
      // ---------------------------------------------------------
      // npm install @aws-sdk/client-ses
      //
      // import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
      // const ses = new SESClient({ region: 'us-east-1' });
      //
      // await ses.send(new SendEmailCommand({
      //   Source: 'noreply@revolutionuc.com',
      //   Destination: { ToAddresses: [recipient] },
      //   Message: {
      //     Subject: { Data: emailSubject },
      //     Body: {
      //       Html: { Data: html },
      //       Text: { Data: text },
      //     },
      //   },
      // }));
      //
      // ---------------------------------------------------------
      // OPTION 4: Nodemailer (SMTP)
      // ---------------------------------------------------------
      // npm install nodemailer
      //
      // import nodemailer from 'nodemailer';
      // const transporter = nodemailer.createTransport({
      //   host: process.env.SMTP_HOST,
      //   port: 587,
      //   auth: {
      //     user: process.env.SMTP_USER,
      //     pass: process.env.SMTP_PASS,
      //   },
      // });
      //
      // await transporter.sendMail({
      //   from: 'noreply@revolutionuc.com',
      //   to: recipient,
      //   subject: emailSubject,
      //   html: html,
      //   text: text,
      // });
      //
      // =========================================================

      // For now, just log the email (remove this when integrating)
      console.log("Email prepared:", {
        to: recipient,
        subject: emailSubject,
        htmlLength: html.length,
        textLength: text.length,
      });
    }

    console.log("Email batch completed:", {
      templateId,
      recipientCount: recipients.length,
      sentBy: session.user.email,
    });

    return NextResponse.json({
      success: true,
      message: `Emails queued for ${recipients.length} recipient(s)`,
    });
  } catch (error) {
    console.error("Error sending emails:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Extract name from email address
function extractNameFromEmail(email: string): string {
  const localPart = email.split("@")[0];
  const parts = localPart.split(/[._-]/);

  if (parts.length >= 2) {
    return parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  }

  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}
