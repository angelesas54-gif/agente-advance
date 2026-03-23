import Stripe from 'stripe';

const PRICE_MAP = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  annual: process.env.STRIPE_PRICE_YEARLY,
};

function getErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  return error.message || JSON.stringify(error);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      console.error('Stripe checkout rejected method', {
        method: req.method,
        url: req.url,
      });
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const rawBody = req.body;
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody || {};
    const { planType, userId, email } = body;
    const priceId = PRICE_MAP[planType];
    const origin = req.headers.origin || process.env.APP_URL || 'https://agenteadvance.com';

    console.error('Stripe checkout request debug', {
      method: req.method,
      origin,
      planType,
      userId,
      email,
      hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
      hasMonthlyPrice: Boolean(process.env.STRIPE_PRICE_MONTHLY),
      hasYearlyPrice: Boolean(process.env.STRIPE_PRICE_YEARLY),
      selectedPriceId: priceId || null,
    });

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    if (!userId || !priceId) {
      console.error('Stripe checkout validation failed', {
        userId,
        planType,
        priceId,
      });
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

    console.error('Stripe checkout session created', {
      sessionId: session.id,
      sessionUrl: session.url || null,
      planType,
      userId,
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creating Stripe Checkout session:', {
      message: getErrorMessage(error),
      type: error?.type || null,
      code: error?.code || null,
      raw: error,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}
