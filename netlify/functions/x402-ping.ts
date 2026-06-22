/**
 * x402 ping — origin endpoint for the testnet payment experiment.
 *
 * This function is called by the Cloudflare x402 Worker AFTER a valid testnet
 * payment is verified. It is NOT intended to be called directly by end users.
 *
 * The X-Worker-Secret header check (when the env var is configured) prevents
 * direct access that would bypass the payment gate.
 *
 * TESTNET ONLY — network is always "base-sepolia".
 */

import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  // Shared secret guard — blocks direct calls that skip the Worker.
  // When X402_WORKER_SECRET is not set (local dev / unconfigured), the check
  // is skipped so local testing still works.
  const expectedSecret = process.env.X402_WORKER_SECRET;
  if (expectedSecret) {
    const provided = event.headers["x-worker-secret"];
    if (provided !== expectedSecret) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "forbidden" }),
        headers: { "Content-Type": "application/json" },
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      service: "PatientGuide x402 test",
      network: "base-sepolia",
      paid: true,
    }),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  };
};
