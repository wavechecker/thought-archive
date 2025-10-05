// src/components/OutbreakTracker.tsx
import React, { useEffect, useState } from "react";

type TrackerData = {
  cases?: number;
  statesAffected?: number;
  hospitalizations?: number;
  deaths?: number;
  lastUpdated?: string; // ISO (YYYY-MM-DD)
  sourceName?: string;
  sourceUrl?: string;
};

type Props = {
  title?: string;
  region?: string;
  lastUpdated?: string;
  sourceName?: string;
  sourceUrl?: string;
  cases?: number;
  statesAffected?: number;
  hospitalizations?: number;
  deaths?: number;
  dataUrl?: string; // e.g. "/data/measles-us.json"
};

export default function OutbreakTracker({
  title = "Current Measles Situation",
  region = "United States",
  lastUpdated,
  sourceName = "CDC",
  sourceUrl = "https://www.cdc.gov/measles/cases-outbreaks.html",
  cases,
  statesAffected,
  hospitalizations,
  deaths,
  dataUrl = "/data/measles-us.json",
}: Props) {
  const [data, setData] = useState<TrackerData>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (dataUrl) {
          const res = await fetch(dataUrl, { cache: "no-store" });
          if (res.ok) {
            const json: TrackerData = await res.json();
            if (!cancelled) setData(json);
            return;
          }
        }
      } catch {}
      if (!cancelled) {
        setData({
          cases,
          statesAffected,
          hospitalizations,
          deaths,
          lastUpdated,
          sourceName,
          sourceUrl,
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  const d: TrackerData = {
    cases: data.cases ?? cases,
    statesAffected: data.statesAffected ?? statesAffected,
    hospitalizations: data.hospitalizations ?? hospitalizations,
    deaths: data.deaths ?? deaths,
    lastUpdated: data.lastUpdated ?? lastUpdated,
    sourceName: data.sourceName ?? sourceName,
    sourceUrl: data.sourceUrl ?? sourceUrl,
  };

  return (
    <div className="border-l-4 border-red-600 bg-red-50 p-4 rounded-2xl shadow-sm mb-6">
      <h3 className="font-semibold text-red-700">
        {title} — {region}
      </h3>

      <p className="text-sm mt-1">
        {typeof d.cases === "number" ? (
          <>
            <strong>{d.cases.toLocaleString()}</strong> confirmed cases
          </>
        ) : (
          <>Current cases: <em>n/a</em></>
        )}
        {typeof d.statesAffected === "number" && (
          <>
            {" "}across <strong>{d.statesAffected}</strong> states
          </>
        )}
        .
      </p>

      <ul className="text-sm mt-2 list-disc ml-5">
        {typeof d.hospitalizations === "number" && (
          <li>
            Hospitalizations: <strong>{d.hospitalizations.toLocaleString()}</strong>
          </li>
        )}
        {typeof d.deaths === "number" && (
          <li>
            Deaths: <strong>{d.deaths.toLocaleString()}</strong>
          </li>
        )}
      </ul>

      <p className="text-xs text-gray-600 mt-2">
        {d.lastUpdated ? (
          <>Last updated {new Date(d.lastUpdated).toLocaleDateString()}</>
        ) : (
          <>Last updated: —</>
        )}
        {" · "}
        Source:{" "}
        {d.sourceUrl ? (
          <a href={d.sourceUrl} className="underline" rel="noopener noreferrer">
            {d.sourceName ?? "Source"}
          </a>
        ) : (
          d.sourceName ?? "Source"
        )}
      </p>
    </div>
  );
}
