export { default as measlesUS } from "./measles-us.json";
export { default as nipahVirus } from "./nipah-virus.json";

export type OutbreakPoint = {
  year: number;
  confirmedCases: number;
  outbreaksInvestigated?: number;
  lastUpdated: string; // ISO
  sourceName: string;
  sourceUrl?: string;
};

export type OutbreakDataset = {
  condition: string;
  region: string;
  series: OutbreakPoint[];
};

export type DatasetMap = Record<string, OutbreakDataset>;

// ✅ optional convenience export
import measlesUS from "./measles-us.json";
import nipahVirus from "./nipah-virus.json";

export const outbreakDatasets = {
  measlesUS,
  nipahVirus,
} satisfies DatasetMap;
