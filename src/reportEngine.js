// Master Validation Report engine — intelligent model routing:
//   Gemini 1.5 Pro  → validation, market, plan   (logic-heavy: financials, reasoning)
//   Gemini 1.5 Flash → strategy, visuals, marketing (creative/volume: copy, brand, SEO)

// Free tier does NOT allow gemini-2.5-pro (quota limit 0 — needs billing).
// Logic-heavy sections use 2.5-flash (best free reasoning, has "thinking");
// creative sections use 2.0-flash (fast, separate quota bucket).
// To upgrade to true Pro reasoning later, enable billing and set MODEL_PRO = "gemini-2.5-pro".
const MODEL_PRO   = "gemini-2.5-flash";
const MODEL_FLASH = "gemini-2.0-flash";

const FORMAT_RULES = `OUTPUT FORMAT — every key maps to an ARRAY of content blocks, in reading order. Allowed block types (use these exact shapes):
{"h":"Short heading"}
{"p":"40-90 word paragraph"}
{"list":["crisp point","crisp point"]}
{"stats":[{"label":"TAM","value":"$4.2B","sub":"2026, bottom-up"}]}
{"bars":{"title":"Competitor pricing ($/mo)","items":[{"label":"Rival A","value":29},{"label":"Rival B","value":49}]}}
{"table":{"cols":["Competitor","Price","Key weakness"],"rows":[["Rival A","$29/mo","No mobile app"]]}}

RULES:
- Each key: 4-7 blocks. Start with one {"h"} then {"p"}; alternate headings with content.
- Include at least one stats, bars, or table block per key wherever numbers fit (sizing, pricing, scoring, timelines, budgets).
- "bars" values must be plain numbers on one comparable scale; put the unit in the title.
- Use concrete numbers (market sizes, prices, %, timelines) with assumptions stated; mark estimates "(est.)".
- Name real competitors, tools, channels, and communities. Numbers must be internally consistent across blocks.
- Zero generic startup advice — every block must be specific to this exact idea.`;

const ctx = (f) => `STARTUP UNDER ANALYSIS
Name: "${f.name}"
One-liner: "${f.oneliner}"
Category: ${f.category}
Stage: ${{ idea: "Idea only", proto: "Prototype/MVP underway", live: "Already live" }[f.stage] || f.stage}
Problem: "${f.problem}"
Solution: "${f.solution}"
Target customer: "${f.market}"
Founder's unique insight: "${f.edge || "Not provided"}"`;

