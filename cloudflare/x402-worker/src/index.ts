/**
 * PatientGuide x402 Worker
 *
 * MODE SWITCH (X402_MODE):
 *   "testnet"  — Base Sepolia (eip155:84532), testnet USDC, no real monetary value.
 *   "mainnet"  — Base mainnet (eip155:8453), native USDC, REAL money.
 *   Absent     — defaults to "testnet". Unknown values fail closed with 503.
 *
 * MODE / NETWORK CROSS-CHECK (fails closed):
 *   testnet mode only allows eip155:84532.
 *   mainnet mode only allows eip155:8453.
 *   Any mismatch → 503 x402_mode_network_mismatch.
 *   Mainnet is NEVER inferred from the network value alone.
 *
 * MAINNET PRICE GUARD:
 *   In mainnet mode, X402_PRICE_USDC above 0.01 USDC causes 503 unless
 *   X402_ALLOW_HIGHER_MAINNET_PRICE=true is also set. Do not set this for
 *   the micro-test.
 *
 * SCOPE: Handles ONLY /api/x402/* — enforced both by wrangler.toml route binding
 * and by the belt-and-suspenders guard at the top of fetch().
 *
 * Public routes (/, /guides/*, /posts/*, /search/*, sitemap, robots, llms) are
 * never touched by this Worker because the Cloudflare route binding does not
 * match them. The guard below is a second layer of protection.
 *
 * ROUTES:
 *   /api/x402/ping                — Worker-only test endpoint (no origin call, Base/EVM)
 *   /api/x402/guide-brief         — Paid structured guide metadata (Base/EVM)
 *   /api/x402/solana/guide-brief  — Paid structured guide metadata (Solana Devnet)
 *
 * SOLANA DEVNET RAIL:
 *   A second payment rail on Solana Devnet. No real monetary value.
 *   Network: solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
 *   Facilitator: x402.org/facilitator (supports Solana Devnet without API key)
 *   Requires: X402_SOLANA_RECEIVING_ADDRESS secret (base58 Solana public key)
 *   Solana mainnet is NOT enabled — requires CDP API keys (future PR).
 */

// ── Facilitator default ────────────────────────────────────────────────────────

// Canonical x402.org facilitator URL. Use www to avoid redirect.
const DEFAULT_FACILITATOR_URL = "https://www.x402.org/facilitator";

// ── EVM asset constants ────────────────────────────────────────────────────────

// Testnet USDC — Base Sepolia. No real monetary value.
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Native USDC — Base mainnet. REAL money.
// Verified: Uniswap default token list, CoinGecko Base token list,
//           EIP-55 checksum via viem getAddress().
// Do NOT substitute with bridged USDC, USDT, or Ethereum mainnet USDC.
const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const USDC_DECIMALS = 6;
// x402 protocol version. Must be 2 for CAIP-2 network identifiers (eip155:*, solana:*).
// The facilitator's /supported endpoint only maps CAIP-2 networks to x402Version 2;
// x402Version 1 used legacy names ("base-sepolia", "solana-devnet").
const X402_VERSION = 2;

// ── EVM network constants ──────────────────────────────────────────────────────

const NETWORK_TESTNET = "eip155:84532"; // Base Sepolia — testnet
const NETWORK_MAINNET = "eip155:8453";  // Base mainnet  — REAL money, use with care

// ── Solana constants (Devnet only — mainnet requires CDP API keys, future PR) ──

// Devnet USDC mint issued by Circle. No real monetary value.
// Faucet: faucet.circle.com → select "Solana Devnet"
// Mainnet mint (future reference): EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
const USDC_SOLANA_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// CAIP-2 identifier for Solana Devnet.
// Mainnet CAIP-2 (future reference): solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
const NETWORK_SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

// ── Mainnet price cap ──────────────────────────────────────────────────────────

// Maximum price allowed on mainnet without an explicit override env var.
// Protects against accidental large charges during the micro-test.
const MAINNET_PRICE_CAP_USDC = 0.01;

// ── Slug validation ────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

// ── Types ──────────────────────────────────────────────────────────────────────

