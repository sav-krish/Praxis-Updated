/**
 * Stripe server-side client. Use only in server components, API routes, or server actions.
 * Requires: STRIPE_SECRET_KEY
 *
 * Redirect-based Checkout: create session, return session.url, client does window.location = url.
 * No @stripe/stripe-js needed (redirectToCheckout is deprecated).
 */
import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) {
    stripe = new Stripe(key, { typescript: true });
  }
  return stripe;
}

/** Base URL for redirects (checkout success/cancel). Uses NEXT_PUBLIC_APP_URL or auto-detected. */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof process.env.VERCEL_URL === "string"
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}
