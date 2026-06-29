/**
 * ⚠️  SOLANA DEVNET ONLY — no real funds involved. ⚠️
 *
 * Solana Devnet x402 buyer test client for patientguide.io.
 *
 * Performs a complete Solana x402 payment flow against the Solana Devnet rail,
 * constructs a partially-signed SPL Token transfer via @x402/svm, and confirms
 * that the paid JSON body is returned.
 *
 * This script is Solana/SVM-specific. Do NOT reuse the EVM script
 * (scripts/test-x402-paid-request.mjs) for this flow — they are incompatible.
 *
 * ── PREREQUISITES ─────────────────────────────────────────────────────────────
 *
 *   The buyer keypair must be funded with:
 *     • Devnet SOL for transaction fees
 *     • Devnet USDC from Circle faucet for payment
 *       (faucet.circle.com → select "Solana Devnet")
 *
 *   The receiver ATA must already exist for:
 *     owner: DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS
 *     mint:  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
 *
 *   ATA creation does not require the receiver private key.
 *   A separate funded Devnet payer can create it:
 *
 *     solana config set --url devnet
 *     solana-keygen new --outfile /tmp/devnet-payer.json --no-bip39-passphrase
 *     solana airdrop 0.01 /tmp/devnet-payer.json --url devnet
 *
 *     spl-token create-account \
 *       4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
 *       --owner DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS \
 *       --url devnet \
 *       --fee-payer /tmp/devnet-payer.json
 *
 *     # Verify (expect a row with balance 0):
 *     spl-token accounts \
 *       --owner DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS \
 *       --url devnet
 *
 * ── REQUIRED ENV VARS ─────────────────────────────────────────────────────────
 *
 *   X402_SOLANA_BUYER_KEYPAIR_PATH
 *       Path to a Solana CLI JSON keypair file (output of `solana-keygen new`).
 *       Array of 64 integers. NEVER use a wallet with real funds you care about.
 *       NEVER commit this file. NEVER put the private key inline in .env.
 *
 *   X402_EXPECTED_SOLANA_NETWORK
 *       Abort before signing if 402 network differs.
 *       Must be: solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
 *
 *   X402_EXPECTED_SOLANA_MINT
 *       Abort before signing if 402 asset/mint differs.
 *       Must be: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
 *
 *   X402_EXPECTED_SOLANA_PAYTO
 *       Abort before signing if 402 payTo differs.
 *       Must be: DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS
 *
 *   X402_SOLANA_MAX_USDC
 *       Abort before signing if requested USDC exceeds this amount.
 *       Example: "0.01"
 *
 * ── OPTIONAL ENV VARS ─────────────────────────────────────────────────────────
 *
 *   X402_SOLANA_URL
 *       Override target URL. Default:
 *       https://patientguide.io/api/x402/solana/guide-brief?slug=hypertension
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *
 *   # Generate a buyer keypair and fund it:
 *   solana-keygen new --outfile /tmp/x402-buyer.json --no-bip39-passphrase
 *   solana airdrop 1 /tmp/x402-buyer.json --url devnet
 *   # Then fund with Devnet USDC from faucet.circle.com → Solana Devnet
 *
 *   # Set guards and run:
 *   export X402_SOLANA_BUYER_KEYPAIR_PATH=/tmp/x402-buyer.json
 *   export X402_EXPECTED_SOLANA_NETWORK=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
 *   export X402_EXPECTED_SOLANA_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
 *   export X402_EXPECTED_SOLANA_PAYTO=DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS
 *   export X402_SOLANA_MAX_USDC=0.01
 *
 *   node scripts/test-x402-solana-paid-request.mjs
 *
 * ── SECURITY RULES ────────────────────────────────────────────────────────────
 *   • Use a DISPOSABLE Devnet-only keypair. No real funds.
 *   • Set X402_SOLANA_BUYER_KEYPAIR_PATH to the FILE PATH only — never inline.
 *   • The script never prints private key material.
 *   • The receiver private key is NEVER needed and NEVER used here.
 *   • Keypair files must not be committed to git.
 *
 * ── PROTOCOL NOTES ────────────────────────────────────────────────────────────
 *   Uses @x402/svm ExactSvmSchemeV1 (x402 version 1, CAIP-2 network IDs).
 *   The X-PAYMENT header is base64(JSON.stringify(paymentPayload)).
 *   Payment is a partially-signed SPL Token TransferChecked transaction;
 *   the x402.org/facilitator completes signing and submits to Devnet.
 */

import { readFile } from "node:fs/promises";
import { ExactSvmSchemeV1 } from "@x402/svm/v1";
import { toClientSvmSigner } from "@x402/svm";
import { createKeyPairSignerFromBytes } from "@solana/kit";

// ── Config ─────────────────────────────────────────────────────────────────────

