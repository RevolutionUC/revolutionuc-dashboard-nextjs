import * as React from "react";
import { render } from "@react-email/render";

// Import email templates
import { WelcomeEmail } from "./WelcomeEmail";
import { AcceptanceEmail } from "./AcceptanceEmail";
import { CustomEmail } from "./CustomEmail";

// Re-export templates
export { WelcomeEmail, AcceptanceEmail, CustomEmail };

// Template metadata interface
export interface EmailTemplateMeta {
  id: string;
  name: string;
  subject: string;
  description: string;
  component: React.ComponentType<{
    name: string;
    subject?: string;
    body?: string;
  }>;
}

// Template registry
export const emailTemplates: EmailTemplateMeta[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    subject: "Welcome to RevolutionUC!",
    description: "Sent to new registrants after they sign up",
    component: WelcomeEmail,
  },
  {
    id: "acceptance",
    name: "Application Accepted",
    subject: "You're in! Welcome to RevolutionUC",
    description: "Sent when a participant's application is accepted",
    component: AcceptanceEmail,
  },
  {
    id: "custom",
    name: "Custom Email",
    subject: "",
    description: "A blank template for custom messages",
    component: CustomEmail,
  },
];

// Get template by ID
export function getTemplateById(id: string): EmailTemplateMeta | undefined {
  return emailTemplates.find((template) => template.id === id);
}

// Get all templates
export function getAllTemplates(): EmailTemplateMeta[] {
  return emailTemplates;
}

// Render props
export interface RenderEmailProps {
  name: string;
  subject?: string;
  body?: string;
}

// Render template to HTML
export async function renderTemplateToHtml(
  templateId: string,
  props: RenderEmailProps,
): Promise<string | null> {
  const template = getTemplateById(templateId);
  if (!template) return null;

  const element = React.createElement(template.component, props);
  return await render(element);
}

// Render template to plain text
export async function renderTemplateToText(
  templateId: string,
  props: RenderEmailProps,
): Promise<string | null> {
  const template = getTemplateById(templateId);
  if (!template) return null;

  const element = React.createElement(template.component, props);
  return await render(element, { plainText: true });
}
