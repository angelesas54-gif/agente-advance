// Legacy Stripe portal endpoint kept temporarily for subscription management compatibility.
import Stripe from 'stripe';

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
    const customerIdFromBody = body?.customerId || '';
    const email = body?.email || '';

    let customerId = customerIdFromBody;

    if (!customerId && email) {
      const customers = await stripe.customers.list({
        email,
        limit: 1,
      });

      customerId = customers.data?.[0]?.id || '';
    }

    if (!customerId) {
      return res.status(400).json({
        error: 'No encontramos un cliente de Stripe asociado a esta cuenta.',
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe customer portal session:', error);
    return res.status(500).json({
      error: error.message || 'Unable to create customer portal session',
    });
  }
}
