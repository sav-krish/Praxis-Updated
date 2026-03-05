"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  ArrowLeft,
  Eye,
  Users,
  CheckCircle2,
  AlertCircle,
  Mail,
  X,
} from "lucide-react";

type Recipient = { email: string; name: string | null; id: string };

interface AdminEmailsViewProps {
  resendReady: boolean;
}

export function AdminEmailsView({ resendReady }: AdminEmailsViewProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipientFilter, setRecipientFilter] = useState<"all" | "selected">("all");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [excludedEmails, setExcludedEmails] = useState<string[]>([]);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [emailData, setEmailData] = useState({
    subject: "",
    message: "",
    from: "Praxis <onboarding@resend.dev>",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    recipientCount?: number;
    successCount?: number;
    failureCount?: number;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecipient, setPreviewRecipient] = useState<Recipient | null>(null);

  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/emails/recipients");
        const data = await res.json();
        if (!res.ok) {
          const msg = data?.error ?? "Failed to fetch recipients";
          const detail = data?.detail ? ` (${data.detail})` : "";
          throw new Error(msg + detail);
        }
        setRecipients(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recipients");
      } finally {
        setLoading(false);
      }
    };
    fetchRecipients();
  }, []);

  const filteredRecipients = recipients.filter(
    (r) =>
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getEffectiveRecipients = () => {
    if (recipientFilter === "selected") {
      return recipients.filter((r) => selectedEmails.includes(r.email));
    }
    return recipients.filter((r) => !excludedEmails.includes(r.email));
  };

  const effectiveRecipients = getEffectiveRecipients();
  const recipientCount = effectiveRecipients.length;

  const sendEmail = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: emailData.subject,
          message: emailData.message,
          from: emailData.from,
          recipientFilter: recipientFilter === "selected" ? "custom" : "all",
          customEmails: recipientFilter === "selected" ? selectedEmails : [],
          excludedEmails: recipientFilter === "all" ? excludedEmails : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: data.error ?? "Failed to send" });
      } else {
        setResult({
          success: true,
          recipientCount: data.recipientCount,
          successCount: data.successCount,
          failureCount: data.failureCount,
        });
      }
    } catch {
      setResult({ success: false, error: "Failed to send email" });
    } finally {
      setSending(false);
    }
  };

  const sendTestEmail = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/emails/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: emailData.subject,
          message: emailData.message,
          from: emailData.from,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: data.error ?? "Failed to send test" });
      } else {
        setResult({ success: true, error: `Test sent to ${data.recipientEmail}` });
      }
    } catch {
      setResult({ success: false, error: "Failed to send test email" });
    } finally {
      setSending(false);
    }
  };

  const toggleSelected = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
    setExcludedEmails((prev) => prev.filter((e) => e !== email));
  };

  const toggleExcluded = (email: string) => {
    setExcludedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
    setSelectedEmails((prev) => prev.filter((e) => e !== email));
  };

  const openPreview = () => {
    const sample = effectiveRecipients[0] ?? recipients[0] ?? {
      email: "recipient@example.com",
      name: "Sample Recipient",
      id: "preview-placeholder",
    };
    setPreviewRecipient(sample);
    setShowPreview(true);
  };

  const getPreviewHtml = () => {
    if (!previewRecipient) return "";
    const msg = emailData.message || "(No message content)";
    return msg
      .replace(/\{name\}/g, previewRecipient.name || "there")
      .replace(/\n/g, "<br>");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/feedback">
            <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Email Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              Send emails to professors
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openPreview} disabled={!emailData.subject || !emailData.message}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      {!resendReady && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">Resend not configured</p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Emails will be logged only. Set RESEND_API_KEY to send real emails.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className={result.success ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}>
          <CardContent className="py-4 flex items-center gap-3">
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            )}
            <div>
              <p className={`font-medium ${result.success ? "text-primary" : "text-destructive"}`}>
                {result.success ? "Email sent" : "Failed"}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.success
                  ? result.recipientCount !== undefined
                    ? `Sent to ${result.successCount ?? result.recipientCount} recipient(s)`
                    : result.error
                  : result.error}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading recipients...</span>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="py-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recipients
                </CardTitle>
                <CardDescription>Choose who receives this email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setRecipientFilter("all")}
                    className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
                      recipientFilter === "all"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="font-medium">All professors</div>
                    <div className="text-sm text-muted-foreground">
                      {recipients.length - excludedEmails.length} recipients
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientFilter("selected")}
                    className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
                      recipientFilter === "selected"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="font-medium">Selected only</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedEmails.length} selected
                    </div>
                  </button>
                </div>

                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserSelector(!showUserSelector)}
                  >
                    {showUserSelector ? "Hide" : "Show"} user selector
                  </Button>
                  {showUserSelector && (
                    <div className="mt-4 space-y-4">
                      <Input
                        placeholder="Search by email or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                      />
                      <div className="max-h-48 overflow-y-auto rounded-lg border">
                        {filteredRecipients.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50"
                          >
                            <div>
                              <div className="font-medium text-sm">{r.name || "No name"}</div>
                              <div className="text-xs text-muted-foreground">{r.email}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant={selectedEmails.includes(r.email) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleSelected(r.email)}
                              >
                                {selectedEmails.includes(r.email) ? "Selected" : "Select"}
                              </Button>
                              <Button
                                variant={excludedEmails.includes(r.email) ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => toggleExcluded(r.email)}
                              >
                                {excludedEmails.includes(r.email) ? "Excluded" : "Exclude"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email content
                </CardTitle>
                <CardDescription>Subject and message body</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="from">From</Label>
                  <Input
                    id="from"
                    value={emailData.from}
                    onChange={(e) => setEmailData({ ...emailData, from: e.target.value })}
                    placeholder="Praxis <noreply@praxis.app>"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    placeholder="Your subject line..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    placeholder="Write your message... Use {name} for personalization."
                    rows={10}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use {"{name}"} to include the recipient&apos;s name. Line breaks become &lt;br&gt;.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Send or test your email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={sendEmail}
                  disabled={sending || !emailData.subject || !emailData.message || recipientCount === 0}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send to {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={sendTestEmail}
                  disabled={sending || !emailData.subject || !emailData.message}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send test email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total professors</span>
                    <span className="font-medium">{recipients.length}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Recipients for this send</span>
                    <Badge variant="secondary">{recipientCount}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Keep subject lines under 50 characters</p>
                <p>• Use {"{name}"} to personalize</p>
                <p>• Test before sending to all</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {showPreview && previewRecipient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Email preview</CardTitle>
                <CardDescription>
                  {previewRecipient.name || "No name"} ({previewRecipient.email})
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="p-4 bg-muted rounded-lg mb-4 text-sm">
                <div><span className="text-muted-foreground">From:</span> {emailData.from}</div>
                <div className="mt-1"><span className="text-muted-foreground">To:</span> {previewRecipient.email}</div>
                <div className="mt-1"><span className="text-muted-foreground">Subject:</span> {emailData.subject}</div>
              </div>
              <div
                className="p-4 border rounded-lg prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
