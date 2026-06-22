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
 * TESTNET ONLY: X402_NETWORK is validated at runtime against REQUIRED_NETWORK.
 * Any other value causes the Worker to return 503 and refuse all requests —
 * it fails closed rather than accidentally enabling mainnet payments.
 */

// USDC contract on Base Sepolia (testnet — no real monetary value)
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_DECIMALS = 6;
const X402_VERSION = 1;

// Hard-coded allowed network. Changing this to "base" or "ethereum" would enable
// real payments — that requires a separate PR with explicit review.
const REQUIRED_NETWORK = "base-sepolia";

export interface Env {
  /** Chain identifier — must equal REQUIRED_NETWORK ("base-sepolia"). Set in wrangler.toml [vars]. */
  X402_NETWORK: string;
  /** Price per request as a decimal USDC string, e.g. "0.001". Set in wrangler.toml [vars]. */
  X402_PRICE_USDC: string;
  /** Testnet receiving wallet address. Set via `wrangler secret put`. */
  X402_RECEIVING_ADDRESS: string;
  /** CDP / x402.org facilitator base URL (no trailing slash). Set via `wrangler secret put`. */
  X402_FACILITATOR_URL: string;
  /** Netlify origin base URL, e.g. "https://patientguide.io". Set via `wrangler secret put`. */
  PATIENTGUIDE_ORIGIN: string;
  /** Shared secret sent to the Netlify function to block direct origin access. Set via `wrangler secret put`. */
  X402_WORKER_SECRET: string;
}

// ── Env validation ─────────────────────────────────────────────────────────────

/**
 * Validate all required env vars are present and the network is base-sepolia.
 * Returns an error Response if invalid, null if ok.
 * Never includes secret values in the error response.
 */
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

/**
 * Convert a decimal USDC amount string to atomic units (integer string).
 *
 * Supports up to 6 decimal places. Rejects negative, empty, multi-dot, or
 * out-of-precision inputs rather than silently rounding.
 *
 * Examples:
 *   "0.001"    → "1000"
 *   "0.01"     → "10000"
 *   "1"        → "1000000"
 *   "1.234567" → "1234567"
 *
 * Rejects: "abc", "0.0000001", "-1", "", "1.2.3"
 */
function usdcToAtomicUnits(usdc: string): string {
  // Accept only non-negative decimals with at most 6 fractional digits.
  // The regex rejects: negatives, empty strings, multiple dots, > 6 decimals.
  const match = usdc.match(/^(\d+)(?:\.(\d{1,6}))?$/);
  if (!match) {
    throw new Error(`Invalid USDC amount: "${usdc}"`);
  }
  const intPart = match[1];
  // Pad fractional to exactly 6 digits before converting to BigInt.
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
      // Mirror in header so x402-compatible clients can parse without reading the body.
      "X-PAYMENT-REQUIRED": JSON.stringify(body),
    },
  });
}

/** Produce a JSON error response. Never include secret values in the body. */
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

    // Strip trailing slashes to prevent double-slash URLs (e.g. .../verify → ...//verify).
    const facilitatorBase = env.X402_FACILITATOR_URL.replace(/\/+$/, "");

    const resource = url.toString();
    const paymentRequirements = buildPaymentRequirements(env, resource);
    const paymentHeader = request.headers.get("X-PAYMENT");

    // ── Step 1: Require payment ──────────────────────────────────────────────
    if (!paymentHeader) {
      return build402Response(env, resource);
    }

    // ── Step 2: Verify with facilitator ─────────────────────────────────────
    let verifyResult: VerifyResult;
    try {
      verifyResult = await verifyPayment(facilitatorBase, paymentHeader, paymentRequirements);
    } catch {
      return jsonError(502, "facilitator_unreachable");
    }

    if (!verifyResult.isValid) {
      return jsonError(402, "payment_invalid");
    }

    // ── Step 3: Settle the payment ───────────────────────────────────────────
    // Settlement is required before origin access.
    // If the facilitator verifies but settlement fails, the Worker does NOT proxy
    // to the origin — the resource is not served until payment is finalized.
    let settleResult: SettleResult;
    try {
      settleResult = await settlePayment(facilitatorBase, paymentHeader, paymentRequirements);
    } catch {
      return jsonError(502, "payment_settlement_failed");
    }

    if (!settleResult.success) {
      return jsonError(402, "payment_settlement_failed");
    }

    // ── Step 4: Proxy to origin ──────────────────────────────────────────────
    // The Worker forwards to the Netlify function via its /.netlify/functions/ URL.
    // The X-Worker-Secret header prevents callers from hitting the function directly
    // and bypassing the payment gate.
    const originUrl = `${env.PATIENTGUIDE_ORIGIN}/.netlify/functions/x402-ping`;
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

    // Return origin body + payment receipt header.
    const responseHeaders = new Headers(originResponse.headers);
    responseHeaders.set(
      "X-PAYMENT-RESPONSE",
      JSON.stringify({
        success: true,
        txHash: settleResult.txHash ?? null,
        networkId: settleResult.networkId ?? env.X402_NETWORK,
      })
    );

    return new Response(originResponse.body, {
      status: originResponse.status,
      headers: responseHeaders,
    });
  },
};
