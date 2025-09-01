// netlify/functions/pg404-log.js
exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body || "{}");

    // Optional geo info from Netlify header
    let geo = null;
    try {
      if (event.headers && event.headers["x-nf-geo"]) {
        geo = JSON.parse(event.headers["x-nf-geo"]);
      }
    } catch (_) {}

    console.log(
      "404_LOG",
      JSON.stringify({
        path: body.path || null,
        referrer: body.referrer || null,
        ua: body.userAgent || null,
        ts: body.ts || new Date().toISOString(),
        geo: geo ? { country: geo.country, subdivision: geo.subdivision, city: geo.city } : null,
        botProbe:
          /\bwp-login\.php|xmlrpc\.php|phpmyadmin|\.env|\.git\b/i.test(body.path || "") ||
          /\bAhrefsBot|Semrush|MJ12bot|curl|python-requests|Go-http-client\b/i.test(body.userAgent || "")
      })
    );
  } catch (e) {
    console.log("404_LOG_ERROR", e?.message || e);
  }

  return { statusCode: 204, headers: { "Cache-Control": "no-store" }, body: "" };
};

