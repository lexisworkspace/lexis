// Deterministic letter/character counting guard.
//
// LLMs (especially smaller ones) guess letter counts - "how many r's in
// strawberry" reliably produces 0/2/3 across models. When the user asks a
// letter-count question we compute the answer in JS and hand it to the model
// as an authoritative system-level fact it must state.

export interface CountFact {
  letter: string;
  word: string;
  count: number;
  spelled: string;
}

// Matches: "how many r's in strawberry", "how many r are in strawberry",
// "how many of the letter e appear in banana", "count the t's in Mississippi",
// "how many times does the letter r appear in strawberry".
const QUESTION_RE =
  /(?:how many|count)(?: of the letter| the| times does the letter)?\s*([a-z])['\u2019]?s?\b(?: are(?: there)?| appear| occur)? in (?:the (?:word|phrase|text) )?["'\u2018\u2019\u201c\u201d`]?([a-zA-Z]{2,40})["'\u2018\u2019\u201c\u201d`]?/i;

export function detectLetterCount(query: string): CountFact | null {
  const m = query.match(QUESTION_RE);
  if (!m) return null;
  const letter = m[1].toLowerCase();
  const word = m[2].toLowerCase();
  // Sanity: the captured "word" must not itself look like a question fragment.
  if (!/^[a-z]{2,40}$/.test(word)) return null;
  const count = [...word].filter((c) => c === letter).length;
  return { letter, word, count, spelled: [...word].join("-") };
}

/** Returns a system-level instruction stating the exact count, or null. */
export function countFactInstruction(query: string): string | null {
  const f = detectLetterCount(query);
  if (!f) return null;
  return (
    `Letter-count fact (computed by the app, absolutely correct - state it plainly): ` +
    `the word "${f.word}" spelled out is ${f.spelled}. ` +
    `It contains exactly ${f.count} letter "${f.letter}". Answer with that exact number.`
  );
}
