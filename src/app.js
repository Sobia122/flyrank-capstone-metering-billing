const express = require("express");
const billingRoutes = require("./routes/billingRoutes");
const stripeRoutes = require("./routes/stripeRoutes");

const app = express();

// Mount webhook route BEFORE express.json() so raw body stays intact for signature verification
app.use("/", stripeRoutes);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/", billingRoutes);

module.exports = app;