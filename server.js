/**
 * Hedera x402 Paid API Server
 *
 * A market data API where agents pay per query using HBAR on Hedera testnet.
 * Each payment settles on-chain via the x402 facilitator.
 *
 * Usage:
 *   HEDERA_PAYTO_ACCOUNT=0.0.xxxx PORT=3000 node server.js
 */

import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactHederaScheme } from "@x402/hedera/exact/server";

const PORT = process.env.PORT || 3000;
const PAYTO = process.env.HEDERA_PAYTO_ACCOUNT || "0.0.1234"; // Replace with your testnet account

// --- x402 Setup ---

// Use the public x402 facilitator (supports hedera:testnet)
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

// Register the Hedera exact payment scheme
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "hedera:*",
  new ExactHederaScheme({
    defaultAssets: {
      "hedera:testnet": { asset: "0.0.0", decimals: 8 }, // native HBAR
    },
  })
);

// --- App ---

const app = express();
app.use(express.json());

// Protected routes: agents pay per API call
app.use(
  paymentMiddleware(
    {
      "GET /api/market-data/:symbol": {
        accepts: {
          scheme: "exact",
          price: "100000", // 100,000 tinybars = 0.001 HBAR ≈ $0.0001
          network: "hedera:testnet",
          asset: "0.0.0", // HBAR
          payTo: PAYTO,
        },
        description: "Real-time market data for a trading symbol. Per-query pricing.",
      },
      "GET /api/portfolio/:address": {
        accepts: {
          scheme: "exact",
          price: "500000", // 500,000 tinybars = 0.005 HBAR
          network: "hedera:testnet",
          asset: "0.0.0",
          payTo: PAYTO,
        },
        description: "Portfolio analysis for an on-chain address. Per-query pricing.",
      },
    },
    resourceServer
  )
);

// --- Market Data Endpoint ---
// Returns mock market data (replace with real data source for production)
app.get("/api/market-data/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  // Simulated market data response
  const data = {
    symbol,
    price: (Math.random() * 50000 + 1000).toFixed(2),
    change24h: (Math.random() * 10 - 5).toFixed(2) + "%",
    volume24h: Math.floor(Math.random() * 1000000000),
    timestamp: new Date().toISOString(),
    source: "Hedera x402 Market Data API",
    settled: true,
    message: `Payment received for ${symbol} market data query`,
  };

  res.json(data);
});

// --- Portfolio Analysis Endpoint ---
app.get("/api/portfolio/:address", (req, res) => {
  const address = req.params.address;

  const analysis = {
    address,
    totalValue: (Math.random() * 100000).toFixed(2),
    tokens: [
      { symbol: "HBAR", balance: Math.floor(Math.random() * 100000), value: (Math.random() * 5000).toFixed(2) },
      { symbol: "USDC", balance: Math.floor(Math.random() * 50000), value: (Math.random() * 50000).toFixed(2) },
    ],
    riskScore: Math.floor(Math.random() * 100),
    lastUpdated: new Date().toISOString(),
    source: "Hedera x402 Portfolio Intelligence",
    settled: true,
  };

  res.json(analysis);
});

// --- Health Check (free) ---
app.get("/health", (req, res) => {
  res.json({ status: "ok", network: "hedera:testnet", x402: true });
});

app.listen(PORT, () => {
  console.log(`\n🟣 Hedera x402 Paid API Server`);
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log(`   Network: Hedera Testnet`);
  console.log(`   Asset: HBAR (0.0.0)`);
  console.log(`   Pay to: ${PAYTO}`);
  console.log(`   Facilitator: https://x402.org/facilitator`);
  console.log(`\n   Paid endpoints:`);
  console.log(`     GET /api/market-data/:symbol  → 0.001 HBAR/query`);
  console.log(`     GET /api/portfolio/:address   → 0.005 HBAR/query`);
  console.log(`     GET /health                   → FREE\n`);
});
