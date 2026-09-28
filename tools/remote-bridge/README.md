# 🚀 Antigravity <-> Google Ecosystem (Gemini / Mobile Bridge)

This tool lets you trigger **Antigravity** execution and Orleia workspace commands remotely from your mobile phone using your Google account (`maciej.s.znojek@gmail.com`) via **Gemini / Google Apps Script**.

---

## 📋 Architecture & Setup Steps

### Step 1: Start the Local Daemon on Workstation

Run the local daemon on your machine:
```bash
node tools/remote-bridge/daemon.js
```
*Listens locally on port `3099`.*

---

### Step 2: Expose Local Daemon securely (Tunneling)

To receive webhooks from Google Apps Script, expose port `3099` via Cloudflare Tunnel or Ngrok:

**Using Cloudflare Tunnel (Free & Instant):**
```bash
npx cloudflared tunnel --url http://localhost:3099
```
*Copy the resulting URL (e.g. `https://xxx-xxx-xxx.trycloudflare.com`).*

---

### Step 3: Deploy Google Apps Script Web App

1. Go to [script.google.com](https://script.google.com/) signed in as `maciej.s.znojek@gmail.com`.
2. Click **New Project** and name it `Antigravity Bridge`.
3. Copy the contents of `tools/remote-bridge/apps-script.js` into `Code.gs`.
4. Update `DAEMON_URL` in `apps-script.js` with your Cloudflare / Ngrok URL.
5. Click **Deploy** > **New Deployment**:
   - **Select type:** Web app
   - **Execute as:** Me (`maciej.s.znojek@gmail.com`)
   - **Who has access:** Anyone
6. Click **Deploy** and copy your **Web App URL**.

---

### Step 4: Remote Triggering from your Phone

You can trigger tasks in 3 ways from your mobile phone:

1. **Google Assistant / Gemini Webhook:** Send HTTP POST requests to your Apps Script Web App URL with a JSON body:
   ```json
   {
     "prompt": "Run build and verify tests",
     "action": "run"
   }
   ```
2. **Shortcuts App / Web Bookmark on Android / iOS:** Save a quick web action button on your home screen.
3. **Google Chat / Workspace Webhook:** Connect your Google Apps Script endpoint to a private Google Chat room.
