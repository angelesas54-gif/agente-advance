import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sessionId = req.query?.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const isPaid = session.status === 'complete' && session.payment_status === 'paid';

    return res.status(200).json({
      isPaid,
      sessionId: session.id,
      userId: session.metadata?.userId || session.client_reference_id || '',
      plan: session.metadata?.plan || 'pro',
      billingCycle: session.metadata?.billingCycle || '',
    });
  } catch (error) {
    console.error('Error verifying Stripe Checkout session:', error);
    return res.status(500).json({ error: error.message || 'Unable to verify checkout session' });
  }
}
