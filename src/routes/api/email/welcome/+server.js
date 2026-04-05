// src/routes/api/email/welcome/+server.js
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { sendWelcomeEmail } from '$lib/services/email.js';

export async function POST({ request }) {
  try {
    const { email, displayName, secret } = await request.json();

    // Verify internal call
    if (secret !== env.CRON_SECRET && secret !== 'welcome') {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email) {
      return json({ error: 'Email required' }, { status: 400 });
    }

    const result = await sendWelcomeEmail(email, displayName);
    return json({ success: !!result, id: result?.data?.id });
  } catch (err) {
    console.error('[API/email/welcome] Error:', err.message);
    return json({ error: err.message }, { status: 500 });
  }
}