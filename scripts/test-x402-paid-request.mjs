/**
 * Local-only x402 buyer test client — works for both Base Sepolia testnet and Base mainnet.
 *
 * Performs a real x402 payment flow (EIP-3009 off-chain signing) against any x402
 * endpoint and confirms that the paid JSON body is returned.
 *
 * ── REQUIRED ──────────────────────────────────────────────────────────────────
 *   BUYER_PRIVATE_KEY       0x-prefixed private key of a DISPOSABLE buyer wallet.
 *                           For mainnet: fund with small Base ETH + Base USDC.
 *                           For testnet: fund with Base Sepolia ETH + test USDC.
 *                           NEVER use a wallet that holds real funds you care about.
 *                           NEVER commit this key. NEVER put it in a .env file.
 *
 * ── OPTIONAL ──────────────────────────────────────────────────────────────────
 *   X402_TEST_URL           Target URL. Default:
 *                           https://patientguide.io/api/x402/guide-brief?slug=hypertension
 *
 *   X402_EXPECTED_NETWORK   Expected CAIP-2 network from the 402 response.
 *                           If set and the endpoint returns a different network,
 *                           the script aborts before signing. Example:
 *                             testnet: eip155:84532
 *                             mainnet: eip155:8453
 *
 *   X402_EXPECTED_PAYTO     Expected payTo address from the 402 response.
 *                           Aborts before signing if the endpoint returns a
 *                           different address.
 *
 *   X402_EXPECTED_ASSET     Expected asset (USDC contract) address from the 402.
 *                           Aborts before signing if the endpoint returns a
 *                           different asset.
 *
 *   X402_MAX_USDC           Maximum USDC amount you are willing to pay (decimal).
 *                           Aborts before signing if the endpoint asks for more.
 *                           Example: "0.001" or "0.01"
 *                           Strongly recommended for mainnet runs.
 *
 * ── SECURITY RULES ────────────────────────────────────────────────────────────
 *   • Use a DISPOSABLE wallet. Never reuse a wallet with real funds.
 *   • Set BUYER_PRIVATE_KEY only in your local shell:
 *       export BUYER_PRIVATE_KEY=0x...
 *       node scripts/test-x402-paid-request.mjs
 *   • The script never prints the private key.
 *   • For mainnet: real USDC is spent on settlement.
 *   • For mainnet: set X402_EXPECTED_NETWORK, X402_EXPECTED_PAYTO,
 *     X402_EXPECTED_ASSET, and X402_MAX_USDC to protect against
 *     endpoint misconfiguration before any signing happens.
 *
 * ── PROTOCOL NOTES ────────────────────────────────────────────────────────────
 *   The Worker uses x402Version=2 with CAIP-2 network IDs.
 *   X-PAYMENT = base64(JSON.stringify(paymentPayload))
 *   Payment signing is EIP-712 TransferWithAuthorization (EIP-3009).
 *   No on-chain transaction from the buyer — the x402.org facilitator settles.
 */

import { privateKeyToAccount } from "viem/accounts";
import { toHex } from "viem";
import { randomBytes } from "node:crypto";

// ── Config ─────────────────────────────────────────────────────────────────────

const BUYER_PRIVATE_KEY     = process.env.BUYER_PRIVATE_KEY;
const X402_TEST_URL         = process.env.X402_TEST_URL
  ?? "https://patientguide.io/api/x402/guide-brief?slug=hypertension";
const EXPECTED_NETWORK      = process.env.X402_EXPECTED_NETWORK  ?? null;
const EXPECTED_PAYTO        = process.env.X402_EXPECTED_PAYTO    ?? null;
const EXPECTED_ASSET        = process.env.X402_EXPECTED_ASSET    ?? null;
const MAX_USDC_RAW          = process.env.X402_MAX_USDC          ?? null;

// ── Validate BUYER_PRIVATE_KEY ─────────────────────────────────────────────────

if (!BUYER_PRIVATE_KEY) {
  console.error("ERROR: BUYER_PRIVATE_KEY env var is required.");
  console.error();
  console.error("  Use a DISPOSABLE wallet. Never use a real-funds wallet.");
  console.error("  Set it only in your local shell:");
  console.error("    export BUYER_PRIVATE_KEY=0x...");
  console.error("    node scripts/test-x402-paid-request.mjs");
  console.error();
  console.error("  Testnet faucets:");
  console.error("    Base Sepolia ETH  : coinbase.com/faucets/base-ethereum-goerli-faucet");
  console.error("    Base Sepolia USDC : faucet.circle.com  →  select Base Sepolia");
  console.error();
  console.error("  Mainnet (real funds — micro-test only):");
  console.error("    Fund buyer wallet with small Base ETH + small Base USDC.");
  console.error("    Receiver needs no funding — it only receives the payment.");
  process.exit(1);
}

