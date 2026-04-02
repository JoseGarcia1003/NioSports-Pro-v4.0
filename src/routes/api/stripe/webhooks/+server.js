// src/routes/api/stripe/webhook/+server.js
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

function getSupabase() {
  return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

function getPlanFromPriceId(priceId) {
  if (priceId === env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === env.STRIPE_PRICE_ELITE) return 'elite';
  return 'free';
}

export async function POST({ request }) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // In development without webhook secret, parse directly
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Signature error:', err.message);
    return json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;

        if (userId && subscriptionId) {
          // Fetch subscription details
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id;
          const plan = getPlanFromPriceId(priceId);

          await supabase
            .from('user_profiles')
            .upsert({
              user_id: userId,
              plan,
              subscription_status: 'active',
              stripe_customer_id: session.customer,
              stripe_subscription_id: subscriptionId,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

          console.log(`[Stripe] User ${userId} subscribed to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        const priceId = sub.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);

        if (userId) {
          await supabase
            .from('user_profiles')
            .upsert({
              user_id: userId,
              plan,
              subscription_status: sub.status === 'active' ? 'active' : sub.status,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;

        if (userId) {
          await supabase
            .from('user_profiles')
            .upsert({
              user_id: userId,
              plan: 'free',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
              current_period_end: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

          console.log(`[Stripe] User ${userId} canceled — downgraded to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const userId = sub.metadata?.userId;
          if (userId) {
            await supabase
              .from('user_profiles')
              .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
              .eq('user_id', userId);
          }
        }
        break;
      }
    }

    return json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}