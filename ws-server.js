// Minimal example using 'ws' — can attach to an existing http.Server or run on another port.
const { WebSocketServer } = require("ws");

function createWSS(httpServerOrPort) {
  // If you already have an http.Server, pass it in; otherwise pass a port number.
  const wss =
    typeof httpServerOrPort === "number"
      ? new WebSocketServer({ port: httpServerOrPort })
      : new WebSocketServer({ server: httpServerOrPort });

  wss.on("connection", (ws, req) => {
    console.log("WS client connected", req.socket.remoteAddress);
    ws.send(JSON.stringify({ type: "welcome", now: Date.now() }));
  });

  const broadcast = (msg) => {
    console.log("Broadcasting WS message to clients:", msg);
    console.log("Current clients:", wss.clients);
    const text = JSON.stringify(msg);
    for (const c of wss.clients) {
      if (c.readyState === c.OPEN) c.send(text);
    }
  };

  return { wss, broadcast };
}

module.exports = { createWSS };

// let cleanRoom = function () {
//   return new Promise((resolve, reject) => {
//     resolve("here");
//   });
// };

// let doTheNextThing = function (result) {
//   return new Promise((resolve, reject) => {
//     resolve(result + "we");
//   });
// };

// let doLastThing = function (result) {
//   return new Promise((resolve, reject) => {
//     resolve(result + "gooooo!");
//   });
// };

// async function mario() {
//   const what = await cleanRoom();
//   const he = await doTheNextThing(what);
//   const say = await doLastThing(he);
//   console.log("say that shit mario:", say);
// }

// console.log(mario());
