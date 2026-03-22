// src/routes/api/stripe/webhooks/+server.js
import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
const endpointSecret = env.STRIPE_WEBHOOK_SECRET || '';

function getSupabase() {
  return createClient(env.VITE_SUPABASE_URL || '', env.SUPABASE_SERVICE_ROLE_KEY || '');
}

function planFromPriceId(priceId) {
  const proPrices = (env.STRIPE_PRO_PRICE_IDS || '').split(',');
  const elitePrices = (env.STRIPE_ELITE_PRICE_IDS || '').split(',');
  if (proPrices.includes(priceId)) return 'pro';
  if (elitePrices.includes(priceId)) return 'elite';
  return 'free';
}

export async function POST({ request }) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = planFromPriceId(priceId);
        const isActive = ['active', 'trialing'].includes(subscription.status);

        await supabase.from('user_profiles').upsert({
          id: userId,
          plan: isActive ? plan : 'free',
          stripe_customer_id: subscription.customer,
          plan_expires_at: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        }, { onConflict: 'id' });

        console.log(`[Stripe] User ${userId} → plan: ${plan}, status: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        await supabase.from('user_profiles').update({
          plan: 'free',
          plan_expires_at: null,
        }).eq('id', userId);

        console.log(`[Stripe] User ${userId} → plan: free (cancelled)`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`[Stripe] Payment failed for customer: ${invoice.customer}`);
        break;
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err.message);
  }

  return json({ received: true });
}