type X402Mode = "testnet" | "mainnet";

// Shared shape for both EVM and Solana payment requirements.
// Both chains use 6-decimal USDC and the same x402 "exact" scheme.
interface PaymentRequirements {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: Record<string, string>;
}

export interface Env {
  /**
   * Mode switch.
   *   "testnet" — Base Sepolia, testnet USDC, no real money. (default when absent)
   *   "mainnet" — Base mainnet, native USDC, REAL money.
   * Unknown values fail closed. Set in wrangler.toml [vars] for testnet;
   * set via `wrangler secret put X402_MODE` for mainnet.
   */
  X402_MODE?: string;
  /**
   * CAIP-2 network identifier. Must exactly match X402_MODE:
   *   testnet → eip155:84532 (Base Sepolia)
   *   mainnet → eip155:8453  (Base mainnet)
   * Mismatch fails closed. Set in wrangler.toml [vars].
   */
  X402_NETWORK: string;
  /** Price per request as decimal USDC, e.g. "0.001". Set in wrangler.toml [vars]. */
  X402_PRICE_USDC: string;
  /** Receiving wallet address (EVM). Set via `wrangler secret put X402_RECEIVING_ADDRESS`. */
  X402_RECEIVING_ADDRESS: string;
  /** Facilitator base URL (no trailing slash). Set via `wrangler secret put X402_FACILITATOR_URL`. */
  X402_FACILITATOR_URL: string;
  /** Canonical public origin, e.g. "https://patientguide.io". Set via `wrangler secret put PATIENTGUIDE_ORIGIN`. */
  PATIENTGUIDE_ORIGIN: string;
  /** Shared secret for Worker→Netlify origin auth. Set via `wrangler secret put X402_WORKER_SECRET`. */
  X402_WORKER_SECRET: string;
  /**
   * Set to "true" to allow mainnet price above 0.01 USDC.
   * Do NOT set this for the micro-test. Leave unset.
   */
  X402_ALLOW_HIGHER_MAINNET_PRICE?: string;
  /**
   * Solana Devnet receiver address (base58 public key).
   * Set via `wrangler secret put X402_SOLANA_RECEIVING_ADDRESS`.
   * If absent, /api/x402/solana/* returns 503 x402_solana_not_configured.
   * Solana mainnet is not supported in this build.
   */
  X402_SOLANA_RECEIVING_ADDRESS?: string;
  /**
   * Price per request in USDC for the Solana Devnet endpoint.
   * Defaults to "0.001" when absent. No cap enforced (devnet only, no real value).
   * Set in wrangler.toml [vars] or via `wrangler secret put X402_SOLANA_PRICE_USDC`.
   */
  X402_SOLANA_PRICE_USDC?: string;
  /**
   * Solana fee-payer address managed by the x402.org facilitator.
   * Required by @x402/svm (ExactSvmScheme / ExactSvmSchemeV1): the client reads
   * extra.feePayer from the 402 response to build the partially-signed transaction.
   * The facilitator validates that this address belongs to its own key pool.
   *
   * Source: GET https://www.x402.org/facilitator/supported
   *   → kinds[].extra.feePayer for network solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
   *   → signers["solana:*"][0]
   *
   * Set via `wrangler secret put X402_SOLANA_FEE_PAYER`.
   * If absent, /api/x402/solana/* returns 503 x402_solana_fee_payer_not_configured.
   * Rotate this value if x402.org/facilitator rotates its Solana key pool.
   */
  X402_SOLANA_FEE_PAYER?: string;
}

// ── Mode helpers ───────────────────────────────────────────────────────────────

function resolveMode(env: Env): X402Mode | null {
  const raw = (env.X402_MODE ?? "testnet").trim();
  if (raw === "testnet" || raw === "mainnet") return raw;
  return null;
}

function expectedNetwork(mode: X402Mode): string {
  return mode === "mainnet" ? NETWORK_MAINNET : NETWORK_TESTNET;
}

function assetForMode(mode: X402Mode): string {
  return mode === "mainnet" ? USDC_BASE_MAINNET : USDC_BASE_SEPOLIA;
}

