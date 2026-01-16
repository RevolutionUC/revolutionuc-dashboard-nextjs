"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emailTemplates, type EmailTemplateMeta } from "@/lib/templates";
import { Send, X, Plus, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EmailSendPage() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplateMeta | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [currentRecipient, setCurrentRecipient] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSelectTemplate = (template: EmailTemplateMeta) => {
    setSelectedTemplate(template);
    setCustomSubject(template.subject);
    setCustomBody("");
    setStatusMessage(null);
  };

  const handleAddRecipient = () => {
    const email = currentRecipient.trim().toLowerCase();
    if (email && isValidEmail(email) && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
      setCurrentRecipient("");
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRecipient();
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendEmails = async () => {
    if (!selectedTemplate || recipients.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Please select a template and add at least one recipient.",
      });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          subject: customSubject,
          body: customBody,
          recipients,
        }),
      });

      if (response.ok) {
        setStatusMessage({
          type: "success",
          text: `Emails queued for ${recipients.length} recipient(s)!`,
        });
        setRecipients([]);
      } else {
        const data = await response.json();
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to send emails.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "An error occurred while sending emails.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/emails">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Send Emails</h1>
            <p className="text-muted-foreground">
              Select a template and send to your recipients.
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Template Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select Template</h2>
            <div className="grid gap-3">
              {emailTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    selectedTemplate?.id === template.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Mail className="size-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Compose Section */}
          <div className="space-y-6">
            {/* Recipients */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Recipients</h2>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={currentRecipient}
                  onChange={(e) => setCurrentRecipient(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddRecipient}
                  variant="outline"
                  size="icon"
                  disabled={
                    !currentRecipient.trim() ||
                    !isValidEmail(currentRecipient.trim())
                  }
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              {recipients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {recipients.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recipients added yet.
                </p>
              )}
            </div>

            {/* Custom Fields (for Custom Email template) */}
            {selectedTemplate?.id === "custom" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Customize Email</h2>
                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-medium">
                      Subject
                    </label>
                    <Input
                      id="subject"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="body" className="text-sm font-medium">
                      Message
                    </label>
                    <textarea
                      id="body"
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      rows={6}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                      placeholder="Enter your message..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`p-4 rounded-lg ${
                  statusMessage.type === "success"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleSendEmails}
              disabled={
                !selectedTemplate || recipients.length === 0 || isSending
              }
              className="w-full"
              size="lg"
            >
              {isSending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="size-4" />
                  Send to {recipients.length} recipient
                  {recipients.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