const KEYPAIR_PATH   = process.env.X402_SOLANA_BUYER_KEYPAIR_PATH;
const TARGET_URL     = process.env.X402_SOLANA_URL
  ?? "https://patientguide.io/api/x402/solana/guide-brief?slug=hypertension";
const EXP_NETWORK   = process.env.X402_EXPECTED_SOLANA_NETWORK ?? null;
const EXP_MINT      = process.env.X402_EXPECTED_SOLANA_MINT    ?? null;
const EXP_PAYTO     = process.env.X402_EXPECTED_SOLANA_PAYTO   ?? null;
const MAX_USDC_RAW  = process.env.X402_SOLANA_MAX_USDC         ?? null;

// ── Guard: require all safety env vars before doing anything ──────────────────

const missing = [];
if (!KEYPAIR_PATH)  missing.push("X402_SOLANA_BUYER_KEYPAIR_PATH");
if (!EXP_NETWORK)   missing.push("X402_EXPECTED_SOLANA_NETWORK");
if (!EXP_MINT)      missing.push("X402_EXPECTED_SOLANA_MINT");
if (!EXP_PAYTO)     missing.push("X402_EXPECTED_SOLANA_PAYTO");
if (!MAX_USDC_RAW)  missing.push("X402_SOLANA_MAX_USDC");