function networkNameForMode(mode: X402Mode): string {
  return mode === "mainnet" ? "Base" : "Base Sepolia";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeFacilitatorUrl(raw: string | undefined): string {
  return (raw || DEFAULT_FACILITATOR_URL)
    .replace(/^﻿/, "")
    .trim()
    .replace(/\/+$/, "");
}

// Decode the base64 X-PAYMENT header into a JSON object.
// The x402.org facilitator /verify and /settle endpoints expect
// { paymentPayload: <object>, paymentRequirements: <object> }, NOT the raw
// base64 string in a paymentHeader field.
function decodePaymentHeader(paymentHeader: string): object {
  let decoded: unknown;
  try {
    decoded = JSON.parse(atob(paymentHeader));
  } catch {
    throw new Error("payment_header_not_base64_json");
  }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new Error("payment_header_not_object");
  }
  return decoded as object;
}

// Convert internal PaymentRequirements (v1 field names) to the x402 v2 wire
// format that the facilitator /verify and /settle endpoints expect.
// v2 uses "amount" instead of "maxAmountRequired" and drops v1-only fields.
function toFacilitatorRequirements(req: PaymentRequirements): Record<string, unknown> {
  return {
    scheme: req.scheme,
    network: req.network,
    asset: req.asset,
    amount: req.maxAmountRequired,
    payTo: req.payTo,
    maxTimeoutSeconds: req.maxTimeoutSeconds,
    extra: req.extra,
  };
}

function usdcToAtomicUnits(usdc: string): string {
  const match = usdc.match(/^(\d+)(?:\.(\d{1,6}))?$/);
  if (!match) {
    throw new Error(`Invalid USDC amount: "${usdc}"`);
  }
  const intPart = match[1];
  const fracPart = (match[2] ?? "").padEnd(USDC_DECIMALS, "0");
  const atomicUnits =
    BigInt(intPart) * BigInt(10 ** USDC_DECIMALS) + BigInt(fracPart);
  return atomicUnits.toString();
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Env validation ─────────────────────────────────────────────────────────────

function validateEnv(env: Env): Response | null {
  // 1. Required fields (mode-independent)
  const required: Array<keyof Env> = [
    "X402_NETWORK",
    "X402_PRICE_USDC",
    "X402_RECEIVING_ADDRESS",
    "X402_FACILITATOR_URL",
    "PATIENTGUIDE_ORIGIN",
    "X402_WORKER_SECRET",
  ];
  for (const key of required) {
    if (!env[key]) {
      return jsonError(503, "x402_not_configured");
    }
  }

  // 2. Resolve mode — unknown value fails closed.
  const mode = resolveMode(env);
  if (!mode) {
    return jsonError(503, "x402_invalid_mode");
  }

  // 3. Network must exactly match the mode.
  //    Never infer mainnet from network alone. Never allow cross-mode values.
  if (env.X402_NETWORK !== expectedNetwork(mode)) {
    return jsonError(503, "x402_mode_network_mismatch");
  }

  // 4. Mainnet price guard — prevents accidental large charges.
  if (mode === "mainnet") {
    const price = parseFloat(env.X402_PRICE_USDC);
    if (isNaN(price) || price <= 0) {
      return jsonError(503, "x402_invalid_price");
    }
    if (price > MAINNET_PRICE_CAP_USDC) {
      const override = (env.X402_ALLOW_HIGHER_MAINNET_PRICE ?? "").trim().toLowerCase();
      if (override !== "true") {
        return jsonError(503, "x402_mainnet_price_cap_exceeded");
      }
    }
  }

  return null;
}

// ── EVM payment requirements ───────────────────────────────────────────────────

function buildPaymentRequirements(env: Env, mode: X402Mode, resource: string): PaymentRequirements {
  return {
    scheme: "exact",
    network: env.X402_NETWORK,
    maxAmountRequired: usdcToAtomicUnits(env.X402_PRICE_USDC),
    resource,
    description:
      mode === "mainnet"
        ? "PatientGuide x402 mainnet micro-test"
        : "PatientGuide x402 testnet experiment",
    mimeType: "application/json",
    payTo: env.X402_RECEIVING_ADDRESS,
    maxTimeoutSeconds: 300,
    asset: assetForMode(mode),
    extra: { name: "USDC", version: "2" },
  };
}

function build402Response(env: Env, mode: X402Mode, resource: string): Response {
  const body = {
    x402Version: X402_VERSION,
    accepts: [buildPaymentRequirements(env, mode, resource)],
    error: "Payment required — send X-PAYMENT header with payment proof",
  };
  return new Response(JSON.stringify(body), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "X-PAYMENT-REQUIRED": JSON.stringify(body),
    },
  });
}

