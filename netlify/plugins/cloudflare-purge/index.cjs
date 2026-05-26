// Purges the entire Cloudflare zone cache after every successful Netlify deploy.
// Required env vars (set in Netlify dashboard → Site settings → Environment variables):
//   CF_ZONE_ID   — found in Cloudflare dashboard → zone Overview → right sidebar
//   CF_API_TOKEN — Cloudflare API token with "Zone.Cache Purge" permission

const https = require("https");

function purgeZone(zoneId, apiToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ purge_everything: true });
    const options = {
      hostname: "api.cloudflare.com",
      path: `/client/v4/zones/${zoneId}/purge_cache`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: {} });
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = {
  onSuccess: async ({ utils }) => {
    const zoneId = process.env.CF_ZONE_ID;
    const apiToken = process.env.CF_API_TOKEN;

    if (!zoneId || !apiToken) {
      console.warn(
        "[cloudflare-purge] CF_ZONE_ID or CF_API_TOKEN not set — skipping cache purge."
      );
      return;
    }

    let result;
    try {
      result = await purgeZone(zoneId, apiToken);
    } catch (err) {
      utils.build.failPlugin(`Cloudflare purge request failed: ${err.message}`);
      return;
    }

    if (!result.body.success) {
      const errors = (result.body.errors || []).map((e) => e.message).join(", ");
      utils.build.failPlugin(
        `Cloudflare purge returned HTTP ${result.status}: ${errors || "unknown error"}`
      );
      return;
    }

    console.log("[cloudflare-purge] Zone cache purged successfully.");
  },
};
