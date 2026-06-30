/**
 * x402 red-flags — paid structured urgent-care signals endpoint.
 *
 * Called by the Cloudflare x402 Worker AFTER a valid testnet payment is
 * verified AND settled. Not intended for direct browser or curl access.
 *
 * SAFETY: X402_WORKER_SECRET must match the Worker secret. Absent or
 * mismatched secret returns 403. Missing secret in production returns 500.
 *
 * Data source: curated static map in this file.
 * Educational content only — not a diagnosis or emergency triage tool.
 *
 * TESTNET/DEVNET ONLY — Base Sepolia (eip155:84532) and Solana Devnet.
 */

import type { Handler, HandlerEvent } from "@netlify/functions";

interface RedFlag {
  signal: string;
  whyItMatters: string;
  suggestedAction: string;
}

interface RedFlagsEntry {
  slug: string;
  title: string;
  type: "red_flags";
  redFlags: RedFlag[];
  disclaimer: string;
}

const DISCLAIMER =
  "Educational information only. Not a diagnosis, emergency triage tool, or substitute for professional medical care. If symptoms are severe, sudden, or concerning, seek urgent medical help.";

// Curated static map — add slugs only when content has been reviewed.
// Sources: guide content and broadly accepted urgent-care signals from clinical literature.
// This is educational information, not a diagnosis or triage tool.
const RED_FLAGS: Record<string, RedFlagsEntry> = {
  hypertension: {
    slug: "hypertension",
    title: "Hypertension",
    type: "red_flags",
    redFlags: [
      {
        signal: "Chest pain, pressure, or tightness",
        whyItMatters:
          "Can indicate a heart attack or another urgent cardiovascular problem.",
        suggestedAction: "Seek urgent medical care immediately.",
      },
      {
        signal:
          "Severe headache with confusion, weakness, vision changes, or trouble speaking",
        whyItMatters:
          "Can suggest stroke, hypertensive emergency, or another serious neurological problem.",
        suggestedAction: "Seek emergency care immediately.",
      },
      {
        signal: "Shortness of breath, fainting, or severe dizziness",
        whyItMatters:
          "Can occur with heart, lung, or blood pressure emergencies.",
        suggestedAction: "Seek urgent medical care.",
      },
    ],
    disclaimer: DISCLAIMER,
  },

  stroke: {
    slug: "stroke",
    title: "Stroke",
    type: "red_flags",
    redFlags: [
      {
        signal: "Face drooping, arm weakness, or sudden speech difficulty",
        whyItMatters:
          "These are classic stroke warning signs (FAST). Even brief or resolving symptoms can indicate a stroke or TIA, which carries high short-term risk of a larger stroke.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal: "Sudden severe headache with no obvious cause",
        whyItMatters:
          "Can indicate a haemorrhagic stroke or other serious neurological emergency.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal:
          "Sudden vision loss, double vision, or severe unexplained dizziness with other neurological symptoms",
        whyItMatters:
          "Can be symptoms of a stroke affecting vision or balance centres.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal:
          "Any suspected stroke symptoms, even if they resolve quickly",
        whyItMatters:
          "A transient ischaemic attack (TIA or 'mini-stroke') can look identical to a stroke but resolve within minutes. It is a medical emergency because stroke risk is highest in the hours and days following a TIA.",
        suggestedAction:
          "Seek emergency assessment immediately — do not wait to see if symptoms return.",
      },
    ],
    disclaimer: DISCLAIMER,
  },

  "atrial-fibrillation": {
    slug: "atrial-fibrillation",
    title: "Atrial Fibrillation",
    type: "red_flags",
    redFlags: [
      {
        signal: "Sudden severe chest pain",
        whyItMatters:
          "Can indicate an urgent cardiac emergency in someone with atrial fibrillation.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal:
          "Sudden shortness of breath at rest, collapse, or loss of consciousness",
        whyItMatters:
          "Can indicate a serious cardiac complication, including a dangerously fast heart rate or heart failure.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal:
          "Stroke symptoms — face drooping, arm weakness, or speech difficulty",
        whyItMatters:
          "Atrial fibrillation significantly increases stroke risk. These are signs of possible stroke and require immediate emergency response.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal: "Palpitations with severe dizziness, near-fainting, or fainting",
        whyItMatters:
          "Can suggest a dangerously fast or unstable heart rhythm requiring urgent assessment.",
        suggestedAction: "Seek urgent medical care or call emergency services.",
      },
    ],
    disclaimer: DISCLAIMER,
  },

  "type-1-diabetes": {
    slug: "type-1-diabetes",
    title: "Type 1 Diabetes",
    type: "red_flags",
    redFlags: [
      {
        signal:
          "Vomiting, abdominal pain, deep or rapid breathing, or fruity-smelling breath in someone with Type 1 diabetes",
        whyItMatters:
          "Can indicate diabetic ketoacidosis (DKA), a life-threatening emergency that requires immediate hospital treatment.",
        suggestedAction: "Seek emergency care immediately.",
      },
      {
        signal:
          "Confusion, difficulty waking, seizure, or loss of consciousness with known or suspected low blood sugar",
        whyItMatters:
          "Can indicate severe hypoglycaemia, which can cause serious harm if not treated promptly.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal:
          "High blood glucose with vomiting or inability to keep fluids down during illness",
        whyItMatters:
          "Illness can rapidly raise glucose and ketone levels in Type 1 diabetes, increasing DKA risk — particularly when oral intake is not possible.",
        suggestedAction: "Seek same-day medical advice.",
      },
      {
        signal:
          "Extreme drowsiness, rapid breathing, or altered consciousness in someone with Type 1 diabetes",
        whyItMatters:
          "Can indicate DKA or severe hypoglycaemia — both may require emergency treatment.",
        suggestedAction: "Call emergency services immediately.",
      },
    ],
    disclaimer: DISCLAIMER,
  },

  asthma: {
    slug: "asthma",
    title: "Asthma",
    type: "red_flags",
    redFlags: [
      {
        signal:
          "Severe breathlessness — unable to speak in full sentences, or breathing rapidly at rest",
        whyItMatters:
          "Can indicate a severe asthma attack that may require emergency treatment.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal: "Blue or grey tinge to lips, tongue, or fingernails",
        whyItMatters:
          "Can indicate dangerously low oxygen levels — a life-threatening emergency.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal:
          "Reliever inhaler providing little or no relief, or symptoms worsening rapidly",
        whyItMatters:
          "A reliever that stops working can suggest the airway obstruction is severe and escalating.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal: "Drowsiness, confusion, or exhaustion during breathing difficulty",
        whyItMatters:
          "Can indicate respiratory failure — the body is tiring from the effort of breathing.",
        suggestedAction: "Call emergency services immediately.",
      },
    ],
    disclaimer: DISCLAIMER,
  },

  sepsis: {
    slug: "sepsis",
    title: "Sepsis",
    type: "red_flags",
    redFlags: [
      {
        signal:
          "Confusion, extreme drowsiness, or very difficult to rouse during or after an infection",
        whyItMatters:
          "Altered consciousness during infection is a recognised early sign of sepsis affecting the brain and circulation.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal:
          "Fast breathing, shortness of breath, or rapid heart rate alongside infection",
        whyItMatters:
          "Can indicate the body's immune response is becoming systemic and dangerous.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal:
          "Mottled, clammy, or pale skin, or cold hands and feet during an infection",
        whyItMatters:
          "Can indicate circulatory failure, which is a sign of deteriorating sepsis.",
        suggestedAction: "Call emergency services immediately.",
      },
      {
        signal:
          "Fever or abnormally low body temperature with rapid overall worsening",
        whyItMatters:
          "Both high and unusually low body temperatures during infection can indicate sepsis. Rapid deterioration is a key warning signal.",
        suggestedAction: "Seek emergency care immediately.",
      },
      {
        signal: "Significantly reduced or absent urine output during illness",
        whyItMatters:
          "Can indicate kidney involvement, which is a sign of organ dysfunction in sepsis.",
        suggestedAction: "Seek urgent medical care.",
      },
    ],
    disclaimer: DISCLAIMER,
  },

  depression: {
    slug: "depression",
    title: "Depression",
    type: "red_flags",
    redFlags: [
      {
        signal: "Thoughts of ending your life or harming yourself",
        whyItMatters:
          "These thoughts can indicate a crisis that requires immediate support. You are not alone — help is available.",
        suggestedAction:
          "Contact emergency services or a crisis helpline immediately. In the US call or text 988; in the UK call 116 123 (Samaritans); in Australia call 13 11 14 (Lifeline).",
      },
      {
        signal: "Feeling unable to keep yourself safe right now",
        whyItMatters: "Immediate safety concerns require immediate support.",
        suggestedAction:
          "Call emergency services or go to your nearest emergency department immediately.",
      },
      {
        signal: "Complete inability to eat, drink, or perform basic self-care",
        whyItMatters:
          "Severe depression can impair basic functioning to a degree that requires urgent clinical assessment.",
        suggestedAction: "Seek same-day medical advice.",
      },
      {
        signal:
          "Sudden onset of confusion, unusual beliefs, or hearing or seeing things",
        whyItMatters:
          "Psychotic symptoms alongside severe depression can indicate a serious condition requiring urgent specialist assessment.",
        suggestedAction: "Seek urgent medical care.",
      },
    ],
    disclaimer: DISCLAIMER,
  },
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

const isLocalDev = process.env.CONTEXT === "dev" || !process.env.NETLIFY;

function json(status: number, body: unknown, extra?: Record<string, string>): ReturnType<Handler> {
  return {
    statusCode: status,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  };
}

export const handler: Handler = async (event: HandlerEvent) => {
  // ── Secret enforcement ──────────────────────────────────────────────────
  const expectedSecret = process.env.X402_WORKER_SECRET;

  if (!expectedSecret) {
    if (!isLocalDev) {
      return json(500, { error: "x402_origin_not_configured" });
    }
  } else {
    const provided = event.headers["x-worker-secret"];
    if (provided !== expectedSecret) {
      return json(403, { error: "forbidden" });
    }
  }

  // ── Slug validation ─────────────────────────────────────────────────────
  const slug = event.queryStringParameters?.slug ?? null;

  if (!slug) {
    return json(400, { error: "missing_slug" });
  }

  if (!SLUG_RE.test(slug)) {
    return json(400, { error: "invalid_slug" });
  }

  // ── Red-flags lookup ────────────────────────────────────────────────────
  const entry = RED_FLAGS[slug];

  if (!entry) {
    return json(404, { error: "guide_not_found" });
  }

  return json(200, entry);
};
