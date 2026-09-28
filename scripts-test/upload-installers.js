// Uploads the Orleia 1.17.1 installers to Vercel Blob at exact paths (no random suffix)
// so the landing page links keep working. Token read from the pulled env file.
const { put } = require("@vercel/blob");
const fs = require("fs");
const path = require("path");

const envFile = "scripts-test/orleia-env.txt";
const env = fs.readFileSync(envFile, "utf8");
const match = env.match(/BLOB_READ_WRITE_TOKEN="([^"]+)"/);
if (!match) {
  console.error("No BLOB_READ_WRITE_TOKEN in " + envFile);
  process.exit(1);
}
process.env.BLOB_READ_WRITE_TOKEN = match[1];

const files = [
  { local: "desktop/dist/Orleia-1.17.1-mac-arm64.zip", name: "downloads/Orleia-1.17.1-mac-arm64.zip", type: "application/zip" },
  { local: "desktop/dist/Orleia-1.17.1-mac-x64.zip", name: "downloads/Orleia-1.17.1-mac-x64.zip", type: "application/zip" },
  { local: "desktop/dist/Orleia-1.17.1-linux-x86_64.AppImage", name: "downloads/Orleia-1.17.1-linux-x86_64.AppImage", type: "application/octet-stream" },
  { local: "desktop/dist/Orleia-1.17.1-linux-amd64.deb", name: "downloads/Orleia-1.17.1-linux-amd64.deb", type: "application/vnd.debian.binary-package" },
];

(async () => {
  for (const f of files) {
    const data = fs.readFileSync(path.resolve(f.local));
    const blob = await put(f.name, data, {
      access: "public",
      contentType: f.type,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    console.log(f.local, "->", blob.url);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
