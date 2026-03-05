import { NextRequest, NextResponse } from "next/server";
import { getStripe, getAppUrl } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

/**
 * Create Stripe Checkout session for subscription.
 * Requires: STRIPE_SECRET_KEY, STRIPE_PRICE_ID
 * Admin-only (pricing is gated for now).
 *
 * Returns session.url – client should redirect: window.location.href = url
 * (redirectToCheckout is deprecated; use session.url directly)
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: "Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to .env.local." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdmin(user);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const customPriceId = body.priceId as string | undefined;
  const effectivePriceId = customPriceId || priceId;

  const appUrl = getAppUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{ price: effectivePriceId, quantity: 1 }],
      success_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl ?? `${appUrl}/dashboard`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
        trial_period_days: body.trialPeriodDays ?? 0,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
