import { generateId } from "./utils";
import { DeckSlide } from "@/types";

export interface DeckTemplate {
  id: string;
  name: string;
  tagline: string;
  theme: string;
  build: (title: string) => { title: string; description: string; slides: DeckSlide[] };
}

function s(
  layout: DeckSlide["layout"],
  kicker: string,
  title: string,
  content?: string[] | string,
  notesOrOpts?: string | { stats?: Array<{ value: string; label: string } | [string, string]>; contentRight?: string[]; notes?: string },
  opts?: { stats?: Array<{ value: string; label: string } | [string, string]>; contentRight?: string[]; notes?: string }
): DeckSlide {
  const contentArr = content === undefined ? [] : Array.isArray(content) ? content : [content];
  let notes = "";
  let extra: { stats?: Array<{ value: string; label: string } | [string, string]>; contentRight?: string[]; notes?: string } = {};
  if (typeof notesOrOpts === "string") notes = notesOrOpts;
  else if (notesOrOpts && typeof notesOrOpts === "object") extra = notesOrOpts;
  if (opts) extra = { ...extra, ...opts };
  if (extra.notes) notes = extra.notes;
  const stats = extra.stats?.map((st) => (Array.isArray(st) ? { value: st[0], label: st[1] } : st));
  return { id: generateId(), layout, kicker, title, content: contentArr, notes, stats, contentRight: extra.contentRight, accent: undefined };
}

