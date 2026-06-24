/**
 * PatientGuide x402 Testnet Worker
 *
 * SCOPE: Handles ONLY /api/x402/* — enforced both by wrangler.toml route binding
 * and by the belt-and-suspenders guard at the top of fetch().
 *
 * Public routes (/, /guides/*, /posts/*, /search/*, sitemap, robots, llms) are
 * never touched by this Worker because the Cloudflare route binding does not
 * match them. The guard below is a second layer of protection.
 *
 * TESTNET ONLY: X402_NETWORK is validated at runtime against REQUIRED_NETWORK
 * ("eip155:84532" = Base Sepolia testnet). Any other value — including the Base
 * mainnet identifier "eip155:8453" — causes the Worker to return 503 and refuse
 * all requests. It fails closed rather than accidentally enabling mainnet payments.
 *
 * ROUTES:
 *   /api/x402/ping         — Worker-only test endpoint (no origin call)
 *   /api/x402/guide-brief  — Paid structured guide metadata (proxies to Netlify origin)
 */

// USDC contract on Base Sepolia (testnet — no real monetary value)
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_DECIMALS = 6;
const X402_VERSION = 1;

// CAIP-2 identifier for Base Sepolia testnet.
//   eip155:84532 = Base Sepolia testnet  ← required value
//   eip155:8453  = Base mainnet          ← DO NOT USE — enables real payments
// Changing this requires a separate PR with explicit review.
const REQUIRED_NETWORK = "eip155:84532";

// Allowed slug pattern — must match the same pattern in the Netlify function.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export interface Env {
  /** Chain identifier — must equal REQUIRED_NETWORK ("eip155:84532"). Set in wrangler.toml [vars]. */
  X402_NETWORK: string;
  /** Price per request as a decimal USDC string, e.g. "0.001". Set in wrangler.toml [vars]. */
  X402_PRICE_USDC: string;
  /** Testnet receiving wallet address. Set via `wrangler secret put`. */
  X402_RECEIVING_ADDRESS: string;
  /** CDP / x402.org facilitator base URL (no trailing slash). Set via `wrangler secret put`. */
  X402_FACILITATOR_URL: string;
  /** Canonical public origin, e.g. "https://patientguide.io". Set via `wrangler secret put`. */
  PATIENTGUIDE_ORIGIN: string;
  /** Shared secret sent to the Netlify function to block direct origin access. Set via `wrangler secret put`. */
  X402_WORKER_SECRET: string;
}

// ── Env validation ─────────────────────────────────────────────────────────────

function validateEnv(env: Env): Response | null {
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

  // Runtime enforcement: reject any network that is not base-sepolia.
  // Fails closed — no payment requirements are built for unknown networks.
  if (env.X402_NETWORK !== REQUIRED_NETWORK) {
    return jsonError(503, "x402_network_not_allowed");
  }

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function buildPaymentRequirements(env: Env, resource: string) {
  return {
    scheme: "exact" as const,
    network: env.X402_NETWORK,
    maxAmountRequired: usdcToAtomicUnits(env.X402_PRICE_USDC),
    resource,
    description: "PatientGuide x402 testnet experiment",
    mimeType: "application/json",
    payTo: env.X402_RECEIVING_ADDRESS,
    maxTimeoutSeconds: 300,
    asset: USDC_BASE_SEPOLIA,
    extra: { name: "USDC", version: "2" },
  };
}

function build402Response(env: Env, resource: string): Response {
  const body = {
    x402Version: X402_VERSION,
    accepts: [buildPaymentRequirements(env, resource)],
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

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
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
  paymentRequirements: ReturnType<typeof buildPaymentRequirements>
): Promise<VerifyResult> {
  const res = await fetch(`${facilitatorBase}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
  });
  if (!res.ok) {
    return { isValid: false, invalidReason: `Facilitator HTTP ${res.status}` };
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
  paymentRequirements: ReturnType<typeof buildPaymentRequirements>
): Promise<SettleResult> {
  const res = await fetch(`${facilitatorBase}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
  });
  if (!res.ok) return { success: false };
  return (await res.json()) as SettleResult;
}

// ── Shared payment gate ────────────────────────────────────────────────────────

// Runs the full 402 → verify → settle flow for a given resource URL.
// Returns { settled: SettleResult } on success, or a Response to return directly on failure.
async function runPaymentGate(
  env: Env,
  resource: string,
  paymentHeader: string | null
): Promise<{ settled: SettleResult } | Response> {
  const facilitatorBase = env.X402_FACILITATOR_URL.replace(/\/+$/, "");
  const paymentRequirements = buildPaymentRequirements(env, resource);

  if (!paymentHeader) {
    return build402Response(env, resource);
  }

  let verifyResult: VerifyResult;
  try {
    verifyResult = await verifyPayment(facilitatorBase, paymentHeader, paymentRequirements);
  } catch {
    return jsonError(502, "facilitator_unreachable");
  }

  if (!verifyResult.isValid) {
    return jsonError(402, "payment_invalid");
  }

  let settleResult: SettleResult;
  try {
    settleResult = await settlePayment(facilitatorBase, paymentHeader, paymentRequirements);
  } catch {
    return jsonError(502, "payment_settlement_failed");
  }

  if (!settleResult.success) {
    return jsonError(402, "payment_settlement_failed");
  }

  return { settled: settleResult };
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
    // The [[routes]] binding in wrangler.toml already restricts this Worker to
    // /api/x402/* only. This guard makes the constraint explicit in code so it
    // cannot accidentally be widened by a future wrangler.toml edit.
    if (!url.pathname.startsWith("/api/x402/")) {
      return jsonError(404, "not_found");
    }

    // Validate env vars and enforce base-sepolia before doing anything else.
    // Fails closed — returns 503 rather than serving a misconfigured response.
    const envError = validateEnv(env);
    if (envError) return envError;

    // Build canonical origin once — strip BOM that Windows PowerShell may
    // prepend when secrets are set via piped input, and strip trailing slashes.
    const canonicalOrigin = env.PATIENTGUIDE_ORIGIN.replace(/^﻿/, "").replace(/\/+$/, "");

    const paymentHeader = request.headers.get("X-PAYMENT");

    // ── /api/x402/ping ───────────────────────────────────────────────────────
    if (url.pathname === "/api/x402/ping") {
      const resource = `${canonicalOrigin}${url.pathname}`;

      const gateResult = await runPaymentGate(env, resource, paymentHeader);
      if (gateResult instanceof Response) return gateResult;

      return new Response(
        JSON.stringify({
          ok: true,
          service: "PatientGuide x402 test",
          paid: true,
          network: "eip155:84532",
          networkName: "Base Sepolia",
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

      const gateResult = await runPaymentGate(env, resource, paymentHeader);
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

    // ── Unknown /api/x402/* path ─────────────────────────────────────────────
    return jsonError(404, "not_found");
  },
};
