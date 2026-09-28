const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3099;
const SECRET_KEY = process.env.ANTIGRAVITY_BRIDGE_SECRET || 'orleia-gemini-bridge-secret-key-2026';
const OWNER_EMAIL = 'maciej.s.znojek@gmail.com';

const server = http.createServer((req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const data = JSON.parse(body);

      // Verify authentication secret
      if (data.secret !== SECRET_KEY) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Unauthorized: Invalid secret key' }));
      }

      // Verify owner email
      if (data.owner && data.owner !== OWNER_EMAIL) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Forbidden: Owner mismatch' }));
      }

      const prompt = data.prompt || data.message || '';
      const action = data.action || 'run';

      console.log(`\n[${new Date().toISOString()}] Received remote instruction from ${data.owner || 'Gemini'}:`);
      console.log(`> Action: ${action}`);
      console.log(`> Prompt: ${prompt}\n`);

      // Respond immediately to avoid timeout on Google Apps Script side
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'accepted',
        message: 'Task received and queued for Antigravity execution.',
        timestamp: new Date().toISOString()
      }));

      // Execute task in workspace asynchronously
      executeTask(action, prompt);

    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON payload', details: err.message }));
    }
  });
});

function executeTask(action, prompt) {
  console.log(`[EXEC] Starting task execution: ${action}`);
  const workspaceRoot = path.resolve(__dirname, '../..');

  // Command mapping
  let command = 'npm';
  let args = ['run', 'build'];

  if (action === 'test') {
    args = ['test'];
  } else if (action === 'custom' && prompt) {
    // Custom execution prompt via Antigravity CLI or node script
    command = 'npx';
    args = ['agy', 'run', prompt];
  }

  console.log(`[SPAWN] ${command} ${args.join(' ')} in ${workspaceRoot}`);

  const child = spawn(command, args, {
    cwd: workspaceRoot,
    shell: true,
    env: process.env
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[OUT] ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`[ERR] ${data}`);
  });

  child.on('close', (code) => {
    console.log(`[EXEC] Completed with exit code ${code}`);
  });
}

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Antigravity Gemini Bridge Daemon active`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Owner: ${OWNER_EMAIL}`);
  console.log(`   Secret key set: YES`);
  console.log(`=======================================================`);
});
