import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

/**
 * Stripe webhook handler.
 * Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY (for subscription sync)
 *
 * Configure in Stripe Dashboard: Developers → Webhooks → Add endpoint
 * URL: https://your-domain.com/api/stripe/webhook
 * Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Supabase service role not configured. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY for webhook subscription sync.",
      },
      { status: 503 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          await handleSubscriptionCreated(session, stripe, supabase);
        }
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;
      }
      default:
        // Unhandled event type
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  const userId = session.metadata?.userId as string | null;
  const customerId = session.customer as string;
  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id ?? "";
  const planName = process.env.STRIPE_PLAN_NAME || "Pro";
  const periodStart = (firstItem as { current_period_start?: number })?.current_period_start ?? subscription.created;
  const periodEnd = (firstItem as { current_period_end?: number })?.current_period_end ?? subscription.created;

  const data = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan_name: planName,
    status: subscription.status,
    current_period_start: new Date(periodStart * 1000).toISOString(),
    current_period_end: new Date(periodEnd * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    canceled_at: null as string | null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await supabase.from("subscriptions").upsert(data, {
    onConflict: "user_id",
  });
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id ?? "";
  const planName = process.env.STRIPE_PLAN_NAME || "Pro";
  const periodStart = (firstItem as { current_period_start?: number })?.current_period_start ?? subscription.created;
  const periodEnd = (firstItem as { current_period_end?: number })?.current_period_end ?? subscription.created;

  await supabase
    .from("subscriptions")
    .update({
      stripe_price_id: priceId,
      plan_name: planName,
      status: subscription.status,
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}
