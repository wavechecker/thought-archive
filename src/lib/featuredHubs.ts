export type FeaturedHub = {
  title: string;
  href: string;
  description: string;
};

export const HUBS: FeaturedHub[] = [
  {
    title: "Metabolic Health",
    href: "/guides/metabolic-health",
    description: "Weight, insulin resistance, GLP-1s, and cardiometabolic risk."
  },
  {
    title: "Aging & Longevity",
    href: "/guides/aging-longevity",
    description: "Aging biology, lifespan heritability, and longevity debates."
  },
  {
    title: "Infectious Diseases",
    href: "/guides/infectious-diseases",
    description: "Outbreaks, vaccines, and practical infectious disease guidance."
  },
  {
    title: "Neurology",
    href: "/guides/neurology",
    description: "Stroke, TIA, emergency neurology, and brain health."
  },
  {
    title: "Mental Health",
    href: "/guides/mental-health",
    description: "Anxiety, depression, ADHD, sleep, and evidence-based care."
  }
];

// ISO week-based rotation (stable weekly change)
function getWeekKey(date = new Date()): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return d.getUTCFullYear() * 100 + week;
}

export function getWeeklyFeaturedHubs(count = 4, date = new Date()): FeaturedHub[] {
  const key = getWeekKey(date);
  const start = key % HUBS.length;

  const out: FeaturedHub[] = [];
  for (let i = 0; i < Math.min(count, HUBS.length); i++) {
    out.push(HUBS[(start + i) % HUBS.length]);
  }
  return out;
}
