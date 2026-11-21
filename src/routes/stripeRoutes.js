const express = require("express");
const { getTenant } = require("../store/memoryStore");
const { createProCheckoutSession, handleVerifiedStripeEvent, getStripeClient } = require("../services/stripeService");

const router = express.Router();

router.post("/checkout", async (req, res) => {
  const { tenantId, successUrl, cancelUrl } = req.body || {};
  if (!tenantId || typeof tenantId !== "string") {
    return res.status(400).json({ error: "tenantId is required" });
  }

  const tenant = getTenant(tenantId);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  try {
    const session = await createProCheckoutSession({ tenantId, successUrl, cancelUrl });
    return res.status(201).json(session);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create Stripe checkout session", detail: err.message });
  }
});

router.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.header("Stripe-Signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: "Missing Stripe-Signature or webhook secret" });
  }

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    // Forged or invalid signature -> 400, no state change
    return res.status(400).json({ error: "Invalid webhook signature", detail: err.message });
  }

  const outcome = handleVerifiedStripeEvent(event);
  return res.status(outcome.statusCode).json(outcome.body);
});

module.exports = router;