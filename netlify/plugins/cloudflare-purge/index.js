// Purges the entire Cloudflare zone cache after every successful Netlify deploy.
// Required env vars (set in Netlify dashboard → Site settings → Environment variables):
//   CF_ZONE_ID   — found in Cloudflare dashboard → zone Overview → right sidebar
//   CF_API_TOKEN — Cloudflare API token with "Zone.Cache Purge" permission

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

    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purge_everything: true }),
      });
    } catch (err) {
      utils.build.failPlugin(`Cloudflare purge request failed: ${err.message}`);
      return;
    }

    const body = await response.json();

    if (!response.ok || !body.success) {
      const errors = (body.errors || []).map((e) => e.message).join(", ");
      utils.build.failPlugin(
        `Cloudflare purge returned HTTP ${response.status}: ${errors || "unknown error"}`
      );
      return;
    }

    console.log("[cloudflare-purge] Zone cache purged successfully.");
  },
};
