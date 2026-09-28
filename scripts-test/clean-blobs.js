// Deletes stale installer blobs (old versions) to free Hobby-plan quota.
const { del, list } = require("@vercel/blob");
const fs = require("fs");

const env = fs.readFileSync("scripts-test/orleia-env.txt", "utf8");
const match = env.match(/BLOB_READ_WRITE_TOKEN="([^"]+)"/);
if (!match) {
  console.error("No token");
  process.exit(1);
}
process.env.BLOB_READ_WRITE_TOKEN = match[1];

(async () => {
  // List everything under downloads/
  let cursor;
  const all = [];
  do {
    const page = await list({ prefix: "downloads/", cursor, limit: 1000 });
    all.push(...page.blobs);
    cursor = page.cursor;
  } while (cursor);

  console.log("Current blobs:");
  let total = 0;
  for (const b of all) {
    console.log(`  ${(b.size / 1048576).toFixed(1)} MB  ${b.pathname}`);
    total += b.size;
  }
  console.log(`Total: ${(total / 1048576).toFixed(1)} MB`);

  // Delete anything that isn't 1.15.0
  const stale = all.filter((b) => !b.pathname.includes("1.15.0"));
  if (stale.length === 0) {
    console.log("Nothing stale to delete.");
    return;
  }
  console.log(`\nDeleting ${stale.length} stale blob(s):`);
  await del(stale.map((b) => b.url));
  console.log("Deleted.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
