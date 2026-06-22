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
 * TESTNET ONLY: X402_NETWORK must be "base-sepolia". The code does not enforce
 * this at runtime but the wrangler.toml [vars] sets it. Mainnet is not configured.
 */

// USDC contract on Base Sepolia (testnet — no real monetary value)
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_DECIMALS = 6;
const X402_VERSION = 1;

export interface Env {
  /** Chain identifier, e.g. "base-sepolia". Set in wrangler.toml [vars]. */
  X402_NETWORK: string;
  /** Price per request as a decimal USDC string, e.g. "0.001". Set in wrangler.toml [vars]. */
  X402_PRICE_USDC: string;
  /** Testnet receiving wallet address. Set via `wrangler secret put`. */
  X402_RECEIVING_ADDRESS: string;
  /** CDP / x402.org facilitator base URL. Set via `wrangler secret put`. */
  X402_FACILITATOR_URL: string;
  /** Netlify origin base URL, e.g. "https://patientguide.io". Set via `wrangler secret put`. */
  PATIENTGUIDE_ORIGIN: string;
  /** Shared secret sent to the Netlify function to block direct origin access. Set via `wrangler secret put`. */
  X402_WORKER_SECRET: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert a decimal USDC amount string to atomic units (integer string). */
function usdcToAtomicUnits(usdc: string): string {
  return Math.round(parseFloat(usdc) * 10 ** USDC_DECIMALS).toString();
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

function jsonError(status: number, error: string, detail?: string): Response {
  return new Response(JSON.stringify({ error, ...(detail ? { detail } : {}) }), {
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
  facilitatorUrl: string,
  paymentHeader: string,
  paymentRequirements: ReturnType<typeof buildPaymentRequirements>
): Promise<VerifyResult> {
  const res = await fetch(`${facilitatorUrl}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
  });
  if (!res.ok) {
    return { isValid: false, invalidReason: `Facilitator HTTP ${res.status}` };
  }
  return res.json<VerifyResult>();
}

interface SettleResult {
  success: boolean;
  txHash?: string;
  networkId?: string;
}

async function settlePayment(
  facilitatorUrl: string,
  paymentHeader: string,
  paymentRequirements: ReturnType<typeof buildPaymentRequirements>
): Promise<SettleResult> {
  const res = await fetch(`${facilitatorUrl}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
  });
  if (!res.ok) return { success: false };
  return res.json<SettleResult>();
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
      verifyResult = await verifyPayment(env.X402_FACILITATOR_URL, paymentHeader, paymentRequirements);
    } catch (err) {
      return jsonError(502, "facilitator_unreachable", String(err));
    }

    if (!verifyResult.isValid) {
      return jsonError(402, "payment_invalid", verifyResult.invalidReason ?? "unknown");
    }

    // ── Step 3: Settle the payment ───────────────────────────────────────────
    let settleResult: SettleResult = { success: false };
    try {
      settleResult = await settlePayment(env.X402_FACILITATOR_URL, paymentHeader, paymentRequirements);
    } catch {
      // Non-fatal — we proceed even if settlement tracking fails.
      // The verify step already confirmed the payment is valid.
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
    } catch (err) {
      return jsonError(502, "origin_unreachable", String(err));
    }

    // Return origin body + payment receipt header.
    const responseHeaders = new Headers(originResponse.headers);
    responseHeaders.set(
      "X-PAYMENT-RESPONSE",
      JSON.stringify({
        success: settleResult.success,
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
