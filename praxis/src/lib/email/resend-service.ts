/**
 * Email service for Praxis. Uses Resend when RESEND_API_KEY is set;
 * otherwise logs and returns success (stub mode for development).
 */
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function getDefaultFrom(): string {
  return process.env.RESEND_FROM ?? "Praxis <onboarding@resend.dev>";
}

export interface AdminEmailData {
  email: string;
  name: string | null;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

function buildAdminEmailHtml(data: AdminEmailData): string {
  const formattedHtml = data.html.replace(/\n/g, "<br>");
  const signature = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
      <p style="margin: 8px 0; font-weight: 600;">Praxis</p>
      <p style="margin: 4px 0; color: #6b7280;">Interactive simulation platform for educators</p>
    </div>
  `;
  const footer = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 4px 0;">You received this from Praxis.</p>
    </div>
  `;
  return formattedHtml + signature + footer;
}

export async function sendAdminEmail(data: AdminEmailData): Promise<boolean> {
  const html = buildAdminEmailHtml(data);
  const from = data.from || getDefaultFrom();

  if (!resend) return true;

  try {
    const { error } = await resend.emails.send({
      from,
      to: data.email,
      subject: data.subject,
      html,
    });
    if (error) {
      console.error("Resend sendAdminEmail error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend sendAdminEmail exception:", e);
    return false;
  }
}

export async function sendCustomEmail(options: EmailOptions): Promise<boolean> {
  const from = options.from || getDefaultFrom();

  if (!resend) return true;

  try {
    const { error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.replyTo && { replyTo: options.replyTo }),
    });
    if (error) {
      console.error("Resend sendCustomEmail error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend sendCustomEmail exception:", e);
    return false;
  }
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
