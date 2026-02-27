document.addEventListener("DOMContentLoaded", async () => {
  const trackers = document.querySelectorAll("[data-outbreak][data-url]");

  for (const el of trackers) {
    const url = el.getAttribute("data-url");
    if (!url) continue;

    try {
      // Cache-busting query to avoid stale JSON
      const res = await fetch(`${url}?t=${Date.now()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to fetch outbreak data");

      const data = await res.json();

      if (!data.series || !Array.isArray(data.series)) return;

      // Select latest year automatically
      const latest = data.series.reduce((a, b) =>
        b.year > a.year ? b : a
      );

      // Update fields
      const set = (field, value) => {
        const node = el.querySelector(`[data-field="${field}"]`);
        if (node) node.textContent = value;
      };

      set("cases", latest.confirmedCases?.toLocaleString() ?? "—");
      set("outbreaks", latest.outbreaksInvestigated ?? "—");

      if (latest.lastUpdated) {
        const date = new Date(latest.lastUpdated);
        set(
          "lastUpdated",
          date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        );
      }

      // Update source link
      const sourceLink = el.querySelector("a");
      if (sourceLink && latest.sourceUrl) {
        sourceLink.href = latest.sourceUrl;
        sourceLink.textContent = latest.sourceName || "CDC";
      }
    } catch (err) {
      console.error("Outbreak tracker update failed:", err);
    }
  }
});