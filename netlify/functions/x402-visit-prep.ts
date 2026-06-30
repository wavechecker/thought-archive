/**
 * x402 visit-prep — paid structured appointment-preparation endpoint.
 *
 * Called by the Cloudflare x402 Worker AFTER a valid testnet payment is
 * verified AND settled. Not intended for direct browser or curl access.
 *
 * SAFETY: X402_WORKER_SECRET must match the Worker secret. Absent or
 * mismatched secret returns 403. Missing secret in production returns 500.
 *
 * Data source: curated static map in this file, derived from guide content.
 * Educational content only — not a diagnosis, treatment plan, or emergency
 * triage tool. Not a substitute for professional medical care.
 *
 * TESTNET/DEVNET ONLY — Base Sepolia (eip155:84532) and Solana Devnet.
 */

import type { Handler, HandlerEvent } from "@netlify/functions";

interface VisitPrepEntry {
  slug: string;
  title: string;
  type: "visit_prep";
  whatToTrack: string[];
  whatToBring: string[];
  questionsToAsk: string[];
  whenToSeekUrgentHelp: string[];
  disclaimer: string;
}

const DISCLAIMER =
  "Educational information only. Not a diagnosis, treatment plan, emergency triage tool, or substitute for professional medical care.";

// Curated static map — add slugs only when content has been reviewed.
// Sources: guide content. All entries are patient education, not clinical advice.
// This is appointment-preparation information, not a diagnosis or triage tool.
const VISIT_PREP: Record<string, VisitPrepEntry> = {
  hypertension: {
    slug: "hypertension",
    title: "Hypertension",
    type: "visit_prep",
    whatToTrack: [
      "Home blood pressure readings, including date, time, and which arm was used",
      "Headaches, dizziness, visual changes, chest pain, or shortness of breath",
      "Medication side effects or any missed doses",
      "New or worsening swelling in legs or ankles",
    ],
    whatToBring: [
      "Current medication list, including over-the-counter medicines and supplements",
      "Home blood pressure log or device readings",
      "Recent blood test results or other relevant results if available",
    ],
    questionsToAsk: [
      "What blood pressure range should I aim for?",
      "How often should I check my blood pressure at home?",
      "Are any of my current medicines or supplements affecting my blood pressure?",
      "What symptoms should prompt me to seek medical attention between appointments?",
      "Should I make any changes to my diet, salt intake, or physical activity?",
    ],
    whenToSeekUrgentHelp: [
      "Seek urgent care for chest pain, severe shortness of breath, fainting, sudden severe headache, confusion, weakness, or vision changes.",
    ],
    disclaimer: DISCLAIMER,
  },

  stroke: {
    slug: "stroke",
    title: "Stroke",
    type: "visit_prep",
    whatToTrack: [
      "Any new or changing neurological symptoms: weakness, numbness, speech difficulties, vision changes, or balance problems",
      "Changes in ability to perform daily tasks, walking, or communication since discharge",
      "Blood pressure readings if monitored at home",
      "Current medications, including anticoagulants or antiplatelet medicines, and any missed doses",
    ],
    whatToBring: [
      "Hospital discharge summary or letters from your care team",
      "Imaging or scan reports if available (for example, MRI or CT)",
      "Current medication list",
      "Rehabilitation or physiotherapy notes if relevant",
    ],
    questionsToAsk: [
      "What caused my stroke and what steps are being taken to prevent another?",
      "What warning signs should I watch for that might indicate another stroke?",
      "What medications am I taking to reduce my stroke risk, and for how long?",
      "Are there any restrictions on driving, work, or physical activity?",
      "What rehabilitation support is available to me?",
      "What lifestyle changes could help reduce my risk of a future stroke?",
    ],
    whenToSeekUrgentHelp: [
      "Call emergency services immediately for face drooping, arm weakness, speech difficulty, sudden severe headache, or sudden vision loss — even if symptoms resolve quickly.",
    ],
    disclaimer: DISCLAIMER,
  },

  "early-warning-signs-of-a-heart-attack": {
    slug: "early-warning-signs-of-a-heart-attack",
    title: "Early Warning Signs of a Heart Attack",
    type: "visit_prep",
    whatToTrack: [
      "Any chest pain, pressure, tightness, or discomfort — including when it occurred, how long it lasted, and what made it better or worse",
      "Associated symptoms: shortness of breath, sweating, nausea, dizziness, or arm or jaw discomfort",
      "Known risk factors: high blood pressure, high cholesterol, diabetes, smoking, or family history of heart disease",
      "Current medications, including any taken for heart-related conditions",
    ],
    whatToBring: [
      "Any hospital or clinic paperwork, ECG results, or blood test results related to recent symptoms",
      "Current medication list",
      "A description of any symptoms experienced: what they felt like, when they occurred, and how long they lasted",
      "List of known risk factors or relevant family history",
    ],
    questionsToAsk: [
      "When should I call emergency services rather than waiting to see a doctor?",
      "What symptoms in my situation are most concerning and need urgent attention?",
      "What are my main heart disease risk factors and what can I do to reduce them?",
      "What tests or investigations might be recommended for me?",
      "Are any of my current medications relevant to heart health?",
      "Is there a plan for follow-up monitoring given my symptoms or risk factors?",
    ],
    whenToSeekUrgentHelp: [
      "Call emergency services immediately for any chest pain, pressure, tightness, shortness of breath at rest, or pain spreading to the arm, jaw, or neck — do not wait or drive yourself.",
      "This checklist is for education and preparation only. If you are currently experiencing possible heart attack symptoms, call emergency services now.",
    ],
    disclaimer: DISCLAIMER,
  },

  "atrial-fibrillation": {
    slug: "atrial-fibrillation",
    title: "Atrial Fibrillation",
    type: "visit_prep",
    whatToTrack: [
      "Episodes of palpitations, irregular heartbeat, or fluttering — including timing, duration, and any triggers noticed",
      "Heart rate readings during episodes if you have a home monitor or smartwatch with rhythm tracking",
      "Dizziness, lightheadedness, breathlessness, or near-fainting episodes",
      "Current medications, particularly anticoagulants, and any missed doses",
    ],
    whatToBring: [
      "Current medication list, particularly anticoagulants or rate and rhythm control medicines",
      "ECG or rhythm strip printouts from a home device or smartwatch if available",
      "Blood pressure and heart rate readings if monitored at home",
      "Any clinic letters, echocardiogram reports, or previous cardiology notes",
    ],
    questionsToAsk: [
      "What is my stroke risk and is anticoagulation recommended for me?",
      "What symptoms should prompt me to seek urgent medical attention?",
      "What are the options for managing my heart rate or rhythm?",
      "Are there triggers I should try to avoid, such as alcohol, caffeine, or stress?",
      "How often should I be monitored and what follow-up is recommended?",
      "Are there any activity, travel, or driving restrictions I should be aware of?",
    ],
    whenToSeekUrgentHelp: [
      "Seek emergency care for sudden severe chest pain, collapse, loss of consciousness, or stroke symptoms such as face drooping, arm weakness, or speech difficulty.",
      "Seek urgent care for palpitations with severe dizziness, near-fainting, or breathlessness that does not settle quickly.",
    ],
    disclaimer: DISCLAIMER,
  },

  "type-1-diabetes": {
    slug: "type-1-diabetes",
    title: "Type 1 Diabetes",
    type: "visit_prep",
    whatToTrack: [
      "Blood glucose readings, ideally with dates, times, and any patterns (high, low, or variable)",
      "Episodes of hypoglycaemia: frequency, severity, and whether warning signs were noticed",
      "Ketone readings if you have been monitoring during illness or high glucose periods",
      "Insulin dose questions or concerns, and any sick-day management issues",
      "Changes in diet, activity level, or anything that may have affected glucose control",
    ],
    whatToBring: [
      "Glucose log or CGM (continuous glucose monitor) summary if available",
      "Insulin regimen details and current supply situation",
      "Blood glucose meter or CGM device",
      "Any ketone readings from periods of illness or high glucose",
      "Recent HbA1c results if available",
    ],
    questionsToAsk: [
      "What glucose and HbA1c targets are right for me?",
      "What should I do if my blood glucose drops severely or I cannot eat?",
      "What is my sick-day plan for when I am unwell and struggling to manage glucose?",
      "When should I check ketones and what should I do if they are high?",
      "Are my current insulin doses and supplies right for my needs?",
      "When is my next review and what follow-up is recommended?",
    ],
    whenToSeekUrgentHelp: [
      "Seek emergency care immediately for vomiting, deep or rapid breathing, fruity-smelling breath, or confusion — these can be signs of diabetic ketoacidosis (DKA).",
      "Call emergency services for loss of consciousness or a severe hypoglycaemia episode you cannot treat yourself.",
    ],
    disclaimer: DISCLAIMER,
  },

  asthma: {
    slug: "asthma",
    title: "Asthma",
    type: "visit_prep",
    whatToTrack: [
      "Frequency and severity of symptoms: wheeze, cough, chest tightness, or breathlessness",
      "How often you use your reliever inhaler, and whether symptoms improve with it",
      "Night-time waking due to asthma symptoms",
      "Possible triggers such as exercise, cold air, dust, animals, or respiratory infections",
      "Peak flow readings if you use a peak flow meter",
    ],
    whatToBring: [
      "All your inhalers — reliever and preventer — and spacer device if used",
      "Your written asthma action plan if you have one",
      "Symptom diary or peak flow diary if kept",
      "Peak flow readings including personal best, if known",
    ],
    questionsToAsk: [
      "Am I using my inhaler(s) with the right technique?",
      "Is my current treatment plan right for my level of symptoms?",
      "What are my triggers and how can I reduce exposure to them?",
      "Do I have an up-to-date written asthma action plan?",
      "When should I seek urgent help if my symptoms worsen?",
      "How often should my asthma be reviewed?",
    ],
    whenToSeekUrgentHelp: [
      "Call emergency services for severe breathlessness at rest, inability to speak in full sentences, blue or grey lips or fingernails, or a reliever inhaler that is not helping.",
      "Seek urgent care for rapid worsening of symptoms that is not improving with your usual treatment.",
    ],
    disclaimer: DISCLAIMER,
  },

  sepsis: {
    slug: "sepsis",
    title: "Sepsis",
    type: "visit_prep",
    whatToTrack: [
      "Recovery progress: energy levels, temperature, wound healing, or changes at the infection site",
      "Any new or returning symptoms: fever, chills, rapid breathing, confusion, or reduced urine output",
      "Completion of antibiotics or other prescribed treatments",
      "Any concerns about wound care, line or catheter sites, or ongoing signs of infection",
    ],
    whatToBring: [
      "Hospital discharge summary or letters, including any culture or blood test results",
      "Current medication list, particularly antibiotics if still in course",
      "Details of the infection site or source, if known",
      "Any follow-up instructions or clinic letters from your hospital stay",
    ],
    questionsToAsk: [
      "What was the source of my infection and has it been fully treated?",
      "What symptoms should prompt me to seek urgent care during my recovery?",
      "Are there any follow-up tests needed to monitor organ function or recovery?",
      "How long is my antibiotic course and is it important to complete it?",
      "What is a realistic timeline for recovery?",
      "Are there any longer-term effects I should be aware of after sepsis?",
    ],
    whenToSeekUrgentHelp: [
      "Seek emergency care immediately for confusion, extreme drowsiness, rapid breathing, high fever or abnormally low body temperature, reduced urine output, or mottled skin — especially in the context of a recent infection or illness.",
      "If you have recently been treated for sepsis, do not wait — get help immediately if your condition worsens.",
    ],
    disclaimer: DISCLAIMER,
  },

  depression: {
    slug: "depression",
    title: "Depression",
    type: "visit_prep",
    whatToTrack: [
      "Mood over time: days when symptoms are better or worse, and any patterns or triggers",
      "Sleep quality and duration, appetite, energy levels, and ability to concentrate or function",
      "Any thoughts of self-harm or feeling unable to keep yourself safe",
      "Response to any current medication or therapy, including side effects",
    ],
    whatToBring: [
      "A brief description of your symptoms and how long they have been present",
      "Current medication list, including any prescribed for mental health",
      "Details of any previous treatments, therapies, or support you have tried",
      "Contact details for any current therapist, mental health worker, or support contacts",
    ],
    questionsToAsk: [
      "What support options are available to me, including therapy and medication?",
      "If I am already on medication, how will we know if it is working?",
      "What is the plan if my symptoms do not improve?",
      "What is a crisis or safety plan and how do I access urgent support?",
      "How do I get help outside of regular appointments if I am struggling?",
      "How often will I be seen for follow-up?",
    ],
    whenToSeekUrgentHelp: [
      "If you are having thoughts of ending your life or cannot keep yourself safe, seek help now. Call emergency services, go to your nearest emergency department, or call a crisis line — in the US call or text 988; in the UK call 116 123 (Samaritans); in Australia call 13 11 14 (Lifeline).",
      "Do not wait for a scheduled appointment if you are in crisis.",
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

  // ── Visit-prep lookup ───────────────────────────────────────────────────
  const entry = VISIT_PREP[slug];

  if (!entry) {
    return json(404, { error: "guide_not_found" });
  }

  return json(200, entry);
};
