// Benchmark suite: 10 tasks with objective, model-independent checks.
// Each check is a function(answer) -> boolean, kept lenient on format.

export const QUESTIONS = [
  {
    id: "math",
    category: "Math",
    prompt: "What is 17 × 23? Answer with only the number, nothing else.",
    check: (a) => /391/.test(a.replace(/,/g, "")),
  },
  {
    id: "logic",
    category: "Logic",
    prompt: "All humans are mortal. Socrates is human. Is Socrates mortal? Answer with just yes or no.",
    check: (a) => /^yes/i.test(a.trim()) || /yes/i.test(a.slice(0, 12)),
  },
  {
    id: "coding",
    category: "Coding",
    prompt:
      "Write a JavaScript function reverseString(str) that reverses a string without using Array.prototype.reverse or built-in reverse methods. Output ONLY the function code.",
    check: (a) => {
      const hasLoop = /for\s*\(|while\s*\(|\.reduce\s*\(|\.split\s*\(/.test(a);
      const returns = /return/.test(a);
      const fn = /function\s+reverseString|const\s+reverseString/.test(a);
      return hasLoop && returns && fn;
    },
  },
  {
    id: "extraction",
    category: "Extraction",
    prompt:
      "Extract the amount and due date from this text and return them as JSON with keys amount and dueDate: \"Invoice #8821 — $42.50 due on 2026-08-06.\" Output only the JSON.",
    check: (a) => /42\.50/.test(a) && /2026-08-06/.test(a),
  },
  {
    id: "instruction",
    category: "Instruction following",
    prompt: "Reply with exactly one word: banana. Do not add any other text, punctuation, or explanation.",
    check: (a) => {
      const t = a.trim().toLowerCase();
      return t === "banana" || t === "banana." || t.split(/\s+/)[0] === "banana" && t.split(/\s+/).length <= 2;
    },
  },
  {
    id: "reasoning",
    category: "Reasoning",
    prompt:
      "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Answer with the amount in cents.",
    check: (a) => /(^|\D)5\b|5 cents|0\.05|\$0\.05/.test(a),
  },
  {
    id: "knowledge",
    category: "Knowledge",
    prompt: "In what year did Apollo 11 first land humans on the Moon? Answer with just the year.",
    check: (a) => /1969/.test(a),
  },
  {
    id: "writing",
    category: "Writing",
    prompt:
      "Explain what a black hole is in exactly 3 short sentences, written for a 10-year-old. Number the sentences 1) 2) 3).",
    check: (a) => {
      const sentences = (a.match(/\d\)|\.\s|\n/g) || []).filter((s) => s === ")" || s === ". ").length;
      const hasTerms = /gravit|light|escape|spacetime|pull/i.test(a);
      return hasTerms && sentences >= 2 && sentences <= 5;
    },
  },
  {
    id: "json",
    category: "JSON compliance",
    prompt: 'Return valid JSON for: {"name": "Ada", "age": 36} but change age to 37. Output only the JSON object.',
    check: (a) => {
      const m = a.match(/\{[\s\S]*\}/);
      if (!m) return false;
      try {
        const j = JSON.parse(m[0]);
        return j.name === "Ada" && j.age === 37;
      } catch {
        return false;
      }
    },
  },
  {
    id: "multilingual",
    category: "Multilingual",
    prompt: "Say \"Good morning, how are you today?\" in Spanish.",
    check: (a) => /buenos\s+d[ií]as/i.test(a),
  },
];
