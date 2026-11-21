const { PLANS } = require("../config/plans");

const store = {
  tenants: new Map([
    [
      "tenant_demo_free",
      {
        id: "tenant_demo_free",
        name: "Demo Free Tenant",
        planId: "free",
        subscriptionStatus: "active",
        stripeCustomerId: null,
      },
    ],
    [
      "tenant_demo_pro",
      {
        id: "tenant_demo_pro",
        name: "Demo Pro Tenant",
        planId: "pro",
        subscriptionStatus: "active",
        stripeCustomerId: null,
      },
    ],
  ]),
  usageEvents: [],
  idempotencyMap: new Map(),
  processedWebhookEvents: new Set(),
};

function getTenant(tenantId) {
  return store.tenants.get(tenantId) || null;
}

function updateTenantSubscription(tenantId, { planId, subscriptionStatus, stripeCustomerId }) {
  const tenant = store.tenants.get(tenantId);
  if (!tenant) return null;

  if (planId) tenant.planId = planId;
  if (subscriptionStatus) tenant.subscriptionStatus = subscriptionStatus;
  if (stripeCustomerId) tenant.stripeCustomerId = stripeCustomerId;

  store.tenants.set(tenantId, tenant);
  return tenant;
}

function getTenantPlan(tenant) {
  return PLANS[tenant.planId] || PLANS.free;
}

function getIdempotentResponse(tenantId, key) {
  return store.idempotencyMap.get(`${tenantId}:${key}`) || null;
}

function saveIdempotentResponse(tenantId, key, payload) {
  store.idempotencyMap.set(`${tenantId}:${key}`, payload);
}

function addUsageEvent(event) {
  store.usageEvents.push(event);
  return event;
}

function getTenantUsageEvents(tenantId) {
  return store.usageEvents.filter((e) => e.tenantId === tenantId);
}

function hasProcessedWebhookEvent(eventId) {
  return store.processedWebhookEvents.has(eventId);
}

function markWebhookEventProcessed(eventId) {
  store.processedWebhookEvents.add(eventId);
}

module.exports = {
  store,
  getTenant,
  updateTenantSubscription,
  getTenantPlan,
  getIdempotentResponse,
  saveIdempotentResponse,
  addUsageEvent,
  getTenantUsageEvents,
  hasProcessedWebhookEvent,
  markWebhookEventProcessed,
};