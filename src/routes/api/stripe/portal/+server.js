// src/routes/api/stripe/portal/+server.js
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
    const userId = identity.uid;
    if (!userId) return json({ error: 'Missing userId' }, { status: 400 });

    const supabase = getSupabase();
    const { data: profile } = await supabase
      .from('billing_accounts')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle().throwOnError();

    if (!profile?.stripe_customer_id) {
      return json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    const origin = env.APP_ORIGIN || 'https://nio-sports-pro-v4-0.vercel.app';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/pricing`,
    });

    return json({ url: session.url });
  } catch (err) {
    if (isHttpError(err)) throw err;
    console.error('[Stripe Portal] Error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}