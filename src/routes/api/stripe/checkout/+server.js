// src/routes/api/stripe/checkout/+server.js
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
    const { priceId, userId, userEmail } = await request.json();

    if (!priceId || !userId) {
      return json({ error: 'Missing priceId or userId' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Check if user already has a Stripe customer
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

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
        .from('user_profiles')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }

    // Determine success/cancel URLs
    const origin = request.headers.get('origin') || 'https://nio-sports-pro-v4-0.vercel.app';

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
    console.error('[Stripe Checkout] Error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}