// ── Derive buyer address (never print the key) ─────────────────────────────────

const account = privateKeyToAccount(/** @type {`0x${string}`} */ (BUYER_PRIVATE_KEY));

// ── Parse X402_MAX_USDC ────────────────────────────────────────────────────────

let maxAtomicUnits = null;
if (MAX_USDC_RAW !== null) {
  const parsed = parseFloat(MAX_USDC_RAW);
  if (isNaN(parsed) || parsed <= 0) {
    console.error(`ERROR: X402_MAX_USDC "${MAX_USDC_RAW}" is not a valid positive number.`);
    process.exit(1);
  }
  maxAtomicUnits = BigInt(Math.round(parsed * 1_000_000));
}

// ── Header ─────────────────────────────────────────────────────────────────────

console.log("PatientGuide x402 buyer test");
console.log("─".repeat(55));
console.log("Buyer address    :", account.address);
console.log("Target URL       :", X402_TEST_URL);
if (EXPECTED_NETWORK) console.log("Expected network :", EXPECTED_NETWORK);
if (EXPECTED_PAYTO)   console.log("Expected payTo   :", EXPECTED_PAYTO);
if (EXPECTED_ASSET)   console.log("Expected asset   :", EXPECTED_ASSET);
if (MAX_USDC_RAW)     console.log("Max USDC         :", MAX_USDC_RAW);
console.log();

// ── Step 1: Probe — confirm 402 and parse payment requirements ─────────────────

console.log("Step 1: Probing endpoint for 402…");
let probe;
try {
  probe = await fetch(X402_TEST_URL);
} catch (err) {
  console.error("ERROR: Could not reach endpoint:", err.message);
  process.exit(1);
}

if (probe.status !== 402) {
  console.error(`ERROR: Expected HTTP 402 but got ${probe.status}.`);
  const body = await probe.text().catch(() => "(unreadable)");
  console.error("       Body:", body);
  process.exit(1);
}

let paymentBody;
try {
  paymentBody = await probe.json();
} catch {
  console.error("ERROR: 402 response body is not valid JSON.");
  process.exit(1);
}

const req = paymentBody.accepts?.[0];
if (!req) {
  console.error("ERROR: 402 body has no accepts array.");
  console.error("       Body:", JSON.stringify(paymentBody));
  process.exit(1);
}

// Human-readable USDC amount (atomic units ÷ 1,000,000)
const humanUsdc = (Number(req.maxAmountRequired) / 1_000_000).toFixed(6).replace(/\.?0+$/, "");

console.log("  x402Version       :", paymentBody.x402Version);
console.log("  network           :", req.network);
console.log("  payTo             :", req.payTo);
console.log("  asset             :", req.asset);
console.log("  maxAmountRequired :", req.maxAmountRequired, `(${humanUsdc} USDC)`);
console.log("  resource          :", req.resource);
console.log();

// ── Step 2: Pre-signing safety checks (abort before any signing) ───────────────

console.log("Step 2: Pre-signing safety checks…");

// Network check
if (EXPECTED_NETWORK && req.network !== EXPECTED_NETWORK) {
  console.error(`ERROR: Network mismatch — aborting before signing.`);
  console.error(`       Expected : ${EXPECTED_NETWORK}`);
  console.error(`       Got      : ${req.network}`);
  process.exit(1);
}

// payTo check
if (EXPECTED_PAYTO) {
  const normalise = (a) => a.toLowerCase();
  if (normalise(req.payTo) !== normalise(EXPECTED_PAYTO)) {
    console.error(`ERROR: payTo mismatch — aborting before signing.`);
    console.error(`       Expected : ${EXPECTED_PAYTO}`);
    console.error(`       Got      : ${req.payTo}`);
    process.exit(1);
  }
}

// Asset check
if (EXPECTED_ASSET) {
  const normalise = (a) => a.toLowerCase();
  if (normalise(req.asset) !== normalise(EXPECTED_ASSET)) {
    console.error(`ERROR: Asset mismatch — aborting before signing.`);
    console.error(`       Expected : ${EXPECTED_ASSET}`);
    console.error(`       Got      : ${req.asset}`);
    process.exit(1);
  }
}

