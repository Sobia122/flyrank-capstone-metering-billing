const Stripe = require("stripe");
const {
  updateTenantSubscription,
  hasProcessedWebhookEvent,
  markWebhookEventProcessed,
} = require("../store/memoryStore");

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

async function createProCheckoutSession({ tenantId, successUrl, cancelUrl }) {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    metadata: {
      tenantId,
      targetPlan: "pro",
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Pro Subscription Plan",
            description: "Higher monthly API call and AI token quotas",
          },
          unit_amount: 2900, // $29.00 in integer cents
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl || "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: cancelUrl || "http://localhost:3000/checkout/cancel",
  });

  return { id: session.id, url: session.url };
}

function handleVerifiedStripeEvent(event) {
  if (hasProcessedWebhookEvent(event.id)) {
    return { statusCode: 200, body: { received: true, duplicateIgnored: true } };
  }

  const dataObj = event.data.object || {};
  const tenantId = (dataObj.metadata && dataObj.metadata.tenantId) || "tenant_demo_free";

  if (event.type === "checkout.session.completed") {
    updateTenantSubscription(tenantId, {
      planId: "pro",
      subscriptionStatus: "active",
      stripeCustomerId: dataObj.customer || null,
    });
  } else if (event.type === "customer.subscription.updated") {
    const isActive = dataObj.status === "active" || dataObj.status === "trialing";
    updateTenantSubscription(tenantId, {
      planId: isActive ? "pro" : "free",
      subscriptionStatus: dataObj.status || "active",
      stripeCustomerId: dataObj.customer || null,
    });
  } else if (event.type === "customer.subscription.deleted") {
    updateTenantSubscription(tenantId, {
      planId: "free",
      subscriptionStatus: "canceled",
      stripeCustomerId: dataObj.customer || null,
    });
  }

  markWebhookEventProcessed(event.id);
  return { statusCode: 200, body: { received: true, duplicateIgnored: false, eventType: event.type } };
}

module.exports = {
  getStripeClient,
  createProCheckoutSession,
  handleVerifiedStripeEvent,
};