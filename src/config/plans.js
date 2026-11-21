const PLANS = {
  free: {
    id: "free",
    name: "Free",
    monthlyApiCallsLimit: 1000,
    monthlyTokensLimit: 100000,
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyApiCallsLimit: 50000,
    monthlyTokensLimit: 5000000,
  },
};

// All monetary rates stored as integer micro-cents (1 cent = 1,000,000 micro-cents)
// to avoid floating-point rounding errors.
const PRICING_MICRO_CENTS = {
  apiCallPerRequest: 10, // 0.00001 cents per API call
  inputTokenPer1k: 150, // base input rate per 1k tokens
  cachedInputTokenPer1k: 30, // cheaper cached input rate per 1k tokens
  outputTokenPer1k: 600, // output rate per 1k tokens (reasoning tokens use this rate)
};

module.exports = { PLANS, PRICING_MICRO_CENTS };