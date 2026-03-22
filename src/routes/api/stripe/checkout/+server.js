// src/routes/api/stripe/checkout/+server.js
import { json, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

export async function POST({ request }) {
  try {
    const { priceId, userId, userEmail, billingCycle } = await request.json();

    if (!priceId || !userId) {
      return json({ error: 'priceId and userId are required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.PUBLIC_SITE_URL || 'http://localhost:5173'}/?checkout=success`,
      cancel_url: `${env.PUBLIC_SITE_URL || 'http://localhost:5173'}/pricing?checkout=cancelled`,
      metadata: {
        userId,
        billingCycle: billingCycle || 'monthly',
      },
      subscription_data: {
        metadata: { userId },
        trial_period_days: 7,
      },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Checkout] Error:', err.message);
    return json({ error: err.message }, { status: 500 });
  }
}