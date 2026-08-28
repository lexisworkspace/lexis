// Serves desktop/pair-page.html at http://127.0.0.1:PORT/?token=... and
// forwards /api/* to the live pairing server (LAN IP). Lets us drive the
// real phone UI in the preview without an actual phone.
const http = require("http");
const fs = require("fs");
const path = require("path");

const UPSTREAM = process.env.UPSTREAM || "192.168.0.231:8123";
const PORT = parseInt(process.env.PORT || "54001", 10);
const HTML = fs.readFileSync(path.join(__dirname, "..", "desktop", "pair-page.html"), "utf8");

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      // forward to upstream with the same query + body
      const headers = { "Content-Type": req.headers["content-type"] || "application/json" };
      const p = http.request(
        { host: UPSTREAM.split(":")[0], port: UPSTREAM.split(":")[1], path: req.url, method: req.method, headers },
        (up) => {
          res.writeHead(up.statusCode, { "Content-Type": "application/json" });
          up.pipe(res);
        }
      );
      p.on("error", () => { res.writeHead(502); res.end('{"error":"upstream down"}'); });
      req.pipe(p);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
  })
  .listen(PORT, "127.0.0.1", () => console.log("pair proxy on http://127.0.0.1:" + PORT));
