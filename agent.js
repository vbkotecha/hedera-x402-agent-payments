/**
 * Hedera x402 Paying Agent
 *
 * An autonomous AI agent that pays for API queries using HBAR on Hedera testnet.
 * Demonstrates the full x402 payment flow:
 *   1. Agent requests data from a paid API
 *   2. API returns 402 Payment Required with payment instructions
 *   3. Agent signs a payment authorization with its Hedera key
 *   4. x402 facilitator verifies and settles on-chain
 *   5. Agent retries with the payment header and receives data
 *   6. Transaction visible on HashScan
 *
 * Usage:
 *   HEDERA_ACCOUNT_ID=0.0.xxxx \
 *   HEDERA_PRIVATE_KEY=0x... \
 *   API_BASE_URL=http://localhost:3000 \
 *   node agent.js
 */

import { x402Client } from "@x402/core/client";
import { createClientHederaSigner } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { PrivateKey } from "@x402/hedera";

const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
const PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY;
const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

if (!ACCOUNT_ID || !PRIVATE_KEY) {
  console.error("Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY environment variables.");
  console.error("Get testnet credentials at https://portal.hedera.com/");
  process.exit(1);
}

// --- x402 Client Setup ---

// Create the Hedera signer with the agent's testnet credentials
const signer = createClientHederaSigner(ACCOUNT_ID, PrivateKey.fromStringECDSA(PRIVATE_KEY), {
  network: "hedera:testnet",
});

// Register the Hedera exact payment scheme
const client = new x402Client().register("hedera:*", new ExactHederaScheme(signer));

// --- Agent Logic ---

async function buyMarketData(symbol) {
  console.log(`\n🤖 Agent: Requesting market data for ${symbol}...`);

  const url = `${API_BASE}/api/market-data/${symbol}`;

  try {
    // Step 1: Initial request (will get 402)
    console.log(`   → GET ${url}`);
    let response = await fetch(url);

    if (response.status === 402) {
      console.log(`   ← 402 Payment Required`);

      // Step 2: Parse payment requirements
      const paymentRequirements = await response.headers;
      const body = await response.json();

      console.log(`   💰 Payment required:`);
      console.log(`      Network: ${body.accepts?.network || "hedera:testnet"}`);
      console.log(`      Asset: ${body.accepts?.asset || "0.0.0 (HBAR)"}`);
      console.log(`      Amount: ${body.accepts?.price} tinybars`);

      // Step 3: Sign payment and retry
      console.log(`   🔑 Signing payment with Hedera key...`);
      const paymentHeader = await client.createPaymentHeader(url, "GET", body.accepts);

      console.log(`   → Retrying with payment header...`);
      response = await fetch(url, {
        headers: { "X-PAYMENT": paymentHeader },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Payment settled! Data received:`);
        console.log(`      ${data.symbol}: $${data.price} (${data.change24h})`);
        console.log(`      Volume: $${data.volume24h.toLocaleString()}`);
        console.log(`      Timestamp: ${data.timestamp}`);

        // Check for payment receipt
        const receipt = response.headers.get("X-PAYMENT-RECEIPT");
        if (receipt) {
          console.log(`\n   📄 Payment Receipt: ${receipt.substring(0, 80)}...`);
          console.log(`   🔗 View on HashScan for on-chain proof`);
        }

        return data;
      } else {
        console.error(`   ❌ Payment failed: ${response.status}`);
        const errBody = await response.text();
        console.error(`   ${errBody}`);
      }
    } else if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Free access granted (no payment needed)`);
      console.log(`      ${data.symbol}: $${data.price}`);
      return data;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function buyPortfolioAnalysis(address) {
  console.log(`\n🤖 Agent: Requesting portfolio analysis for ${address}...`);

  const url = `${API_BASE}/api/portfolio/${address}`;

  try {
    let response = await fetch(url);

    if (response.status === 402) {
      console.log(`   ← 402 Payment Required`);
      const body = await response.json();

      console.log(`   💰 Payment: ${body.accepts?.price} tinybars`);

      const paymentHeader = await client.createPaymentHeader(url, "GET", body.accepts);
      response = await fetch(url, {
        headers: { "X-PAYMENT": paymentHeader },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Payment settled! Portfolio data:`);
        console.log(`      Total Value: $${data.totalValue}`);
        console.log(`      Risk Score: ${data.riskScore}/100`);
        data.tokens.forEach((t) => {
          console.log(`      ${t.symbol}: ${t.balance} ($${t.value})`);
        });
        return data;
      }
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

// --- Run Demo ---

async function main() {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  Hedera x402 Autonomous Payment Agent   ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`   Account: ${ACCOUNT_ID}`);
  console.log(`   Network: Hedera Testnet`);
  console.log(`   API: ${API_BASE}`);
  console.log(`   Asset: HBAR (0.0.0)`);

  // Demo 1: Buy market data for BTC
  await buyMarketData("BTC");

  // Demo 2: Buy market data for ETH
  await buyMarketData("ETH");

  // Demo 3: Buy portfolio analysis
  await buyPortfolioAnalysis("0.0.12345");

  console.log(`\n✅ Demo complete. Check HashScan for on-chain transactions:`);
  console.log(`   https://hashscan.io/testnet`);
  console.log(`   Filter by account: ${ACCOUNT_ID}\n`);
}

main().catch(console.error);
