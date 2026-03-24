import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const PROFILES_TABLE = 'perfiles';

function timingSafeEqual(a, b) {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

function parseSignature(signatureHeader) {
  const entries = Object.fromEntries(
    String(signatureHeader || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, value] = part.split('=');
        return [key, value];
      }),
  );

  return {
    timestamp: entries.ts || '',
    signature: entries.h1 || '',
  };
}

async function readRawBody(req) {
  if (typeof req.body === 'string') {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function verifySignature({ rawBody, signatureHeader, secret }) {
  const { timestamp, signature } = parseSignature(signatureHeader);

  if (!timestamp || !signature) {
    throw new Error('Missing Paddle-Signature header.');
  }

  const payload = `${timestamp}:${rawBody}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (!timingSafeEqual(expectedSignature, signature)) {
    throw new Error('Invalid Paddle webhook signature.');
  }
}

function getUserIdFromPayload(payload) {
  return (
    payload?.data?.custom_data?.userId ||
    payload?.data?.customData?.userId ||
    payload?.data?.custom_data?.user_id ||
    payload?.data?.customData?.user_id ||
    ''
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const webhookSecret = String(process.env.PADDLE_WEBHOOK_SECRET || '').trim();

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: 'Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      });
    }

    if (!webhookSecret) {
      return res.status(500).json({ error: 'Missing PADDLE_WEBHOOK_SECRET' });
    }

    const rawBody = await readRawBody(req);
    verifySignature({
      rawBody,
      signatureHeader: req.headers['paddle-signature'],
      secret: webhookSecret,
    });

    const payload = JSON.parse(rawBody);
    const eventType = payload?.event_type || '';
    const userId = getUserIdFromPayload(payload);

    console.error('Paddle webhook received', {
      eventType,
      notificationId: payload?.notification_id || '',
      userId: userId || null,
    });

    if (!userId) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'missing_user_id' });
    }

    if (
      eventType !== 'transaction.completed' &&
      eventType !== 'transaction.paid' &&
      eventType !== 'subscription.created' &&
      eventType !== 'subscription.activated'
    ) {
      return res.status(200).json({ ok: true, skipped: true, eventType });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await supabase.from(PROFILES_TABLE).upsert({
      id: userId,
      plan: 'pro',
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({ ok: true, userId, plan: 'pro', eventType });
  } catch (error) {
    console.error('Error in Paddle webhook:', error);
    return res.status(500).json({ error: error.message || 'Paddle webhook failed' });
  }
}
