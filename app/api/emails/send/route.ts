import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
    getTemplateById,
    renderTemplateToHtml,
    renderTemplateToText,
} from "@/lib/templates";
import formData from "form-data";
import Mailgun from "mailgun.js";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RecipientType = "all" | "status" | "specific";

interface SendEmailRequest {
    templateId: string;
    subject?: string;
    body?: string;
    recipientType: RecipientType;
    status?: string;
    specificEmails?: string[];
}

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const {
            templateId,
            subject,
            body,
            recipientType,
            status,
            specificEmails,
        }: SendEmailRequest = await request.json();

        // Validate request
        if (!templateId) {
            return NextResponse.json(
                { error: "Template ID is required" },
                { status: 400 },
            );
        }

        if (!recipientType) {
            return NextResponse.json(
                { error: "Recipient type is required" },
                { status: 400 },
            );
        }

        if (recipientType === "status" && !status) {
            return NextResponse.json(
                { error: "Status is required when filtering by status" },
                { status: 400 },
            );
        }

        if (
            recipientType === "specific" &&
            (!specificEmails || specificEmails.length === 0)
        ) {
            return NextResponse.json(
                {
                    error: "At least one email is required for specific recipients",
                },
                { status: 400 },
            );
        }

        // Fetch recipients from database based on type
        let recipients: string[] = [];

        try {
            if (recipientType === "all") {
                // Get all participants
                const allParticipants = await db
                    .select({ email: participants.email })
                    .from(participants);
                recipients = allParticipants.map((p) => p.email);
            } else if (recipientType === "status") {
                // Get participants with specific status
                const statusParticipants = await db
                    .select({ email: participants.email })
                    .from(participants)
                    .where(eq(participants.status, status as any));
                recipients = statusParticipants.map((p) => p.email);
            } else if (recipientType === "specific") {
                // Use the provided email list
                recipients = specificEmails || [];
            }
        } catch (dbError) {
            console.error("Database query error:", dbError);
            return NextResponse.json(
                { error: "Failed to fetch recipients from database" },
                { status: 500 },
            );
        }

        if (recipients.length === 0) {
            return NextResponse.json(
                { error: "No recipients found matching the criteria" },
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
        const invalidEmails = recipients.filter(
            (email) => !emailRegex.test(email),
        );
        if (invalidEmails.length > 0) {
            return NextResponse.json(
                {
                    error: `Invalid email addresses: ${invalidEmails.join(", ")}`,
                },
                { status: 400 },
            );
        }

        const emailSubject = subject || template.subject;

        // Initialize Mailgun
        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({
            username: "api",
            key: process.env.MAILGUN_API_KEY || "",
        });

        const mailgunDomain = process.env.MAILGUN_DOMAIN || "";
        const fromEmail =
            process.env.MAILGUN_FROM_EMAIL || "info@revolutionuc.com";

        // Validate Mailgun configuration
        if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
            return NextResponse.json(
                { error: "Mailgun configuration is missing" },
                { status: 500 },
            );
        }

        // Render template once using Mailgun recipient variable placeholder
        const [html, text] = await Promise.all([
            renderTemplateToHtml(templateId, {
                name: "%recipient.name%",
                firstName: "%recipient.name%",
                subject: emailSubject,
                body,
            }),
            renderTemplateToText(templateId, {
                name: "%recipient.name%",
                firstName: "%recipient.name%",
                subject: emailSubject,
                body,
            }),
        ]);

        if (!html || !text) {
            return NextResponse.json(
                { error: "Failed to render email template" },
                { status: 500 },
            );
        }

        // Build recipient variables map
        const recipientVariables: Record<string, { name: string }> = {};
        for (const recipient of recipients) {
            recipientVariables[recipient] = {
                name: extractNameFromEmail(recipient),
            };
        }

        // Send in batches of 1000 (Mailgun's limit)
        const BATCH_SIZE = 1000;
        const results = [];

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            const batchVariables: Record<string, { name: string }> = {};
            for (const email of batch) {
                batchVariables[email] = recipientVariables[email];
            }

            try {
                const response = await mg.messages.create(mailgunDomain, {
                    from: fromEmail,
                    to: batch,
                    subject: emailSubject,
                    html: html,
                    text: text,
                    "recipient-variables": JSON.stringify(batchVariables),
                });

                console.log(
                    `Batch ${Math.floor(i / BATCH_SIZE) + 1} sent (${batch.length} recipients):`,
                    response.id,
                );
                results.push({
                    batch: Math.floor(i / BATCH_SIZE) + 1,
                    count: batch.length,
                    success: true,
                    messageId: response.id,
                });
            } catch (error) {
                console.error(
                    `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
                    error,
                );
                results.push({
                    batch: Math.floor(i / BATCH_SIZE) + 1,
                    count: batch.length,
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                });
            }
        }

        console.log("Email batch completed:", {
            templateId,
            recipientType,
            status: recipientType === "status" ? status : undefined,
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
