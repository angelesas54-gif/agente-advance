import Stripe from 'stripe';

const PRICE_MAP = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  annual: process.env.STRIPE_PRICE_YEARLY,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = req.headers.origin || process.env.APP_URL || 'https://agenteadvance.com';
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { planType, userId, email } = body || {};
    const priceId = PRICE_MAP[planType];

    if (!userId || !priceId) {
      return res.status(400).json({ error: 'Missing userId or invalid plan type' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: origin,
      client_reference_id: userId,
      customer_email: email || undefined,
      metadata: {
        userId,
        plan: 'pro',
        billingCycle: planType,
      },
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating Stripe Checkout session:', error);
    return res.status(500).json({ error: error.message || 'Unable to create checkout session' });
  }
}
