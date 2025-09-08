// src/lib/slug.ts

// Canonical category display names
export const CATEGORY_FIXES: Record<string, string> = {
  "Emergencies": "Emergencies",
  "Infectious Diseases": "Infectious Diseases",
  "Vaccination": "Vaccination",
  "Heart & Circulation": "Heart & Circulation",
  "Women’s Health": "Women’s Health",
  "Diabetes": "Diabetes",
  "Cancer": "Cancer",
  "Neurology": "Neurology",
  "Mental Health": "Mental Health",
  "General Health": "General Health",
  "End of Life": "End of Life",
  "Child & Adolescent Health": "Child & Adolescent Health",
  "Guide Hubs": "Guide Hubs",
};

// Preferred category order for listings
export const CATEGORY_ORDER: string[] = [
  "Emergencies",
  "Infectious Diseases",
  "Vaccination",
  "Heart & Circulation",
  "Women’s Health",
  "Diabetes",
  "Cancer",
  "Neurology",
  "Mental Health",
  "General Health",
  "End of Life",
  "Child & Adolescent Health",
  "Guide Hubs",
];

// Optional descriptions for cards
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Emergencies": "What to do in urgent situations.",
  "Infectious Diseases": "Prevention, treatment, and key facts.",
  "Vaccination": "Vaccines, schedules, and safety.",
  "Heart & Circulation": "Cardiac health and risk management.",
  "Women’s Health": "Conditions, prevention, and care options.",
  "Diabetes": "Type 1, Type 2, and management strategies.",
  "Cancer": "Screening, treatment, and support resources.",
  "Neurology": "Brain and nervous system conditions.",
  "General Health": "Lifestyle, prevention, and wellness.",
  "Mental Health": "Emotional well-being, psychology, and psychiatry.",
  "End of Life": "Voluntary assisted dying, palliation, choices.",
  "Child & Adolescent Health": "Browse guides in this topic.",
  "Guide Hubs": "Browse topical hubs.",
};

/** Display name -> slug (e.g. "Heart & Circulation" -> "heart-and-circulation") */
export function slugifyCategory(name: string): string {
  const display = CATEGORY_FIXES[name] ?? name;
  return display
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Slug -> display name (e.g. "heart-and-circulation" -> "Heart & Circulation") */
export function unslugifyCategory(slug: string): string {
  const target = (slug ?? "").toLowerCase();
  for (const key in CATEGORY_FIXES) {
    if (slugifyCategory(key) === target) return CATEGORY_FIXES[key];
  }
  // Fallback: title-case with spaces
  const spaced = target.replace(/-/g, " ");
  return spaced.replace(/\b\w/g, (m) => m.toUpperCase());
}