if (missing.length > 0) {
  console.error("ERROR: Missing required env vars — aborting.");
  console.error();
  for (const v of missing) console.error(`  ${v}`);
  console.error();
  console.error("  All five guard vars must be set before this script will run.");
  console.error("  Example:");
  console.error("    export X402_SOLANA_BUYER_KEYPAIR_PATH=/tmp/x402-buyer.json");
  console.error("    export X402_EXPECTED_SOLANA_NETWORK=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1");
  console.error("    export X402_EXPECTED_SOLANA_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  console.error("    export X402_EXPECTED_SOLANA_PAYTO=DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS");
  console.error("    export X402_SOLANA_MAX_USDC=0.01");
  process.exit(1);
}

// ── Parse MAX_USDC ────────────────────────────────────────────────────────────

const maxUsdcParsed = parseFloat(MAX_USDC_RAW);
if (isNaN(maxUsdcParsed) || maxUsdcParsed <= 0) {
  console.error(`ERROR: X402_SOLANA_MAX_USDC "${MAX_USDC_RAW}" is not a valid positive number.`);
  process.exit(1);
}
const maxAtomicUnits = BigInt(Math.round(maxUsdcParsed * 1_000_000));

// ── Load buyer keypair from file (never from inline env var) ──────────────────

let keypairSigner;
try {
  const raw = await readFile(KEYPAIR_PATH, "utf8");
  const secretKeyArray = JSON.parse(raw);
  if (!Array.isArray(secretKeyArray) || secretKeyArray.length !== 64) {
    console.error(`ERROR: Keypair file must be a JSON array of 64 integers (Solana CLI format).`);
    console.error(`       Got: ${JSON.stringify(secretKeyArray).slice(0, 80)}…`);
    process.exit(1);
  }
  const secretKeyBytes = Uint8Array.from(secretKeyArray);
  keypairSigner = await createKeyPairSignerFromBytes(secretKeyBytes);
} catch (err) {
  console.error(`ERROR: Could not load keypair from ${KEYPAIR_PATH}: ${err.message}`);
  process.exit(1);
}

const signer = toClientSvmSigner(keypairSigner);

// ── Header ─────────────────────────────────────────────────────────────────────

console.log("⚠️  PatientGuide x402 Solana Devnet buyer test — DEVNET ONLY ⚠️");
console.log("─".repeat(60));
console.log("Buyer address         :", keypairSigner.address);
console.log("Target URL            :", TARGET_URL);
console.log("Expected network      :", EXP_NETWORK);
console.log("Expected mint         :", EXP_MINT);
console.log("Expected payTo        :", EXP_PAYTO);
console.log("Max USDC              :", MAX_USDC_RAW);
console.log();

// ── Step 1: Probe — confirm 402 and parse payment requirements ─────────────────

console.log("Step 1: Probing endpoint for 402…");
let probe;
try {
  probe = await fetch(TARGET_URL);
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

const humanUsdc = (Number(req.maxAmountRequired) / 1_000_000).toFixed(6).replace(/\.?0+$/, "");

console.log("  x402Version          :", paymentBody.x402Version);
console.log("  network              :", req.network);
console.log("  asset (mint)         :", req.asset);
console.log("  payTo                :", req.payTo);
console.log("  maxAmountRequired    :", req.maxAmountRequired, `(${humanUsdc} USDC)`);
console.log("  resource             :", req.resource);
console.log("  extra.feePayer       :", req.extra?.feePayer ?? "(absent)");
console.log();

// ── Step 2: Pre-signing safety checks (abort before any signing) ───────────────

console.log("Step 2: Pre-signing safety checks…");

if (req.network !== EXP_NETWORK) {
  console.error(`ERROR: Network mismatch — aborting before signing.`);
  console.error(`       Expected : ${EXP_NETWORK}`);
  console.error(`       Got      : ${req.network}`);
  process.exit(1);
}

if (req.asset !== EXP_MINT) {
  console.error(`ERROR: Mint (asset) mismatch — aborting before signing.`);
  console.error(`       Expected : ${EXP_MINT}`);
  console.error(`       Got      : ${req.asset}`);
  process.exit(1);
}

if (req.payTo !== EXP_PAYTO) {
  console.error(`ERROR: payTo mismatch — aborting before signing.`);
  console.error(`       Expected : ${EXP_PAYTO}`);
  console.error(`       Got      : ${req.payTo}`);
  process.exit(1);
}

const requiredAtomic = BigInt(req.maxAmountRequired);
if (requiredAtomic > maxAtomicUnits) {
  console.error(`ERROR: Price exceeds X402_SOLANA_MAX_USDC — aborting before signing.`);
  console.error(`       Max allowed  : ${MAX_USDC_RAW} USDC (${maxAtomicUnits} atomic)`);
  console.error(`       Endpoint asks: ${humanUsdc} USDC (${req.maxAmountRequired} atomic)`);
  process.exit(1);
}

if (!req.extra?.feePayer) {
  console.error(`ERROR: 402 response is missing extra.feePayer — cannot build Solana transaction.`);
  console.error(`       The Solana Worker must be configured with X402_SOLANA_FEE_PAYER.`);
  process.exit(1);
}

console.log("  All checks passed.");
console.log();

// ── Step 3: Build Solana payment payload ─────────────────────────────────────
//
// x402Version 2 uses a different PaymentPayload structure than v1:
//   v1: { x402Version, scheme, network, payload }
//   v2: { x402Version, accepted: <PaymentRequirements>, payload }
//
// ExactSvmSchemeV1 produces v1 format; we re-wrap into v2 before encoding.
// The facilitator /supported endpoint registers Solana Devnet only under v2 with
// the CAIP-2 network id solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1.

console.log("Step 3: Building Solana payment payload (partially-signed tx)…");
const scheme = new ExactSvmSchemeV1(signer);

let paymentPayload;
try {
  const v1Payload = await scheme.createPaymentPayload(paymentBody.x402Version, req);
  // x402 v2 PaymentRequirements uses "amount" not "maxAmountRequired".
  // Map the 402 response fields (v1 names) to the v2 schema for the facilitator.
  const v2Accepted = {
    scheme: req.scheme,
    network: req.network,
    asset: req.asset,
    amount: req.maxAmountRequired,
    payTo: req.payTo,
    maxTimeoutSeconds: req.maxTimeoutSeconds,
    extra: req.extra ?? {},
  };
  // Wrap as x402 v2 PaymentPayload: { x402Version, accepted, payload }.
  paymentPayload = {
    x402Version: v1Payload.x402Version,
    accepted: v2Accepted,
    payload: v1Payload.payload,
  };
} catch (err) {
  console.error("ERROR: Failed to build Solana payment payload:", err.message);
  console.error();
  console.error("  Common causes:");
  console.error("    • Buyer ATA does not exist — fund buyer with Devnet USDC first");
  console.error("    • Receiver ATA does not exist — create it with spl-token create-account");
  console.error("    • Devnet RPC is unreachable");
  process.exit(1);
}

console.log("  Transaction built and partially signed.");
console.log("  Payload scheme       :", paymentPayload.accepted?.scheme);
console.log("  Payload network      :", paymentPayload.accepted?.network);
console.log("  Tx (first 40 chars)  :", paymentPayload.payload?.transaction?.slice(0, 40) + "…");
console.log();

// ── Step 4: Encode X-PAYMENT header ──────────────────────────────────────────

const xPaymentHeader = Buffer.from(JSON.stringify(paymentPayload), "utf8").toString("base64");

// ── Step 5: Send paid request ─────────────────────────────────────────────────

console.log("Step 4: Sending paid request with X-PAYMENT header…");
let paidResponse;
try {
  paidResponse = await fetch(TARGET_URL, {
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
console.log("─".repeat(60));
console.log("HTTP Status            :", paidResponse.status);

const xPaymentResponse = paidResponse.headers.get("x-payment-response");
if (xPaymentResponse) {
  console.log("X-PAYMENT-RESPONSE     :", xPaymentResponse);
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

console.log("Paid JSON returned     : YES");
if (data.title) console.log("title                  :", data.title);
if (data.slug)  console.log("slug                   :", data.slug);
console.log();
console.log("x402 Solana Devnet end-to-end test PASSED.");
