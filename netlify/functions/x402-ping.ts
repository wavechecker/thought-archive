/**
 * x402 ping — origin endpoint for the testnet payment experiment.
 *
 * This function is called by the Cloudflare x402 Worker AFTER a valid testnet
 * payment is verified AND settled. It is NOT intended to be called directly.
 *
 * SAFETY: X402_WORKER_SECRET must be configured as a Netlify environment
 * variable before deploying. The function returns 500 if the secret is absent
 * in any non-local environment rather than falling back to open access.
 *
 * TESTNET ONLY — network is always "base-sepolia".
 */

import type { Handler } from "@netlify/functions";

// Local-only bypass: allowed when running `netlify dev` or plain Node.js locally.
// In all Netlify-deployed contexts (production, branch-deploy, deploy-preview),
// NETLIFY=true and CONTEXT !== "dev", so the bypass does not apply.
const isLocalDev =
  process.env.CONTEXT === "dev" || !process.env.NETLIFY;

export const handler: Handler = async (event) => {
  const expectedSecret = process.env.X402_WORKER_SECRET;

  if (!expectedSecret) {
    if (isLocalDev) {
      // Allow unconfigured local development without a secret.
      // This branch is unreachable in any deployed Netlify environment.
    } else {
      // Fail closed in all deployed environments — do not serve without a secret.
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "x402_origin_not_configured" }),
        headers: { "Content-Type": "application/json" },
      };
    }
  } else {
    // Secret is configured: enforce it regardless of environment.
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
      network: "eip155:84532",
      networkName: "Base Sepolia",
      paid: true,
    }),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  };
};
