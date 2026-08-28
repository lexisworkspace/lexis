// Transparent forwarder: forwards every request (method, path, body) to the
// live pairing server at UPSTREAM, streaming the response back. Used to test
// the phone experience in the preview through a loopback URL.
const http = require("http");

const UPSTREAM = process.env.UPSTREAM || "192.168.0.231:8123";
const PORT = parseInt(process.env.PORT || "54006", 10);

http
  .createServer((req, res) => {
    const up = http.request(
      { host: UPSTREAM.split(":")[0], port: UPSTREAM.split(":")[1], path: req.url, method: req.method, headers: req.headers },
      (upRes) => {
        res.writeHead(upRes.statusCode, upRes.headers);
        upRes.pipe(res);
      }
    );
    up.on("error", () => {
      res.writeHead(502);
      res.end("forward error");
    });
    req.pipe(up);
  })
  .listen(PORT, "127.0.0.1", () => console.log("forwarder on http://127.0.0.1:" + PORT));