const SECTIONS = [
  // ── PRO: logic-heavy ──────────────────────────────────────────────────────
  {
    id: "validation",
    model: MODEL_PRO,
    role: "a brutally honest startup validation analyst (ex-YC partner)",
    keys: {
      Summary: "Executive validation verdict: what this idea really is, why it will or won't work, the single biggest make-or-break factor, and your overall recommendation (pursue / pivot / pass) with reasoning.",
      Scores: "Score breakdown with justification: Market Opportunity, Feasibility, Competitive Edge, Originality, Timing, Founder-Market Fit — each scored /100 with 2-3 sentences explaining exactly why, plus what would move each score 10 points higher.",
      Market: "Demand validation: evidence the problem is real and painful, who pays today and what they pay, demand signals to test, and the fastest cheap experiments to confirm or kill the idea.",
      Financials: "Unit economics sketch: realistic pricing model, CAC/LTV estimates with assumptions, gross margin profile, monthly burn at MVP stage, revenue needed to reach default-alive, and break-even timeline.",
      Roadmap: "0→18 month roadmap: phase-by-phase milestones (validate, build, launch, grow), what to build vs skip at each phase, headcount plan, and the kill/pivot decision gates with explicit criteria.",
      Journey: "Customer journey map: how the target customer discovers, evaluates, buys, onboards, gets value, and refers — with the friction point at each step and how this product removes it.",
    },
    meta: `"_meta": {"overallScore": <0-100 int>, "badge": "<Strong Potential|Promising|Needs Refinement|High Risk>", "marketScore": <0-100>, "feasibilityScore": <0-100>, "competitiveEdgeScore": <0-100>, "originalityScore": <0-100>},`,
  },
  {
    id: "market",
    model: MODEL_PRO,
    role: "a senior market research director producing an investor-grade market study",
    keys: {
      Market: "Market sizing: TAM/SAM/SOM with explicit bottom-up math, growth rate, market maturity stage, key tailwinds and headwinds, and regulatory factors.",
      Audience: "Audience deep-dive: 2-3 detailed buyer personas (name, role, income, daily pain, buying trigger, objections), where they congregate online/offline, and willingness-to-pay analysis.",
      Competitors: "Competitive landscape: 4-6 named real competitors or close analogues with their pricing, positioning, strengths, weaknesses, and the specific gap this idea exploits; include indirect alternatives (spreadsheets, doing nothing).",
      Strategy: "Market-entry strategy: beachhead segment choice and why, positioning statement, wedge feature, expansion sequence to adjacent segments, and defensibility/moat-building plan.",
      "Risks & Ops": "Risk register and operations: top 6 risks (market, execution, regulatory, platform, funding, talent) each with likelihood, impact, and mitigation; plus the operational requirements to serve the first 1,000 customers.",
      Sources: "Research sources: the specific reports, databases, communities, keyword tools, and validation methods a founder should use to verify every claim above, with what to look for in each.",
    },
  },
  {
    id: "plan",
    model: MODEL_PRO,
    role: "a startup CFO and strategy consultant writing a full business plan",
    keys: {
      Overview: "Business plan executive summary: mission, vision, the opportunity in one paragraph, business model, current stage, and 3-year headline targets.",
      Plan: "Operating plan: legal structure recommendation, key milestones by quarter for year 1, team/hiring plan with roles and timing, and the critical path dependencies.",
      Market: "Market section of the plan: addressable market with sizing math, target market definition, market trends that justify timing, and barriers to entry.",
      Audience: "Customer analysis: primary and secondary segments, segment prioritization with reasoning, customer acquisition cost expectations per segment, and retention/expansion dynamics.",
      Competitors: "Competition section: positioning map description (axes and where everyone sits), feature/price comparison of top rivals, switching costs, and sustainable differentiation.",
      Strategy: "Growth strategy: go-to-market motion (PLG/sales-led/community-led) with justification, pricing strategy and tiers with actual numbers, partnership opportunities, and 18-month growth targets.",
      Risks: "Risk analysis: SWOT, the 3 assumptions most likely to be wrong, scenario planning (best/base/worst case revenue), and contingency triggers.",
      Financials: "Financial projections: 3-year P&L summary (revenue, COGS, opex, EBITDA by year with assumptions), funding requirement and use of funds, runway math, and key financial ratios to track.",
      "Internal Tools": "Internal stack: the exact tools/software to run this business (product, analytics, CRM, support, finance, ops) with monthly cost estimates and when to adopt each, totaling a realistic tooling budget.",
      Sources: "Plan appendix sources: data sources behind every financial assumption, comparable-company benchmarks to cite, and how to keep the plan updated quarterly.",
    },
  },

  // ── FLASH: creative/volume ────────────────────────────────────────────────
  {
    id: "strategy",
    model: MODEL_FLASH,
    role: "a brand strategist from a top-tier agency building a complete brand strategy",
    keys: {
      Overview: "Brand strategy foundation: brand purpose, vision, mission, values, brand promise, personality archetype with justification, and one-line brand essence.",
      Naming: "Naming strategy: evaluation of the current name (memorability, spelling, domain, trademark risk), 8-10 alternative name candidates with rationale for each, and a clear final recommendation.",
      Color: "Color strategy: the psychology this brand should evoke, recommended palette direction with reasoning tied to category conventions (follow or break them, and why), and how color should differ across product vs marketing.",
      Type: "Typography strategy: the typographic voice (e.g., geometric/humanist/grotesque) and why it fits, pairing strategy for display vs body, and accessibility/legibility requirements.",
      Voice: "Brand voice: tone-of-voice definition with 4 voice attributes, do/don't writing examples for each attribute, and how the voice flexes across website, app, support, and social.",
      Content: "Content strategy: 4-5 content pillars with example topics, content formats per pillar, publishing cadence, distribution channels, and how content ladders up to the brand promise.",
      Art: "Art direction strategy: visual world definition (photography vs illustration vs 3D, mood, composition rules), reference aesthetics from adjacent categories, and what to explicitly avoid.",
    },
  },
  {
    id: "visuals",
    model: MODEL_FLASH,
    role: "a senior brand designer delivering a concrete visual identity spec",
    keys: {
      Overview: "Visual identity system overview: logo concept directions (3 distinct routes described in detail), clear-space and usage rules, and how the system scales from favicon to billboard.",
      Naming: "Wordmark and lockup specs: how the name should be set (case, weight, letter-spacing), icon/symbol concept, app-icon treatment, and social avatar guidance.",
      Color: "Exact color palette: primary, secondary, and neutral colors with specific hex codes, usage ratios (60/30/10), dark-mode variants, semantic colors (success/warning/error), and contrast-checked text/background pairs.",
      Type: "Exact type system: named font recommendations (Google Fonts where possible) for display and body with fallback stacks, a full type scale (sizes/weights/line-heights for h1→caption), and responsive sizing rules.",
      Voice: "Visual voice in UI copy: microcopy style spec — button labels, empty states, error messages, onboarding copy — with 5+ written examples in the brand voice.",
      Content: "Visual content templates: spec for 4-5 reusable templates (social post, blog header, product screenshot frame, email header) with dimensions, layout grids, and composition rules.",
      Art: "Concrete art direction: imagery treatment specs (color grading, subjects, crops), iconography style (stroke weight, corner radius, grid), illustration rules if any, and a shot-list/asset checklist for launch.",
    },
  },
  {
    id: "marketing",
    model: MODEL_FLASH,
    role: "a growth marketing lead building a full launch-ready marketing suite",
    keys: {
      Overview: "Marketing strategy overview: core message hierarchy, primary/secondary channels with budget split, 90-day marketing plan, and the north-star metric plus supporting KPIs.",
      "Ad Copy": "Ready-to-use ad copy: 3 Google Search ads (headlines + descriptions), 3 Meta ad variants (hook/body/CTA), 2 LinkedIn ads, plus 5 headline formulas tailored to this audience — all written out in full.",
      "Visual Ads": "Visual ad concepts: 4-5 scroll-stopping ad creative concepts described in production-ready detail (visual, headline overlay, format, placement) with the psychological trigger each uses.",
      Channels: "Channel playbook: rank the top 6 acquisition channels for this specific idea with expected CAC, time-to-results, effort level, and a concrete first-experiment for each.",
      UGC: "UGC and social proof engine: UGC brief templates, creator outreach script, incentive structure, review-generation flow, and 5 UGC video concepts with hooks written out.",
      Funnel: "Full-funnel design: awareness→consideration→conversion→retention→referral with the asset, channel, message, and metric at each stage, plus the email/onboarding sequence outlined message by message.",
      SEO: "SEO plan: 15-20 target keywords with intent classification, content cluster structure, 5 priority article titles with outlines, technical SEO checklist, and realistic traffic timeline.",
      Launch: "Launch plan: week-by-week 4-week launch sequence (waitlist, Product Hunt, communities, press), launch-day checklist, the exact Product Hunt tagline + first comment draft, and post-launch momentum plan.",
    },
  },
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function geminiJSON(prompt, model, key) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.45,
            maxOutputTokens: 8192,
          },
        }),
      });
      if (r.status === 429 || r.status >= 500) {
        const wait = 6000 * (attempt + 1);
        lastErr = new Error(`Gemini ${r.status}, waiting ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        throw new Error(`Gemini ${r.status}: ${body.slice(0, 300)}`);
      }
      const data = await r.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned empty response");
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      if (/^Gemini 4\d\d/.test(e.message) && !e.message.startsWith("Gemini 429")) throw e;
      await sleep(3000 * (attempt + 1));
    }
  }
  throw lastErr || new Error("Gemini failed");
}

function buildPrompt(section, form) {
  const keyLines = Object.entries(section.keys)
    .map(([k, v]) => `  "${k}": [<content blocks covering: ${v}>]`)
    .join(",\n");
  return `You are ${section.role}. Produce the deepest, most accurate, most specific analysis you are capable of. Sanity-check every number for real-world plausibility before writing it — wrong numbers destroy founder trust. Return ONLY valid JSON.

${ctx(form)}

Return this exact JSON structure — every key below, each value an ARRAY of content blocks:
{
${section.meta ? "  " + section.meta + "\n" : ""}${keyLines}
}

${FORMAT_RULES}`;
}

// Runs all 6 section analyses with limited concurrency (2 workers).
// Pro and Flash calls run in parallel across workers naturally.
// onProgress(done, total) fires as each section completes.
export async function generateMasterReport(form, onProgress) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("VITE_GEMINI_API_KEY missing — add to .env.local and restart.");

  const sections = {};
  const errors = [];
  let meta = null;
  let done = 0;
  const queue = [...SECTIONS];

  const worker = async () => {
    while (queue.length) {
      const s = queue.shift();
      try {
        const out = await geminiJSON(buildPrompt(s, form), s.model, key);
        if (out._meta) { meta = out._meta; delete out._meta; }
        sections[s.id] = out;
      } catch (e) {
        console.error(`section ${s.id} failed (${s.model})`, e);
        errors.push(`${s.id}: ${e.message}`);
      }
      onProgress?.(++done, SECTIONS.length);
    }
  };

  await Promise.all([worker(), worker()]);
  if (!Object.keys(sections).length) throw new Error(errors[0] || "All report sections failed");
  return { sections, meta };
}