export const DECK_TEMPLATES: DeckTemplate[] = [
  {
    id: "pitch",
    name: "Investor Pitch",
    tagline: "Problem to ask in 11 slides",
    theme: "midnight",
    build: (title) => ({
      title,
      description: "Investor pitch deck",
      slides: [
        s("title", "", title, "One line on what you do and for whom", "Open with the story behind the idea. 30 seconds max."),
        s("bullets", "01 · Problem", "This problem costs [audience] [cost] every [period]", ["Who feels it today, in numbers", "Why current workarounds fail", "The switching cost that keeps people stuck"], "Anchor with one real story, then zoom out to the market."),
        s("bullets", "02 · Insight", "The unfair advantage: why now", ["Technology, regulation, or behavior that just changed", "Why incumbents cannot follow", "Evidence you are early, not wrong"], "This slide answers 'why hasn't this been done before?'"),
        s("statement", "03 · Solution", "[Product] is the [category] that [outcome]", ["The mechanism in one line"], "Show, don't describe. One screenshot beats three bullets."),
        s("stats", "04 · Traction", "Momentum that compounds", [], { stats: [["1,200", "users in 90 days"], ["38%", "week-4 retention"], ["4.8", "avg rating"]].map(([value, label]) => ({ value, label })) , notes: "Pick the three numbers a skeptic would ask about first." }),
        s("bullets", "05 · Market", "Bottom-up: [segment] x [price point]", ["TAM built from unit economics, not reports", "First wedge segment and why it wins", "Expansion path to adjacent segments"], "Never show a top-down market slide. Multiply users by price."),
        s("bullets", "06 · Model", "Pricing that matches value delivered", ["Price per seat / usage and the anchor", "CAC and payback period", "Gross margin at current cost structure"], "Be concrete: actual numbers, not 'flexible pricing'."),
        s("two-col", "07 · Competition", "Why we win the segment that matters", ["The two axes that truly differentiate", "Where incumbents are structurally weak"], { contentRight: ["What we deliberately do not do", "The trade-off we accept"], notes: "An honest comparison reads better than a checkerboard." }),
        s("bullets", "08 · Team", "Built by people who lived the problem", ["Founder 1: role and proof", "Founder 2: role and proof", "Key advisors or early hires"], "Relevance beats pedigree. One line per person."),
        s("timeline", "09 · Roadmap", "The next 12 months, quarter by quarter", [], { stats: [["Q1", "Launch v1 + 100 design partners"], ["Q2", "Self-serve + first pilots"], ["Q3", "Expansion + 2 segments"], ["Q4", "Break-even target"]], notes: "Tie every milestone to the raise. Show the flywheel." }),
        s("statement", "10 · The ask", "Raising [amount] to reach [milestone] by [date]", ["Use of funds in three lines"], "End confident: the number, the milestone, the deadline."),
        s("end", "", "Thank you", "Contact and data room link", ""),
      ],
    }),
  },
  {
    id: "review",
    name: "Quarterly Review",
    tagline: "Results, lessons, next quarter",
    theme: "carbon",
    build: (title) => ({
      title,
      description: "Quarterly business review",
      slides: [
        s("title", "Quarterly Review", title, "Team and date", "Set the frame: what this quarter was supposed to prove."),
        s("stats", "Results", "The quarter in three numbers", [], { stats: [["[+X%]", "[headline metric]"], ["[N]", "[second metric]"], ["[N]", "[third metric]"]], notes: "Replace with actual headline metrics. One sentence of context each." }),
        s("bullets", "Wins", "What moved, and the decision behind it", ["Win 1 with the causal reason", "Win 2 with the causal reason", "Win 3 with the causal reason"], "Attribute wins to decisions, not luck. That is what makes them repeatable."),
        s("bullets", "Misses", "Where we fell short, honestly", ["Miss 1 and the root cause", "Miss 2 and the root cause"], "Name the root cause, not the symptom. No blame, no vagueness."),
        s("quote", "Voice of the customer", "The one quote that captures the quarter", "Customer, role", "A real quote grounds the data in human language."),
        s("timeline", "Learnings", "What changed because of this quarter", [], { stats: [["Then", "What we believed"], ["Now", "What we know"], ["Next", "What we do differently"]], notes: "This is the slide that makes reviews worth running." }),
        s("section", "Looking ahead", "Next quarter", [], "Breath before the plan."),
        s("bullets", "Plan", "Three bets with falsifiable success metrics", ["Bet 1: hypothesis and metric", "Bet 2: hypothesis and metric", "Bet 3: hypothesis and metric"], "Each bet needs a metric that can prove it wrong."),
        s("stats", "Targets", "Next quarter by the numbers", [], { stats: [["[N]", "[target 1]"], ["[N]", "[target 2]"], ["[N]", "[target 3]"]], notes: "Concrete targets. Numbers, not adjectives." }),
        s("end", "", "Questions", "Appendix and data available on request", ""),
      ],
    }),
  },
  {
    id: "kickoff",
    name: "Project Kickoff",
    tagline: "Align the team on day one",
    theme: "nord",
    build: (title) => ({
      title,
      description: "Project kickoff",
      slides: [
        s("title", "Kickoff", title, "Date and team", "Everyone leaves knowing the same three things: goal, scope, plan."),
        s("bullets", "Why now", "Doing nothing costs more than doing this", ["What triggers the project", "Cost of the status quo", "Who benefits first"], "The 'why now' decides every later trade-off. Get it explicit."),
        s("statement", "Goal", "In [timeframe] we will [outcome], measured by [metric]", [], "One sentence. If it needs a paragraph, the goal is fuzzy."),
        s("two-col", "Scope", "What is in, and just as loud: what is out", ["Deliverables committed", "Success criteria"], { contentRight: ["Explicitly out of scope", "Deferred to a later phase"], notes: "Scope fights are won on this slide, in writing." }),
        s("timeline", "Plan", "Milestones to delivery", [], { stats: [["Week 1-2", "Discovery and specs"], ["Week 3-6", "Build + weekly demos"], ["Week 7-8", "Hardening and rollout"]], notes: "Demos beat status reports. Schedule them now." }),
        s("two-col", "Team", "One owner per deliverable", ["Name: responsibility", "Name: responsibility"], { contentRight: ["Escalation path", "Decision rule"], notes: "One name per deliverable. Committees ship nothing." }),
        s("bullets", "Risks", "What could sink this, and the counter-move", ["Risk 1: mitigation", "Risk 2: mitigation", "Risk 3: mitigation"], "Naming risks early is strength. Silent risks kill projects."),
        s("end", "", "Questions", "Specs and timeline live in the project doc", ""),
      ],
    }),
  },
  {
    id: "research",
    name: "Research / Report",
    tagline: "Findings with evidence",
    theme: "ivory",
    build: (title) => ({
      title,
      description: "Research findings presentation",
      slides: [
        s("title", "Research", title, "Author, institution, date", "One minute of context: why this question, why now."),
        s("bullets", "Background", "What we knew, and the gap this work fills", ["Established finding 1", "Established finding 2", "The open gap"], "The gap is the point. Make it visible."),
        s("statement", "Question", "This work asks: [the question]", ["Scope boundary or sub-question"], "A good research deck poses one answerable question."),
        s("bullets", "Method", "How we answered it", ["Design and sample", "Measures and instruments", "Analysis approach", "Limitations accepted"], "Limitations on the method slide, not buried at the end."),
        s("stats", "Findings I", "The headline result, quantified", [], { stats: [["[N]", "[measure]"], ["[N]", "[measure]"], ["[p]", "significance"]], notes: "Effect, direction, uncertainty. One claim per slide." }),
        s("stats", "Findings II", "The second result", [], { stats: [["[N]", "[measure]"], ["[N]", "[measure]"], ["[p]", "significance"]], notes: "Same discipline: claim, evidence, uncertainty." }),
        s("two-col", "Interpretation", "What it means, and what it does not", ["Consistent explanation", "Supporting evidence"], { contentRight: ["Alternative explanation", "Evidence against it"], notes: "Steel-man the rival explanation. It builds trust." }),
        s("bullets", "Implications", "What changes if this holds", ["For practice", "For policy", "For future research"], "Separate what the data supports from what you suspect."),
        s("end", "", "Thank you", "Contact and paper link", "Prepared questions: methods, sample size, limitations."),
      ],
    }),
  },
  {
    id: "launch",
    name: "Product Launch",
    tagline: "From insight to announcement",
    theme: "ember",
    build: (title) => ({
      title,
      description: "Product launch deck",
      slides: [
        s("title", "Launch", title, "Launch date", "Energy high, specifics higher. This deck drives the whole launch."),
        s("bullets", "Audience", "A launch for everyone is a launch for no one", ["Primary persona and their moment of pain", "Secondary audience", "Who this is not for"], "Precision here powers every later decision."),
        s("statement", "Positioning", "For [audience], [product] is the [category] that [benefit]", ["Unlike [alternative], we [differentiator]"], "Read it aloud. If it stumbles, the positioning stumbles."),
        s("stats", "Proof", "Why believe us", [], { stats: [["[N]", "beta users"], ["[%]", "satisfaction"], ["[N h]", "saved per week"]], notes: "Numbers from real usage, not projections." }),
        s("bullets", "Story", "The announcement narrative arc", ["Hook: the tension in their world", "Reveal: what we built", "Evidence: it works because", "Call to action"], "Structure the story before the assets. Assets follow narrative."),
        s("timeline", "Channels", "Launch week, day by day", [], { stats: [["Day 0", "Press + Product Hunt"], ["Day 1", "Social + community"], ["Day 2-7", "Follow-ups, founder AMA"]], notes: "Assign each channel an owner and a metric." }),
        s("stats", "Targets", "What success looks like on launch day", [], { stats: [["[N]", "signups, week 1"], ["[%]", "activation rate"], ["[N]", "press mentions"]], notes: "Write targets before launch day. No moving goalposts." }),
        s("end", "", "Let's ship it", "Owner and next checkpoint", ""),
      ],
    }),
  },
];

export function buildTemplateDeck(template: DeckTemplate, title: string) {
  return template.build(title);
}
