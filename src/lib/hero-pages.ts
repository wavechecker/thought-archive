// src/lib/hero-pages.ts
// Centralised configuration for all hero pages (category landing pages)

export interface FeaturedCluster {
  title: string;
  description: string;
  href: string;
}

export interface GuideGroup {
  name: string;
  guides: Array<{ title: string; href: string }>;
}

export interface HeroPageConfig {
  slug: string;
  title: string;
  description: string;
  whatThisCovers: string[];
  featuredClusters: FeaturedCluster[];
  guideGroups?: GuideGroup[];
  whatThisIsNot?: string[];
  categoryKey: string; // matches schema category for filtering
  categoryAliases?: string[]; // alternative category strings to match
}

export const HERO_PAGES: Record<string, HeroPageConfig> = {
  vaccination: {
    slug: "vaccination",
    title: "Vaccination",
    description: "Vaccines, schedules, safety, side effects, and evidence-based recommendations.",
    categoryKey: "Vaccination",
    whatThisCovers: [
      "How vaccines work and why they matter",
      "Disease-specific vaccination guides (measles, COVID-19, HPV, influenza)",
      "Childhood immunisation schedules",
      "Vaccine safety, myths, and adverse event monitoring",
      "Policy debates: mandates, exemptions, and global equity",
    ],
    featuredClusters: [
      {
        title: "Measles & MMR",
        description: "Outbreaks, risks, vaccination, pregnancy concerns, and travel guidance.",
        href: "/guides/measles-in-the-usa-outbreaks-vaccination",
      },
      {
        title: "COVID-19 Vaccines",
        description: "Current recommendations, safety data, and policy updates.",
        href: "/guides/covid-19-vaccines",
      },
      {
        title: "Childhood Immunisation",
        description: "Schedules, combination vaccines, and why timing matters.",
        href: "/guides/childhood-immunization-schedule",
      },
      {
        title: "Vaccine Science & Policy",
        description: "How vaccines work, mRNA technology, and global equity.",
        href: "/guides/how-vaccines-work",
      },
    ],
    guideGroups: [
      {
        name: "Measles Cluster",
        guides: [
          { title: "Measles in the USA: Outbreaks & Vaccination", href: "/guides/measles-in-the-usa-outbreaks-vaccination" },
          { title: "Measles Overview", href: "/guides/measles" },
          { title: "Measles and Pregnancy", href: "/guides/measles-pregnancy" },
          { title: "Measles and Travel", href: "/guides/measles-travel" },
          { title: "MMR Vaccine Guide", href: "/guides/measles-vaccine" },
          { title: "Why Measles Comes Back First", href: "/guides/why-measles-comes-back-first" },
        ],
      },
      {
        name: "Disease-Specific Vaccines",
        guides: [
          { title: "COVID-19 Vaccines", href: "/guides/covid-19-vaccines" },
          { title: "Whooping Cough (Pertussis)", href: "/guides/whooping-cough" },
          { title: "Hepatitis B", href: "/guides/hepatitis-b" },
          { title: "HPV Vaccine", href: "/guides/hpv-vaccine" },
          { title: "Influenza Vaccines", href: "/guides/influenza-vaccines" },
          { title: "Tetanus", href: "/guides/tetanus" },
        ],
      },
      {
        name: "Vaccine Science",
        guides: [
          { title: "How Vaccines Work", href: "/guides/how-vaccines-work" },
          { title: "mRNA Vaccines Explained", href: "/guides/mrna-vaccines" },
          { title: "Vaccine Myths and Facts", href: "/guides/vaccine-myths-and-facts" },
          { title: "Vaccines and Autism", href: "/guides/vaccines-and-autism" },
          { title: "Aluminum in Vaccines", href: "/guides/aluminum-in-vaccines" },
        ],
      },
      {
        name: "Schedules & Policy",
        guides: [
          { title: "Childhood Immunisation Schedule", href: "/guides/childhood-immunization-schedule" },
          { title: "Why Vaccine Schedules Differ by Country", href: "/guides/why-vaccine-schedules-differ-by-country" },
          { title: "Mandates and Exemptions", href: "/guides/mandates-and-exemptions" },
          { title: "Global Vaccine Equity", href: "/guides/global-vaccine-equity" },
          { title: "Vaccine Hesitancy", href: "/guides/vaccine-hesitancy" },
        ],
      },
    ],
  },

  diabetes: {
    slug: "diabetes",
    title: "Diabetes",
    description: "Type 1, Type 2, LADA, hypoglycaemia, insulin, CGM tips, exercise, sick-day rules, and emergency actions.",
    categoryKey: "Diabetes",
    whatThisCovers: [
      "Type 1, Type 2, and other forms of diabetes",
      "Blood glucose monitoring and CGM technology",
      "Insulin types and administration",
      "Managing exercise, sick days, and emergencies",
      "Diabetes in children and adolescents",
    ],
    featuredClusters: [
      {
        title: "Diabetes Hub",
        description: "Central overview connecting all diabetes guides.",
        href: "/guides/diabetes-hub",
      },
      {
        title: "Type 1 Diabetes",
        description: "Autoimmune diabetes: diagnosis, management, and daily life.",
        href: "/guides/type-1-diabetes",
      },
      {
        title: "Blood Glucose Monitoring",
        description: "CGMs, finger-prick testing, and understanding your numbers.",
        href: "/guides/blood-glucose-testing",
      },
      {
        title: "Type 1 vs Type 2",
        description: "Key differences, causes, and management approaches.",
        href: "/guides/type-1-vs-type-2-diabetes",
      },
    ],
  },

  "infectious-diseases": {
    slug: "infectious-diseases",
    title: "Infectious Diseases",
    description: "COVID-19, influenza, RSV, tick-borne diseases, antibiotics, and infection prevention.",
    categoryKey: "Infectious Diseases",
    categoryAliases: ["Infections"],
    whatThisCovers: [
      "Viral, bacterial, and fungal infections",
      "Tick-borne and insect-borne diseases",
      "Antibiotic resistance and stewardship",
      "Emerging infections and outbreaks",
      "Prevention, symptoms, and treatment options",
    ],
    featuredClusters: [
      {
        title: "Tick-Borne Diseases",
        description: "Lyme disease, tick bite management, and post-treatment syndrome.",
        href: "/guides/lyme-disease",
      },
      {
        title: "Sepsis & Severe Infections",
        description: "Recognition, emergency response, and treatment.",
        href: "/guides/sepsis",
      },
      {
        title: "Tuberculosis",
        description: "Global burden, symptoms, diagnosis, and treatment.",
        href: "/guides/tuberculosis",
      },
      {
        title: "Antibiotic Resistance",
        description: "Understanding the crisis and protecting antibiotic effectiveness.",
        href: "/guides/antibiotic-resistance",
      },
    ],
  },

  "mental-health": {
    slug: "mental-health",
    title: "Mental Health",
    description: "Anxiety, depression, ADHD, sleep, crisis support, and evidence-based self-care strategies.",
    categoryKey: "Mental Health",
    whatThisCovers: [
      "Common conditions: anxiety, depression, ADHD",
      "Sleep disorders and insomnia treatment",
      "Crisis intervention and suicide prevention",
      "Evidence-based therapies and medications",
      "Daily wellness practices and mental health first aid",
    ],
    featuredClusters: [
      {
        title: "Mental Health Toolkit",
        description: "Evidence-based habits that support mood and resilience.",
        href: "/guides/mental-health-toolkit",
      },
      {
        title: "Crisis Support",
        description: "What to do in a mental health emergency.",
        href: "/guides/mental-health-crisis-emergency",
      },
      {
        title: "Sleep & Insomnia",
        description: "CBT-I, sleep hygiene, and when to seek help.",
        href: "/guides/cbt-insomnia",
      },
      {
        title: "Anxiety",
        description: "Symptoms, triggers, and evidence-based treatments.",
        href: "/guides/anxiety",
      },
    ],
  },

  cancer: {
    slug: "cancer",
    title: "Cancer",
    description: "Screening, diagnosis, treatments, side-effects, survivorship, and support for patients and families.",
    categoryKey: "Cancer",
    whatThisCovers: [
      "Cancer types: bowel, skin, breast, cervical, prostate, liver",
      "Screening guidelines and early detection",
      "Treatment options and managing side effects",
      "Survivorship and quality of life",
      "Palliative care and family support",
    ],
    featuredClusters: [
      {
        title: "Bowel Cancer",
        description: "Screening, genetics, treatment, nutrition, and survivorship.",
        href: "/guides/bowel-cancer",
      },
      {
        title: "Skin Cancer",
        description: "Prevention, signs, diagnosis, and treatment.",
        href: "/guides/skin-cancer",
      },
      {
        title: "Cervical Cancer",
        description: "HPV, screening, and prevention.",
        href: "/guides/cervical-cancer-guide",
      },
      {
        title: "Breast Cancer",
        description: "Risk factors, screening, diagnosis, and treatment.",
        href: "/guides/breast-cancer",
      },
    ],
  },

  "womens-health": {
    slug: "womens-health",
    title: "Women's Health",
    description: "Screening, contraception, pregnancy, menopause, and common women's health conditions.",
    categoryKey: "Women's Health",
    whatThisCovers: [
      "Cervical and breast cancer screening",
      "Contraception options and reproductive health",
      "Pregnancy-related conditions and risks",
      "Menopause and hormone therapy",
      "Conditions affecting women disproportionately",
    ],
    featuredClusters: [
      {
        title: "Cervical Screening",
        description: "HPV testing, Pap smears, and self-collection.",
        href: "/guides/cervical-cancer-screening-hpv-self-testing",
      },
      {
        title: "Contraception",
        description: "Options, effectiveness, and choosing what's right for you.",
        href: "/guides/contraception-options",
      },
      {
        title: "Menopause & HRT",
        description: "Symptoms, hormone therapy, and long-term health.",
        href: "/guides/hormone-therapy-menopause",
      },
      {
        title: "Screening by Age",
        description: "Cervical screening recommendations at every life stage.",
        href: "/guides/cervical-screening-by-age",
      },
    ],
  },

  "heart-circulation": {
    slug: "heart-circulation",
    title: "Heart & Circulation",
    description: "Heart attacks, stroke, blood pressure, atrial fibrillation, and cardiac rehabilitation.",
    categoryKey: "Heart & Circulation",
    whatThisCovers: [
      "Heart attack recognition and emergency response",
      "Stroke symptoms and the FAST protocol",
      "Blood pressure management and monitoring",
      "Atrial fibrillation and heart rhythm disorders",
      "Cardiac rehabilitation and prevention",
    ],
    featuredClusters: [
      {
        title: "Heart Attack Response",
        description: "Warning signs, emergency actions, and treatment.",
        href: "/guides/heart-attack-treatment",
      },
      {
        title: "Stroke Recognition",
        description: "FAST response and understanding TIA warnings.",
        href: "/guides/stroke",
      },
      {
        title: "Blood Pressure",
        description: "Home monitoring and the 2025 guidelines.",
        href: "/guides/blood-pressure-at-home",
      },
      {
        title: "Atrial Fibrillation",
        description: "Irregular heartbeat, risks, and management options.",
        href: "/guides/atrial-fibrillation",
      },
    ],
  },

  emergencies: {
    slug: "emergencies",
    title: "Emergencies",
    description: "First aid, CPR, choking, bleeding, seizures, and when to call for help.",
    categoryKey: "Emergencies",
    whatThisCovers: [
      "CPR and basic life support",
      "Choking response for adults and children",
      "Severe bleeding and wound management",
      "Seizure first aid",
      "Anaphylaxis and allergic emergencies",
    ],
    featuredClusters: [
      {
        title: "CPR Guide",
        description: "Step-by-step cardiopulmonary resuscitation.",
        href: "/guides/cpr",
      },
      {
        title: "Choking",
        description: "Back blows, abdominal thrusts, and infant choking.",
        href: "/guides/choking",
      },
      {
        title: "Severe Allergic Reactions",
        description: "Recognising and responding to anaphylaxis.",
        href: "/guides/first-aid-for-severe-allergic-reactions",
      },
      {
        title: "Severe Bleeding",
        description: "Stopping blood loss and when to seek emergency help.",
        href: "/guides/severe-bleeding",
      },
    ],
  },

  respiratory: {
    slug: "respiratory",
    title: "Respiratory",
    description: "Asthma, COPD, sleep apnoea, shortness of breath, and breathing-related conditions.",
    categoryKey: "Respiratory",
    whatThisCovers: [
      "Chronic conditions: asthma and COPD",
      "Sleep apnoea diagnosis and treatment",
      "Shortness of breath evaluation",
      "Wheezing and night-time breathing issues",
      "Pneumonia and respiratory infections",
    ],
    featuredClusters: [
      {
        title: "Respiratory Hub",
        description: "Overview of all breathing and airway conditions.",
        href: "/guides/respiratory-hub",
      },
      {
        title: "Asthma",
        description: "Triggers, management plans, and medications.",
        href: "/guides/asthma",
      },
      {
        title: "Sleep Apnoea",
        description: "Symptoms, diagnosis, and CPAP therapy.",
        href: "/guides/sleep-apnoea",
      },
      {
        title: "COPD",
        description: "Chronic lung disease management and treatment.",
        href: "/guides/copd",
      },
    ],
  },

  neurology: {
    slug: "neurology",
    title: "Neurology",
    description: "Stroke, epilepsy, Alzheimer's, Huntington's, dizziness, and neurological conditions.",
    categoryKey: "Neurology",
    whatThisCovers: [
      "Stroke and TIA recognition",
      "Seizure disorders and epilepsy",
      "Dementia and Alzheimer's prevention",
      "Movement disorders and genetic conditions",
      "Dizziness and vestibular symptoms",
    ],
    featuredClusters: [
      {
        title: "TIA Warning Signs",
        description: "Mini-strokes: why they matter and what to do.",
        href: "/guides/tia-warning-signs",
      },
      {
        title: "Alzheimer's Prevention",
        description: "Exercise, diet, and risk reduction.",
        href: "/guides/alzheimers-prevention-and-exercise",
      },
      {
        title: "Huntington's Disease",
        description: "Genetics, symptoms, and emerging therapies.",
        href: "/guides/huntingtons-disease",
      },
      {
        title: "Seizures & Epilepsy",
        description: "Types, triggers, and first aid response.",
        href: "/guides/seizures",
      },
    ],
  },

  "child-and-adolescent-health": {
    slug: "child-and-adolescent-health",
    title: "Child & Adolescent Health",
    description: "Childhood obesity, healthy diets, immunisation, ADHD, fever, and developmental health.",
    categoryKey: "Child & Adolescent Health",
    whatThisCovers: [
      "Childhood obesity prevention and healthy weight",
      "Nutrition and healthy eating for children",
      "Common childhood illnesses and fever management",
      "ADHD and developmental conditions",
      "Immunisation schedules for children",
    ],
    featuredClusters: [
      {
        title: "Childhood Obesity Prevention",
        description: "Causes, risks, and evidence-based strategies.",
        href: "/guides/childhood-obesity-prevention",
      },
      {
        title: "Healthy Diets for Children",
        description: "Practical nutrition guidance for families.",
        href: "/guides/healthy-diets-for-children",
      },
      {
        title: "Diabetes in Children",
        description: "Type 1 and rising Type 2 in young people.",
        href: "/guides/diabetes-children-adolescents",
      },
      {
        title: "Fever in Children",
        description: "When to worry and how to manage childhood fevers.",
        href: "/guides/fever-adults-children",
      },
    ],
  },

  "mens-health": {
    slug: "mens-health",
    title: "Men's Health",
    description: "Prostate health, testosterone, erectile dysfunction, and men's preventive care.",
    categoryKey: "Men's Health",
    whatThisCovers: [
      "Prostate cancer screening and treatment",
      "Testosterone: natural optimisation and TRT",
      "Erectile dysfunction causes and treatments",
      "Men's preventive health and screening",
      "Sexual and reproductive health",
    ],
    featuredClusters: [
      {
        title: "Prostate Cancer",
        description: "Screening, diagnosis, and treatment options.",
        href: "/guides/prostate-cancer",
      },
      {
        title: "Testosterone",
        description: "Natural optimisation and replacement therapy.",
        href: "/guides/natural-testosterone-optimisation",
      },
      {
        title: "Erectile Dysfunction",
        description: "Causes, evaluation, and treatment.",
        href: "/guides/erectile-dysfunction",
      },
      {
        title: "Testosterone Replacement",
        description: "TRT: benefits, risks, and monitoring.",
        href: "/guides/testosterone-replacement-therapy",
      },
    ],
  },

  "end-of-life": {
    slug: "end-of-life",
    title: "End of Life",
    description: "Palliative care, voluntary assisted dying, advance care planning, and family support.",
    categoryKey: "End of Life",
    whatThisCovers: [
      "Palliative care principles and access",
      "Voluntary assisted dying: eligibility and process",
      "Advance care planning and directives",
      "Supporting families through end-of-life decisions",
      "Legal frameworks in Australia and globally",
    ],
    featuredClusters: [
      {
        title: "Palliative Care",
        description: "Comfort, dignity, and quality of life.",
        href: "/guides/palliative-care",
      },
      {
        title: "Voluntary Assisted Dying (Australia)",
        description: "Eligibility, process, and family guidance.",
        href: "/guides/voluntary-assisted-dying",
      },
      {
        title: "VAD: Guide for Families",
        description: "Supporting loved ones through the process.",
        href: "/guides/vad-australia-families-guide",
      },
      {
        title: "VAD Access in Australia",
        description: "State-by-state eligibility and access information.",
        href: "/guides/voluntary-assisted-dying-australia-access",
      },
    ],
  },

  "general-health": {
    slug: "general-health",
    title: "General Health",
    description: "Prevention, lifestyle, nutrition, exercise, and wellness for everyday health.",
    categoryKey: "General Health",
    whatThisCovers: [
      "Preventive health and screening",
      "Exercise and physical activity guidance",
      "Nutrition and healthy eating",
      "Sleep, stress, and lifestyle factors",
      "Understanding medical claims and health information",
    ],
    featuredClusters: [
      {
        title: "Preventive Health",
        description: "Screening, check-ups, and risk reduction.",
        href: "/guides/preventive-health",
      },
      {
        title: "Exercise Guide",
        description: "Physical activity for health and longevity.",
        href: "/guides/exercise",
      },
      {
        title: "Evaluating Medical Claims",
        description: "Critical thinking in the age of AI and misinformation.",
        href: "/guides/how-to-evaluate-medical-claims-age-of-ai",
      },
      {
        title: "Sleep & Rest",
        description: "Why sleep matters and how to improve it.",
        href: "/guides/sleep",
      },
    ],
  },

  "obesity-metabolic-health": {
    slug: "obesity-metabolic-health",
    title: "Obesity & Metabolic Health",
    description: "Weight management, GLP-1 medications, metabolic syndrome, and sustainable health strategies.",
    categoryKey: "Obesity & Metabolic Health Hub",
    whatThisCovers: [
      "Understanding obesity as a chronic condition",
      "GLP-1 medications: Ozempic, Wegovy, and others",
      "Muscle preservation during weight loss",
      "Metabolic syndrome and cardiometabolic risk",
      "Sustainable weight management strategies",
    ],
    featuredClusters: [
      {
        title: "Metabolic Health Hub",
        description: "Central guide to obesity, GLP-1s, and metabolic health.",
        href: "/guides/metabolic-health-hub",
      },
      {
        title: "Ozempic & GLP-1 Guide",
        description: "How they work, who they're for, and what to expect.",
        href: "/guides/ozempic-glp1-guide",
      },
      {
        title: "Muscle Preservation",
        description: "Protecting lean mass during weight loss.",
        href: "/guides/muscle-preservation",
      },
      {
        title: "Healthy Weight Loss",
        description: "Evidence-based approaches to sustainable weight management.",
        href: "/guides/healthy-weight-loss-guide",
      },
    ],
    guideGroups: [
      {
        name: "GLP-1 Medications",
        guides: [
          { title: "Ozempic & GLP-1 Overview", href: "/guides/ozempic-glp1-guide" },
          { title: "Ozempic Cautions", href: "/guides/ozempic-cautions" },
          { title: "GLP-1 Side Effects: Evidence vs Myth", href: "/guides/glp-1-side-effects-evidence-vs-myth" },
          { title: "GLP-1 vs Bariatric Surgery", href: "/guides/glp-1-vs-bariatric-surgery" },
          { title: "GLP-1 in Non-Obese Use", href: "/guides/glp-1-non-obese-use" },
        ],
      },
      {
        name: "Muscle & Metabolism",
        guides: [
          { title: "Muscle Preservation During Weight Loss", href: "/guides/muscle-preservation" },
          { title: "Muscle Preservation with GLP-1s", href: "/guides/muscle-preservation-glp1" },
          { title: "Protein & Muscle Health", href: "/guides/protein-muscle-health" },
          { title: "Strength & Metabolism", href: "/guides/strength-metabolism" },
          { title: "Creatine Guide", href: "/guides/creatine-guide" },
        ],
      },
      {
        name: "Weight Management",
        guides: [
          { title: "Healthy Weight Loss Guide", href: "/guides/healthy-weight-loss-guide" },
          { title: "Disciplined Eating Guide", href: "/guides/disciplined-eating-guide" },
          { title: "Waist-to-Hip Ratio", href: "/guides/waist-to-hip-ratio" },
          { title: "Obesity Basics", href: "/guides/obesity-basics" },
          { title: "Metabolic Syndrome", href: "/guides/metabolic-syndrome" },
        ],
      },
    ],
    whatThisIsNot: [
      "A diet or weight-loss program",
      "Medical advice for specific medications",
      "A replacement for consultation with a healthcare provider",
    ],
  },

  "bone-health": {
    slug: "bone-health",
    title: "Bone Health",
    description: "Osteoporosis, fractures, falls prevention, and maintaining bone strength.",
    categoryKey: "General Health", // Falls under General Health in schema
    whatThisCovers: [
      "Osteoporosis risk factors and screening",
      "Fracture prevention and recovery",
      "Falls prevention strategies",
      "Calcium, vitamin D, and bone nutrition",
    ],
    featuredClusters: [
      {
        title: "Osteoporosis",
        description: "Risk factors, diagnosis, and treatment.",
        href: "/guides/osteoporosis",
      },
      {
        title: "Fractures & Falls",
        description: "Prevention and recovery guidance.",
        href: "/guides/fractures-and-falls",
      },
      {
        title: "Bone Health Basics",
        description: "Building and maintaining strong bones at any age.",
        href: "/guides/bone-health-basics",
      },
      {
        title: "After a Fracture",
        description: "Recovery, rehabilitation, and preventing future fractures.",
        href: "/guides/after-a-fracture",
      },
    ],
  },
};

// Helper to get config by slug
export function getHeroPageConfig(slug: string): HeroPageConfig | undefined {
  return HERO_PAGES[slug];
}

// Get all hero page slugs
export function getAllHeroPageSlugs(): string[] {
  return Object.keys(HERO_PAGES);
}