// ── Solana Devnet payment requirements ────────────────────────────────────────

function buildSolanaPaymentRequirements(env: Env, resource: string, payTo: string, feePayer: string): PaymentRequirements {
  return {
    scheme: "exact",
    network: NETWORK_SOLANA_DEVNET,
    maxAmountRequired: usdcToAtomicUnits(env.X402_SOLANA_PRICE_USDC ?? "0.001"),
    resource,
    description: "PatientGuide x402 Solana Devnet experiment",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 300,
    asset: USDC_SOLANA_DEVNET,
    // feePayer is the x402.org/facilitator Solana address that sponsors gas fees.
    // Required by @x402/svm; validated by the facilitator during verify/settle.
    // Value sourced from GET https://www.x402.org/facilitator/supported (signers["solana:*"]).
    extra: { feePayer },
  };
}

function buildSolana402Response(env: Env, resource: string, payTo: string, feePayer: string): Response {
  const body = {
    x402Version: X402_VERSION,
    accepts: [buildSolanaPaymentRequirements(env, resource, payTo, feePayer)],
    error: "Payment required — send X-PAYMENT header with Solana payment proof",
  };
  return new Response(JSON.stringify(body), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "X-PAYMENT-REQUIRED": JSON.stringify(body),
    },
  });
}

// ── Facilitator calls ──────────────────────────────────────────────────────────

interface VerifyResult {
  isValid: boolean;
  invalidReason?: string;
}

async function verifyPayment(
  facilitatorBase: string,
  paymentHeader: string,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResult> {
  let paymentPayload: object;
  try {
    paymentPayload = decodePaymentHeader(paymentHeader);
  } catch (e) {
    return { isValid: false, invalidReason: String(e) };
  }
  const res = await fetch(`${facilitatorBase}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: X402_VERSION, paymentPayload, paymentRequirements: toFacilitatorRequirements(paymentRequirements) }),
  });
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    return { isValid: false, invalidReason: `Facilitator HTTP ${res.status}: ${body.slice(0, 500)}` };
  }
  return (await res.json()) as VerifyResult;
}

interface SettleResult {
  success: boolean;
  txHash?: string;
  networkId?: string;
}

async function settlePayment(
  facilitatorBase: string,
  paymentHeader: string,
  paymentRequirements: PaymentRequirements
): Promise<SettleResult> {
  let paymentPayload: object;
  try {
    paymentPayload = decodePaymentHeader(paymentHeader);
  } catch {
    return { success: false };
  }
  const res = await fetch(`${facilitatorBase}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: X402_VERSION, paymentPayload, paymentRequirements: toFacilitatorRequirements(paymentRequirements) }),
  });
  if (!res.ok) return { success: false };
  return (await res.json()) as SettleResult;
}

// ── Payment gate (network-agnostic core) ──────────────────────────────────────

