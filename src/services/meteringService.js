const crypto = require("crypto");
const { PRICING_MICRO_CENTS } = require("../config/plans");
const {
  getTenant,
  getTenantPlan,
  getIdempotentResponse,
  saveIdempotentResponse,
  addUsageEvent,
  getTenantUsageEvents,
} = require("../store/memoryStore");

function computeTotalTokens(tokenBreakdown) {
  const input = tokenBreakdown.inputTokens || 0;
  const cachedInput = tokenBreakdown.cachedInputTokens || 0;
  const output = tokenBreakdown.outputTokens || 0;
  const reasoning = tokenBreakdown.reasoningTokens || 0;

  // Reasoning tokens count as output tokens; categories are never blindly summed for billing.
  const billableOutputTokens = output + reasoning;
  const totalTokens = input + cachedInput + billableOutputTokens;

  const costMicroCents =
    Math.round((input / 1000) * PRICING_MICRO_CENTS.inputTokenPer1k) +
    Math.round((cachedInput / 1000) * PRICING_MICRO_CENTS.cachedInputTokenPer1k) +
    Math.round((billableOutputTokens / 1000) * PRICING_MICRO_CENTS.outputTokenPer1k);

  return { totalTokens, costMicroCents };
}

function getUsageRollup(tenantId) {
  const tenant = getTenant(tenantId);
  if (!tenant) {
    return null;
  }

  const plan = getTenantPlan(tenant);
  const events = getTenantUsageEvents(tenantId);

  let usedApiCalls = 0;
  let usedTokens = 0;
  let tokenCostMicroCents = 0;

  for (const ev of events) {
    usedApiCalls += ev.apiCalls;
    usedTokens += ev.tokens.totalTokens;
    tokenCostMicroCents += ev.tokens.costMicroCents;
  }

  const apiCallCostMicroCents = usedApiCalls * PRICING_MICRO_CENTS.apiCallPerRequest;
  const totalCostMicroCents = apiCallCostMicroCents + tokenCostMicroCents;

  return {
    tenantId: tenant.id,
    plan: plan.id,
    subscriptionStatus: tenant.subscriptionStatus,
    usage: {
      apiCalls: {
        used: usedApiCalls,
        limit: plan.monthlyApiCallsLimit,
      },
      tokens: {
        used: usedTokens,
        limit: plan.monthlyTokensLimit,
      },
    },
    cost: {
      microCents: totalCostMicroCents,
      centsInteger: Math.floor(totalCostMicroCents / 1000000),
    },
  };
}

function recordBillableGeneration({ tenantId, idempotencyKey, tokenBreakdown }) {
  const cached = getIdempotentResponse(tenantId, idempotencyKey);
  if (cached) {
    return { statusCode: 200, body: { ...cached, idempotentReplay: true } };
  }

  const tenant = getTenant(tenantId);
  if (!tenant) {
    return { statusCode: 404, body: { error: "Tenant not found" } };
  }

  if (tenant.subscriptionStatus !== "active") {
    return {
      statusCode: 402,
      body: {
        error: "Payment Required",
        reason: "Subscription is not active. Upgrade or renew plan to continue.",
      },
    };
  }

  const plan = getTenantPlan(tenant);
  const currentRollup = getUsageRollup(tenantId);
  const { totalTokens, costMicroCents } = computeTotalTokens(tokenBreakdown);
  const requestedApiCalls = 1;

  const projectedApiCalls = currentRollup.usage.apiCalls.used + requestedApiCalls;
  const projectedTokens = currentRollup.usage.tokens.used + totalTokens;

  if (projectedApiCalls > plan.monthlyApiCallsLimit) {
    return {
      statusCode: 429,
      body: {
        error: "Too Many Requests",
        reason: `Monthly API call quota exceeded (${currentRollup.usage.apiCalls.used}/${plan.monthlyApiCallsLimit} used).`,
        retryAfterSeconds: 3600,
      },
    };
  }

  if (projectedTokens > plan.monthlyTokensLimit) {
    return {
      statusCode: 429,
      body: {
        error: "Too Many Requests",
        reason: `Monthly AI token quota exceeded (${currentRollup.usage.tokens.used}/${plan.monthlyTokensLimit} used).`,
        retryAfterSeconds: 3600,
      },
    };
  }

  const event = addUsageEvent({
    id: `evt_${crypto.randomUUID()}`,
    tenantId,
    idempotencyKey,
    apiCalls: requestedApiCalls,
    tokens: {
      inputTokens: tokenBreakdown.inputTokens || 0,
      cachedInputTokens: tokenBreakdown.cachedInputTokens || 0,
      outputTokens: tokenBreakdown.outputTokens || 0,
      reasoningTokens: tokenBreakdown.reasoningTokens || 0,
      totalTokens,
      costMicroCents,
    },
    createdAt: new Date().toISOString(),
  });

  const responseBody = {
    status: "accepted",
    eventId: event.id,
    tenantId,
    tokensRecorded: totalTokens,
    eventCostMicroCents: costMicroCents + PRICING_MICRO_CENTS.apiCallPerRequest,
    idempotentReplay: false,
  };

  saveIdempotentResponse(tenantId, idempotencyKey, responseBody);
  return { statusCode: 202, body: responseBody };
}

module.exports = {
  recordBillableGeneration,
  getUsageRollup,
};