const express = require('express');
const { pool } = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createAccountFromCheckout } = require('../services/account-creation');

const router = express.Router();

const verifyStripeSignature = (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!sig || !secret) {
    return res.status(401).json({ error: 'Missing signature or secret' });
  }

  try {
    req.stripeEvent = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
    next();
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message);
    return res.status(401).json({ error: 'Signature verification failed' });
  }
};

router.post('/stripe', verifyStripeSignature, async (req, res) => {
  const event = req.stripeEvent;
  const eventId = event.id;
  const eventType = event.type;

  console.log('[webhook] Received Stripe event:', eventType, eventId);

  try {
    await pool.query(
      'INSERT INTO webhook_events (event_type, stripe_event_id, payload, processed_at) VALUES ($1, $2, $3, NOW())',
      [eventType, eventId, JSON.stringify(event)]
    );

    if (eventType === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email;
      const tier = session.metadata?.tier || 'starter';

      if (!email) {
        console.error('[webhook] No email found in checkout session');
        return res.status(200).json({ ok: true, note: 'No email' });
      }

      console.log('[webhook] Creating account for', email, 'tier:', tier);
      const result = await createAccountFromCheckout(email, tier);

      await pool.query(
        'UPDATE webhook_events SET processed_at = NOW(), metadata = $1 WHERE stripe_event_id = $2',
        [JSON.stringify(result), eventId]
      );

      console.log('[webhook] Account created: user=' + result.userId + ', agency=' + result.agencyId);
      return res.status(200).json({ ok: true, userId: result.userId, agencyId: result.agencyId });
    }

    res.status(200).json({ ok: true, event: eventType });
  } catch (error) {
    console.error('[webhook] Error processing', eventType, ':', error);

    try {
      await pool.query(
        'UPDATE webhook_events SET error = $1 WHERE stripe_event_id = $2',
        [error.message, eventId]
      );
    } catch (dbErr) {
      console.error('[webhook] Failed to log error:', dbErr);
    }

    res.status(200).json({ ok: true, error: error.message });
  }
});

module.exports = router;