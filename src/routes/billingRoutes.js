const express = require("express");
const { recordBillableGeneration, getUsageRollup } = require("../services/meteringService");

const router = express.Router();

router.post("/generate", (req, res) => {
  const idempotencyKey = req.header("Idempotency-Key");
  const {
    tenantId,
    inputTokens = 0,
    cachedInputTokens = 0,
    outputTokens = 0,
    reasoningTokens = 0,
  } = req.body || {};

  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return res.status(400).json({ error: "Idempotency-Key header is required" });
  }

  if (!tenantId || typeof tenantId !== "string") {
    return res.status(400).json({ error: "tenantId is required" });
  }

  const numericFields = { inputTokens, cachedInputTokens, outputTokens, reasoningTokens };
  for (const [field, value] of Object.entries(numericFields)) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      return res.status(400).json({ error: `${field} must be a non-negative integer` });
    }
  }

  const outcome = recordBillableGeneration({
    tenantId,
    idempotencyKey,
    tokenBreakdown: {
      inputTokens,
      cachedInputTokens,
      outputTokens,
      reasoningTokens,
    },
  });

  return res.status(outcome.statusCode).json(outcome.body);
});

router.get("/usage", (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId || typeof tenantId !== "string") {
    return res.status(400).json({ error: "tenantId query parameter is required" });
  }

  const rollup = getUsageRollup(tenantId);
  if (!rollup) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  return res.status(200).json(rollup);
});

module.exports = router;