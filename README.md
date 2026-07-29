# Hedera x402 Agent Payments

Autonomous agent-to-API payments on Hedera using the x402 standard. AI agents pay per API query in HBAR, settled on-chain in seconds at $0.0001 per transfer.

Built for the [Hedera x402 Bounty](https://hedera.com/x402-bounty/).

## How It Works

```
Agent (payer)                    API Server (payee)              x402 Facilitator
    │                                  │                               │
    │── GET /api/market-data/BTC ─────→│                               │
    │                                  │                               │
    │←── 402 Payment Required ─────────│                               │
    │    (price, network, asset)       │                               │
    │                                  │                               │
    │── Sign HBAR transfer ──→ (agent signs with Hedera key)         │
    │                                  │                               │
    │── GET /api/market-data/BTC ─────→│── verify payment ───────────→│
    │    X-PAYMENT: <signed payload>   │                               │
    │                                  │←── settle on-chain ──────────│
    │                                  │    (HBAR transfer on Hedera)  │
    │                                  │                               │
    │←── 200 OK + market data ─────────│                               │
    │    X-PAYMENT-RECEIPT: <receipt>  │                               │
    │                                  │                               │
    │                                  │  Transaction visible on HashScan
```

1. **Agent requests data** from a paid API endpoint
2. **Server returns 402** with payment requirements (price in HBAR, network, asset)
3. **Agent signs payment** using its Hedera testnet private key
4. **Facilitator verifies and settles** — HBAR transferred on-chain
5. **Server returns data** with a payment receipt
6. **Proof on HashScan** — every payment is an on-chain transaction

## Why Hedera for Agent Payments

| Feature | Hedera | Ethereum L2 |
|---------|--------|-------------|
| Transfer fee | **$0.0001** (HBAR) | $0.001–$0.50 (USDC) |
| Settlement | **3–5 seconds** | 2–7 seconds |
| Fee predictability | **Fixed** | Variable (gas) |
| Throughput | **10,000+ TPS** | ~100–1000 TPS |

Hedera's fixed $0.0001 HBAR transfer fee makes per-query micropayments viable down to fractions of a cent — the key requirement for autonomous agent commerce.

## Quick Start

### Prerequisites

1. **Hedera Testnet Account** — Create one at [portal.hedera.com](https://portal.hedera.com/)
   - Sign up → Create testnet account → Get testnet HBAR (free)
   - Save your **Account ID** (e.g., `0.0.1234567`) and **ECDSA Private Key** (starts with `0x...`)

2. **Node.js 18+**

### Install

```bash
npm install
```

### Run the Server

```bash
# Set the payee account (where payments go)
export HEDERA_PAYTO_ACCOUNT=0.0.1234567

# Start the server
npm run server
```

### Run the Agent

```bash
# Set the payer account (the agent's wallet)
export HEDERA_ACCOUNT_ID=0.0.7654321
export HEDERA_PRIVATE_KEY=0xabc123...

# Point to the API server
export API_BASE_URL=http://localhost:3000

# Run the agent
npm run agent
```

The agent will:
1. Request market data for BTC → Pay 0.001 HBAR → Get data
2. Request market data for ETH → Pay 0.001 HBAR → Get data
3. Request portfolio analysis → Pay 0.005 HBAR → Get analysis

### Verify on HashScan

After running the agent, check the on-chain transactions:
- Go to [hashscan.io/testnet](https://hashscan.io/testnet)
- Search for your payer account ID
- You'll see HBAR transfers to the payee account

## API Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /api/market-data/:symbol` | 0.001 HBAR | Real-time market data per symbol |
| `GET /api/portfolio/:address` | 0.005 HBAR | Portfolio analysis per address |
| `GET /health` | FREE | Health check |

## Architecture

```
hedera-x402-agent-payments/
├── server.js          # Express server with x402 payment middleware
├── agent.js           # Autonomous agent that pays for API queries
├── package.json
└── README.md
```

### Server (`server.js`)

Uses `@x402/express` middleware with the `ExactHederaScheme` from `@x402/hedera`:
- Registers Hedera testnet with native HBAR (`asset: "0.0.0"`)
- Uses the public x402 facilitator at `https://x402.org/facilitator`
- Each endpoint has its own price in tinybars

### Agent (`agent.js`)

Uses `@x402/core` client with a Hedera signer:
- Creates payment headers signed with the agent's Hedera ECDSA key
- Automatically handles the 402 → sign → retry → receive flow
- Prints payment receipts and HashScan references

## Use Cases

- **Portfolio agents** that buy market data per query instead of flat subscriptions
- **DeFi agents** that pay for real-time price feeds on demand
- **Research agents** that pay-per-read for premium content
- **Any autonomous system** that needs to pay for API access without API keys or subscriptions

## x402 Standard

x402 repurposes the HTTP 402 Payment Required status code into a working payment standard. No API keys, no subscriptions, no accounts — just signed crypto payments over HTTP.

- **Open source**: Apache-2.0, maintained by the [x402 Foundation](https://github.com/x402-foundation/x402)
- **Multi-chain**: Supports EVM, Solana, Hedera, Algorand, Stellar, Aptos, and more
- **Facilitator model**: A facilitator verifies signatures and settles on-chain

## License

MIT
