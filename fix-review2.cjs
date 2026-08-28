const fs = require('fs');

// Fix 1: landing title v1.9 -> v1.9.1
let p = 'src/app/landing/page.tsx';
let c = fs.readFileSync(p, 'utf8');
const oldT = 'title: "Lexis v1.9"';
if (c.includes(oldT)) {
  c = c.split(oldT).join('title: "Lexis v1.9.1"');
  fs.writeFileSync(p, c);
  console.log('landing title bumped');
} else {
  console.log('TITLE ANCHOR MISS');
}

// Fix 2: PasswordGate tolerant pbkdf2 branch - fall through when regex does not match
p = 'src/components/layout/PasswordGate.tsx';
c = fs.readFileSync(p, 'utf8');

const oldPbk = `      if (m) {
        const iterations = Math.min(Math.max(parseInt(m[1], 10) || PBKDF2_ITERATIONS, 100_000), 1_000_000);
        const hash = await pbkdf2Hash(password, fromB64(m[2]), iterations);
        if (hash === m[3]) {
          await storePassword(password);
          return true;
        }
      }
      return false;
    }`;

const newPbk = `      if (m) {
        const iterations = Math.min(Math.max(parseInt(m[1], 10) || PBKDF2_ITERATIONS, 100_000), 1_000_000);
        const hash = await pbkdf2Hash(password, fromB64(m[2]), iterations);
        if (hash === m[3]) {
          await storePassword(password);
          return true;
        }
        // Matched the legacy format but wrong password - fail here.
        return false;
      }
      // Not the legacy pbkdf2 format - fall through to legacy SHA-256/plaintext.
    }`;

if (c.includes(oldPbk)) {
  c = c.split(oldPbk).join(newPbk);
  console.log('pbkdf2 tolerant branch fixed');
} else {
  console.log('PBKDF2 ANCHOR MISS');
}

// Fix 3: fallback branch - fall through when value is not a fallback hash
const oldFb = `    if (stored.startsWith("fallback")) {
      return stored === \`fallback$${fallbackHash(password)}\` || stored === \`fallback${fallbackHash(password)}\`;
    }`;

const newFb = `    if (stored.startsWith("fallback")) {
      const fb = fallbackHash(password);
      if (stored === \`fallback$${fb}\` || stored === \`fallback${fb}\`) return true;
      // Not a fallback hash - fall through to legacy plaintext/SHA-256.
    }`;

if (c.includes(oldFb)) {
  c = c.split(oldFb).join(newFb);
  console.log('fallback branch fixed');
} else {
  console.log('FALLBACK ANCHOR MISS');
}

fs.writeFileSync(p, c);
console.log('done');
