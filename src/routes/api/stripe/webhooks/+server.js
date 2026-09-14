import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import Stripe from 'stripe';
import { adminDatabase } from '$lib/server/entitlements.js';

export async function POST({ request }) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) return json({ error: 'Webhook unavailable' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return json({ error: 'Missing signature' }, { status: 400 });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, env.STRIPE_WEBHOOK_SECRET); }
  catch { return json({ error: 'Invalid signature' }, { status: 400 }); }
  const supported = ['checkout.session.completed','customer.subscription.updated','customer.subscription.deleted',
    'invoice.payment_failed','invoice.paid','invoice.payment_succeeded'];
  if (!supported.includes(event.type)) return json({ received: true });
  try {
    const object = event.data.object;
    const subscriptionId = event.type.startsWith('customer.subscription.') ? object.id
      : object.subscription || object.parent?.subscription_details?.subscription;
    if (!subscriptionId) return json({ received: true, ignored: true });
    // Query current Stripe state so delayed webhook payloads cannot restore old privileges.
    const sub = event.type === 'customer.subscription.deleted' ? object : await stripe.subscriptions.retrieve(subscriptionId);
    const userId = sub.metadata?.userId;
    if (!userId || !sub.customer) throw new Error('Missing subscription identity');
    const priceId = sub.items?.data?.[0]?.price?.id;
    const active = ['active','trialing'].includes(sub.status);
    const plan = active && priceId && priceId === env.STRIPE_PRICE_ELITE ? 'elite'
      : active && priceId && priceId === env.STRIPE_PRICE_PRO ? 'pro' : 'free';
    const end = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
    const { error } = await adminDatabase().rpc('billing_apply_event', {
      p_id: event.id, p_type: event.type, p_created: event.created, p_user: userId,
      p_customer: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      p_subscription: sub.id, p_plan: plan, p_status: sub.status,
      p_end: Number.isFinite(end) ? new Date(end * 1000).toISOString() : null,
    });
    if (error) throw error;
    return json({ received: true });
  } catch (error) {
    console.error('[Stripe webhook] Processing failed:', error.message);
    return json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
