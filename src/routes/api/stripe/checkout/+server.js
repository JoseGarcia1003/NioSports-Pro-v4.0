// src/routes/api/stripe/checkout/+server.js
import { json, isHttpError } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { env } from '$env/dynamic/private';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';



function getSupabase() {
  return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST({ request }) {
  const identity = await requireIdentity(request);
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Billing unavailable" }, { status: 503 });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  try {
    const { priceId } = await request.json();
    const userId = identity.uid;
    const userEmail = identity.email;
    if (!priceId || ![env.STRIPE_PRICE_PRO, env.STRIPE_PRICE_ELITE].filter(Boolean).includes(priceId)) return json({ error: "Unknown price" }, { status: 400 });

    if (!priceId || !userId) {
      return json({ error: 'Missing priceId or userId' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Check if user already has a Stripe customer
    const { data: profile } = await supabase
      .from('billing_accounts')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle().throwOnError();

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('billing_accounts')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).throwOnError();
    }

    // Determine success/cancel URLs
    const origin = env.APP_ORIGIN || 'https://nio-sports-pro-v4-0.vercel.app';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    return json({ url: session.url });
  } catch (err) {
    if (isHttpError(err)) throw err;
    console.error('[Stripe Checkout] Error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}