async function runGate(
  facilitatorBase: string,
  requirements: PaymentRequirements,
  paymentHeader: string | null,
  build402: () => Response
): Promise<{ settled: SettleResult } | Response> {
  if (!paymentHeader) return build402();

  let verifyResult: VerifyResult;
  try {
    verifyResult = await verifyPayment(facilitatorBase, paymentHeader, requirements);
  } catch {
    return jsonError(502, "facilitator_unreachable");
  }

  if (!verifyResult.isValid) {
    return new Response(
      JSON.stringify({ error: "payment_invalid", reason: verifyResult.invalidReason ?? null }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  let settleResult: SettleResult;
  try {
    settleResult = await settlePayment(facilitatorBase, paymentHeader, requirements);
  } catch {
    return jsonError(502, "payment_settlement_failed");
  }

  if (!settleResult.success) {
    return jsonError(402, "payment_settlement_failed");
  }

  return { settled: settleResult };
}

// ── EVM payment gate (Base Sepolia / Base mainnet) ────────────────────────────

async function runPaymentGate(
  env: Env,
  mode: X402Mode,
  resource: string,
  paymentHeader: string | null
): Promise<{ settled: SettleResult } | Response> {
  return runGate(
    normalizeFacilitatorUrl(env.X402_FACILITATOR_URL),
    buildPaymentRequirements(env, mode, resource),
    paymentHeader,
    () => build402Response(env, mode, resource)
  );
}

// ── Solana payment gate (Devnet only) ─────────────────────────────────────────

async function runSolanaPaymentGate(
  env: Env,
  resource: string,
  paymentHeader: string | null,
  payTo: string,
  feePayer: string
): Promise<{ settled: SettleResult } | Response> {
  return runGate(
    normalizeFacilitatorUrl(env.X402_FACILITATOR_URL),
    buildSolanaPaymentRequirements(env, resource, payTo, feePayer),
    paymentHeader,
    () => buildSolana402Response(env, resource, payTo, feePayer)
  );
}

function paymentReceiptHeader(settled: SettleResult, network: string): string {
  return JSON.stringify({
    success: true,
    txHash: settled.txHash ?? null,
    networkId: settled.networkId ?? network,
  });
}

// ── Worker entry point ─────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // SAFETY GUARD: Belt-and-suspenders route check.
    // The [[routes]] binding in wrangler.toml restricts this Worker to /api/x402/*
    // only. This guard makes the constraint explicit in code so it cannot
    // accidentally be widened by a future wrangler.toml edit.
    if (!url.pathname.startsWith("/api/x402/")) {
      return jsonError(404, "not_found");
    }

    // Validate env (mode, network cross-check, price guard).
    // Fails closed — returns 503 rather than serving a misconfigured response.
    const envError = validateEnv(env);
    if (envError) return envError;

    // Mode is guaranteed valid after validateEnv passes.
    const mode = resolveMode(env) as X402Mode;

    // Strip BOM that Windows PowerShell may prepend when secrets are set via
    // piped input, and strip trailing slashes.
    const canonicalOrigin = env.PATIENTGUIDE_ORIGIN.replace(/^﻿/, "").replace(/\/+$/, "");

    const paymentHeader = request.headers.get("X-PAYMENT");

    // ── /api/x402/ping ───────────────────────────────────────────────────────
    if (url.pathname === "/api/x402/ping") {
      const resource = `${canonicalOrigin}${url.pathname}`;

      const gateResult = await runPaymentGate(env, mode, resource, paymentHeader);
      if (gateResult instanceof Response) return gateResult;

      return new Response(
        JSON.stringify({
          ok: true,
          service: "PatientGuide x402",
          paid: true,
          mode,
          network: env.X402_NETWORK,
          networkName: networkNameForMode(mode),
          origin: "cloudflare-worker",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT-RESPONSE": paymentReceiptHeader(gateResult.settled, env.X402_NETWORK),
          },
        }
      );
    }

    // ── /api/x402/guide-brief ────────────────────────────────────────────────
    if (url.pathname === "/api/x402/guide-brief") {
      const slug = url.searchParams.get("slug");

      // Validate slug before building payment requirements — clients should not
      // be charged for a request that is structurally invalid.
      if (!slug) {
        return jsonError(400, "missing_slug");
      }
      if (!SLUG_RE.test(slug)) {
        return jsonError(400, "invalid_slug");
      }

      // Resource includes query string so payment proof binds to the specific guide.
      const resource = `${canonicalOrigin}${url.pathname}?slug=${encodeURIComponent(slug)}`;

      const gateResult = await runPaymentGate(env, mode, resource, paymentHeader);
      if (gateResult instanceof Response) return gateResult;

      // ── Proxy to Netlify origin function ──────────────────────────────────
      // Settlement is required before origin access. If settlement fails above,
      // runPaymentGate returns an error Response and we never reach this point.
      const originUrl =
        `${canonicalOrigin}/.netlify/functions/x402-guide-brief` +
        `?slug=${encodeURIComponent(slug)}`;

      let originResponse: Response;
      try {
        originResponse = await fetch(originUrl, {
          method: "GET",
          headers: {
            "X-Worker-Secret": env.X402_WORKER_SECRET,
            "Accept": "application/json",
          },
        });
      } catch {
        return jsonError(502, "origin_unreachable");
      }

      const responseHeaders = new Headers(originResponse.headers);
      responseHeaders.set(
        "X-PAYMENT-RESPONSE",
        paymentReceiptHeader(gateResult.settled, env.X402_NETWORK)
      );

      return new Response(originResponse.body, {
        status: originResponse.status,
        headers: responseHeaders,
      });
    }

    // ── /api/x402/solana/guide-brief ─────────────────────────────────────────
    if (url.pathname === "/api/x402/solana/guide-brief") {
      // Note: validateEnv() above validates the shared EVM env (X402_RECEIVING_ADDRESS,
      // X402_NETWORK, etc.) before reaching this branch. The EVM/testnet config must
      // remain present even when only the Solana endpoint is exercised. Do not
      // refactor validateEnv to skip EVM checks for Solana requests.

      // Guard: trim before testing so whitespace-only secrets fail closed.
      // Solana mainnet is not supported — this endpoint is Devnet-only.
      const solanaPayTo = env.X402_SOLANA_RECEIVING_ADDRESS?.trim();
      if (!solanaPayTo) {
        return jsonError(503, "x402_solana_not_configured");
      }

      // feePayer must be the x402.org/facilitator Solana address (from its key pool).
      // Required by @x402/svm and validated by the facilitator during verify/settle.
      // Set via `wrangler secret put X402_SOLANA_FEE_PAYER`.
      // Source: GET https://www.x402.org/facilitator/supported → signers["solana:*"][0]
      const solanaFeePayer = env.X402_SOLANA_FEE_PAYER?.trim();
      if (!solanaFeePayer) {
        return jsonError(503, "x402_solana_fee_payer_not_configured");
      }

      const slug = url.searchParams.get("slug");
      if (!slug) return jsonError(400, "missing_slug");
      if (!SLUG_RE.test(slug)) return jsonError(400, "invalid_slug");

      // Resource path mirrors the EVM endpoint pattern but under /solana/.
      // Binds the payment proof to this specific Solana endpoint + slug.
      const resource = `${canonicalOrigin}${url.pathname}?slug=${encodeURIComponent(slug)}`;

      const gateResult = await runSolanaPaymentGate(env, resource, paymentHeader, solanaPayTo, solanaFeePayer);
      if (gateResult instanceof Response) return gateResult;

      // ── Proxy to Netlify origin function ──────────────────────────────────
      // Same origin function as the EVM endpoint — content is network-agnostic.
      const originUrl =
        `${canonicalOrigin}/.netlify/functions/x402-guide-brief` +
        `?slug=${encodeURIComponent(slug)}`;

      let originResponse: Response;
      try {
        originResponse = await fetch(originUrl, {
          method: "GET",
          headers: {
            "X-Worker-Secret": env.X402_WORKER_SECRET,
            "Accept": "application/json",
          },
        });
      } catch {
        return jsonError(502, "origin_unreachable");
      }

      const responseHeaders = new Headers(originResponse.headers);
      responseHeaders.set(
        "X-PAYMENT-RESPONSE",
        paymentReceiptHeader(gateResult.settled, NETWORK_SOLANA_DEVNET)
      );

      return new Response(originResponse.body, {
        status: originResponse.status,
        headers: responseHeaders,
      });
    }

    // ── Unknown /api/x402/* path ─────────────────────────────────────────────
    return jsonError(404, "not_found");
  },
};
