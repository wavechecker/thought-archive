// src/lib/mdx-components.ts
import type { MDXComponents } from "mdx/types";

// Real components you have
import StratBox from "@/components/StratBox.astro";
import EvidenceBox from "@/components/EvidenceBox.astro";

// Optional/legacy / used in some guides
import Callout from "@/components/Callout.astro";
import RiskBadge from "@/components/RiskBadge.astro";
import DrugCompare from "@/components/DrugCompare.astro";

// Compatibility shim (StatBox -> StratBox)
import StatBox from "@/components/StatBox.astro";

// Safe fallback
import MdxNull from "@/components/MdxNull.astro";

/**
 * IMPORTANT:
 * - Keys MUST match the tag names used in MDX exactly.
 * - Any component not listed here will crash if used by MDX at build time.
 */
export const mdxComponents: MDXComponents = {
  // common
  StratBox,
  EvidenceBox,

  // used in some older/newer guides
  Callout,
  StatBox,
  RiskBadge,
  DrugCompare,

  // Optional aliases if any content used different casing/names
  Evidencebox: EvidenceBox as any,
  Stratbox: StratBox as any,

  // Safety: allow <MdxNull /> if you ever swap something out
  MdxNull,
};
