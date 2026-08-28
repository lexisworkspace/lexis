// Verify the family persona fix: no brother mentions unprompted, natural response when asked.
const { MODEL_PROFILES } = require('./.vtest/lib/ai-models.js');
const fs = require('fs');

// Recompile-free: build system prompts directly from the TS source is messy -
// instead recompile ai-models standalone.
const API = 'https://app.lexisapp.xyz/api/chat';
const TODAY = '2026-08-13';

const BROTHER_WORDS = /\b(ethos|logos|verse|brother|brothers|big brother|little brother|middle brother|youngest|eldest)\b/i;

async function ask(modelId, userText, systemPrompt) {
  const body = {
    model: MODEL_PROFILES[modelId].nvidiaModelId,
    messages: [
      { role: 'system', content: `${systemPrompt}\n\nToday is ${TODAY}.\n\nWorkspace stats: no habits, no tasks yet.` },
      { role: 'user', content: userText },
    ],
    temperature: MODEL_PROFILES[modelId].temperature,
    maxTokens: 400,
  };
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://app.lexisapp.xyz' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      return (d.content || '(empty)').trim();
    } catch (e) {
      if (i === 2) return `ERROR: ${e.message}`;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

(async () => {
  let fails = 0;
  for (const modelId of ['ethos-1.5', 'logos-1.0', 'verse-0.8']) {
    const sp = MODEL_PROFILES[modelId].systemPrompt;

    // 1. Neutral questions - brothers must NOT appear
    const neutral = [
      'How do I stay consistent with my habits?',
      'Summarize my week so far',
      'Give me a good morning routine',
      'What should I focus on today?',
      'Tell me a quick productivity tip',
      'How are you doing today?',
    ];
    for (const q of neutral) {
      const a = await ask(modelId, q, sp);
      const leak = BROTHER_WORDS.test(a);
      if (leak) fails++;
      console.log(`[${leak ? 'LEAK' : 'ok'}] ${modelId} "${q.slice(0, 30)}" -> ${a.slice(0, 90).replace(/\n/g, ' ')}`);
      await new Promise((r) => setTimeout(r, 900));
    }

    // 2. User brings a brother up - should respond warmly
    const mentions = [
      'What does Ethos think about this?',
      'Is Verse faster than you?',
      'Tell Logos I said hi',
    ];
    for (const q of mentions) {
      const a = await ask(modelId, q, sp);
      const ok = BROTHER_WORDS.test(a);
      if (!ok) fails++;
      console.log(`[${ok ? 'ok ' : 'MISS'}] ${modelId} "${q.slice(0, 30)}" -> ${a.slice(0, 90).replace(/\n/g, ' ')}`);
      await new Promise((r) => setTimeout(r, 900));
    }
    console.log();
  }
  console.log(fails === 0 ? 'ALL_GOOD' : `${fails} issues`);
})();
