"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emailTemplates } from "@/lib/templates";
import { PARTICIPANT_STATUSES } from "@/lib/participant-status";

type RecipientType = "all" | "minors" | "status" | "specific";

export default function EmailSendPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [recipientType, setRecipientType] = useState<RecipientType>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [specificEmails, setSpecificEmails] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSendEmails = async () => {
    if (!selectedTemplateId) {
      setStatusMessage({
        type: "error",
        text: "Please select a template.",
      });
      return;
    }

    if (recipientType === "status" && !selectedStatus) {
      setStatusMessage({
        type: "error",
        text: "Please select a participant status.",
      });
      return;
    }

    if (recipientType === "specific" && !specificEmails.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter at least one email address.",
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
          templateId: selectedTemplateId,
          recipientType,
          status: recipientType === "status" ? selectedStatus : undefined,
          specificEmails:
            recipientType === "specific"
              ? specificEmails.split(",").map((e) => e.trim()).filter(Boolean)
              : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatusMessage({
          type: "success",
          text: data.message || "Emails sent successfully!",
        });
        if (recipientType === "specific") {
          setSpecificEmails("");
        }
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
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Send Emails</h1>
          <p className="text-muted-foreground">
            Send email
          </p>
        </div>

        {/* Template Selection */}
        <div className="space-y-3">
          <Label htmlFor="template">Template</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger id="template">
              <SelectValue placeholder="Choose a template to send" />
            </SelectTrigger>
            <SelectContent>
              {emailTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recipient Selection */}
        <div className="space-y-4">
          <Label>Choose recipients</Label>
          <RadioGroup
            value={recipientType}
            onValueChange={(value: string) => setRecipientType(value as RecipientType)}
          >
            {/* All participants */}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="font-normal cursor-pointer">
                All participants
              </Label>
            </div>

            {/* Minors-only */}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="minors" id="minors" />
              <Label htmlFor="minors" className="font-normal cursor-pointer">
                Minors-only
              </Label>
            </div>

            {/* Participants with status */}
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="status" id="status" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="status" className="font-normal cursor-pointer">
                  Participants with status
                </Label>
                {recipientType === "status" && (
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTICIPANT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Specific emails */}
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="specific" id="specific" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="specific" className="font-normal cursor-pointer">
                  Specific emails
                </Label>
                {recipientType === "specific" && (
                  <Input
                    type="text"
                    placeholder="email1@example.com, email2@example.com"
                    value={specificEmails}
                    onChange={(e) => setSpecificEmails(e.target.value)}
                    className="w-full"
                  />
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-4 rounded-lg ${statusMessage.type === "success"
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
          disabled={isSending || !selectedTemplateId}
          className="w-full"
          size="lg"
        >
          {isSending ? "Sending..." : "Send emails"}
        </Button>
      </div>
    </main>
  );
}