// Price cap check
if (maxAtomicUnits !== null) {
  const required = BigInt(req.maxAmountRequired);
  if (required > maxAtomicUnits) {
    console.error(`ERROR: Price exceeds X402_MAX_USDC — aborting before signing.`);
    console.error(`       Max allowed : ${MAX_USDC_RAW} USDC (${maxAtomicUnits} atomic)`);
    console.error(`       Endpoint asks: ${humanUsdc} USDC (${req.maxAmountRequired} atomic)`);
    process.exit(1);
  }
}

// Derive chainId from CAIP-2 network identifier ("eip155:84532" → 84532)
const chainId = parseInt(req.network.split(":")[1] ?? "", 10);
if (isNaN(chainId)) {
  console.error(`ERROR: Cannot parse chainId from network "${req.network}".`);
  process.exit(1);
}

console.log("  All checks passed.");
console.log();

// ── Step 3: Sign EIP-712 TransferWithAuthorization ────────────────────────────

console.log("Step 3: Signing EIP-712 TransferWithAuthorization…");

// Random 32-byte nonce as 0x-prefixed hex (bytes32)
const nonce = toHex(randomBytes(32));
const now = Math.floor(Date.now() / 1000);
const validAfter  = "0";                       // x402 v2: validAfter must be 0 (valid from epoch)
const validBefore = (now + Number(req.maxTimeoutSeconds)).toString();

const signature = await account.signTypedData({
  domain: {
    name:              req.extra.name,       // "USDC"
    version:           req.extra.version,    // "2"
    chainId,
    verifyingContract: /** @type {`0x${string}`} */ (req.asset),
  },
  types: {
    TransferWithAuthorization: [
      { name: "from",        type: "address" },
      { name: "to",          type: "address" },
      { name: "value",       type: "uint256" },
      { name: "validAfter",  type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce",       type: "bytes32" },
    ],
  },
  primaryType: "TransferWithAuthorization",
  message: {
    from:        account.address,
    to:          /** @type {`0x${string}`} */ (req.payTo),
    value:       BigInt(req.maxAmountRequired),
    validAfter:  BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce,
  },
});

console.log("  Signature :", signature.slice(0, 22) + "…");
console.log();

// ── Step 4: Encode x402 v2 payment payload ────────────────────────────────────
// v2 shape: { x402Version, accepted, payload }
// "accepted" mirrors the server's PaymentRequirements (scheme/network/asset/amount/etc).
// "amount" is the v2 field name for what the 402 body calls "maxAmountRequired".
// "payload" carries the EIP-3009 authorization + signature.

const paymentPayload = {
  x402Version: 2,
  accepted: {
    scheme:            req.scheme,
    network:           req.network,
    asset:             req.asset,
    amount:            req.maxAmountRequired,  // v2 field name
    payTo:             req.payTo,
    maxTimeoutSeconds: req.maxTimeoutSeconds,
    extra:             req.extra,
  },
  payload: {
    authorization: {
      from:        account.address,
      to:          req.payTo,
      value:       req.maxAmountRequired,
      validAfter,
      validBefore,
      nonce,
    },
    signature,
  },
};

// X-PAYMENT = base64(JSON.stringify(payload))  — x402 v2 spec
const xPaymentHeader = Buffer.from(JSON.stringify(paymentPayload), "utf8").toString("base64");

// ── Step 5: Paid request ───────────────────────────────────────────────────────

console.log("Step 4: Sending paid request with X-PAYMENT header…");
let paidResponse;
try {
  paidResponse = await fetch(X402_TEST_URL, {
    headers: {
      "X-PAYMENT": xPaymentHeader,
      "Accept":    "application/json",
    },
  });
} catch (err) {
  console.error("ERROR: Could not reach endpoint for paid request:", err.message);
  process.exit(1);
}

// ── Result ─────────────────────────────────────────────────────────────────────

console.log();
console.log("─".repeat(55));
console.log("HTTP Status         :", paidResponse.status);

const xPaymentResponse = paidResponse.headers.get("x-payment-response");
if (xPaymentResponse) {
  console.log("X-PAYMENT-RESPONSE  :", xPaymentResponse);
}

if (!paidResponse.ok) {
  const errBody = await paidResponse.text().catch(() => "(unreadable)");
  console.error();
  console.error("ERROR: Did not receive paid JSON response.");
  console.error("       Body:", errBody);
  process.exit(1);
}

let data;
try {
  data = await paidResponse.json();
} catch {
  console.error("ERROR: Paid response body is not valid JSON.");
  process.exit(1);
}

console.log("Paid JSON returned  : YES");
if (data.title) console.log("title               :", data.title);
if (data.slug)  console.log("slug                :", data.slug);
console.log();
console.log("x402 end-to-end test PASSED.");
