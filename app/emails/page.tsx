import { Button } from "@/components/ui/button";
import { Mail, Eye, Send } from "lucide-react";
import Link from "next/link";
import { emailTemplates } from "@/lib/templates";

export default function EmailsPage() {
  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Email Center</h1>
          <p className="text-muted-foreground">
            Manage and send emails to your participants.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Preview Templates Card */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="size-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Preview Templates</h2>
            </div>
            <p className="text-muted-foreground">
              View and preview your email templates before sending them to
              recipients.
            </p>
            <Link href="/emails/preview">
              <Button className="w-full">
                <Eye className="size-4" />
                Preview Templates
              </Button>
            </Link>
          </div>

          {/* Send Emails Card */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Send className="size-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Send Emails</h2>
            </div>
            <p className="text-muted-foreground">
              Select a template and send emails to your list of recipients.
            </p>
            <Link href="/emails/send">
              <Button className="w-full">
                <Send className="size-4" />
                Send Emails
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Info */}
        <div className="rounded-lg border bg-muted/50 p-6">
          <div className="flex items-start gap-3">
            <Mail className="size-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-medium">Available Templates</h3>
              <p className="text-sm text-muted-foreground">
                You have {emailTemplates.length} email templates configured.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
