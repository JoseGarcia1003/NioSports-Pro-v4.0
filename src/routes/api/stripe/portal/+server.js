// src/routes/api/stripe/portal/+server.js
import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

export async function POST({ request }) {
  try {
    const { customerId } = await request.json();

    if (!customerId) {
      return json({ error: 'customerId is required' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.PUBLIC_SITE_URL || 'http://localhost:5173'}/`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Portal] Error:', err.message);
    return json({ error: err.message }, { status: 500 });
  }
}