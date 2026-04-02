// src/routes/api/stripe/portal/+server.js
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

function getSupabase() {
  return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST({ request }) {
  try {
    const { userId } = await request.json();
    if (!userId) return json({ error: 'Missing userId' }, { status: 400 });

    const supabase = getSupabase();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    const origin = request.headers.get('origin') || 'https://nio-sports-pro-v4-0.vercel.app';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/pricing`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Portal] Error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}