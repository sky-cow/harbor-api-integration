/**
 * Lightweight Express server to receive Harbor webhooks locally and stream them to frontends via SSE.
 *
 * Start:
 *   WEBHOOK_SERVER_PORT=4000 HARBOR_WEBHOOK_SECRET=yoursecret node webhook-server.js
 * or use the npm script:
 *   npm run webhook-server
 *
 * Point ngrok to this port, then use the ngrok HTTPS URL + /webhooks/harbor as your Harbor subscription endpoint.
 */
require("dotenv").config();

const cors = require("cors");
const crypto = require("crypto");
const express = require("express");
const morgan = require("morgan");

const PORT = process.env.WEBHOOK_SERVER_PORT || 4000;

const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const envOrigins = process.env.WEBHOOK_VIEWER_ORIGINS
  ? process.env.WEBHOOK_VIEWER_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  : [];

const TRUSTED_ORIGINS = Array.from(new Set([...defaultOrigins, ...envOrigins]));
const HARBOR_WEBHOOK_SECRET = process.env.HARBOR_WEBHOOK_SECRET || "";
const MAX_EVENTS = Number(process.env.WEBHOOK_EVENT_BUFFER || 25);
const HEARTBEAT_MS = Number(process.env.WEBHOOK_SSE_HEARTBEAT_MS || 20_000);

const app = express();
const events = [];

// --- SSE clients set for real-time forwarding to connected frontends ---
const sseClients = new Set();

console.log("Trusted origins for CORS:", TRUSTED_ORIGINS);
console.log("sseClients set initialized:", sseClients.values());

app.use(
  cors({
    origin: TRUSTED_ORIGINS,
    methods: ["GET", "POST", "OPTIONS"],
  })
);
app.use(morgan("dev"));

/**
 * Harbor sends JSON payloads, so capture the raw body for signature verification.
 * Mount this route before express.json() so we keep the raw payload buffer.
 */
app.post(
  "/webhooks/harbor",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const rawBody =
      req.body && Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    const payloadString = rawBody.toString("utf8");

    let parsedPayload = null;
    try {
      parsedPayload = JSON.parse(payloadString || "{}");
    } catch (err) {
      // keep parsedPayload null — we'll store raw string for debugging
    }

    console.log("Received Harbor webhook payload:", payloadString);
    // Harbor may use different header names; check common variants
    const requestHeader = (
      req.get("x-harbor-signature") ||
      req.get("harbor-signature") ||
      req.get("x-signature") ||
      req.get("x-hub-signature") ||
      ""
    ).toString();

    // Split the header into parts
    const elements = requestHeader.split(",");
    const signatureData = elements.reduce((acc, item) => {
      const [key, value] = item.split("=");
      acc[key] = value;
      return acc;
    }, {});

    // Extract the timestamp and signature
    const timestamp = signatureData["t"];
    const signature = signatureData["v1"];

    // console.log("Extracted timestamp:", timestamp);
    // console.log("Extracted signature:", signature);
    // console.log("Payload string for signing:", payloadString);
    // console.log("Harbor webhook secret:", HARBOR_WEBHOOK_SECRET);

    // Create the signed payload string
    const signedPayload = `${timestamp}.${payloadString}`;

    const computedSignature = HARBOR_WEBHOOK_SECRET
      ? crypto
          .createHmac("sha256", HARBOR_WEBHOOK_SECRET)
          .update(signedPayload)
          .digest("hex")
      : null;

    // console.log("Computed signature:", computedSignature);
    // console.log("Signature:", signature);

    const signatureValid =
      computedSignature && signature
        ? safeCompare(signature.trim(), computedSignature)
        : null;

    const eventRecord = {
      id: crypto.randomUUID(),
      received_at: new Date().toISOString(),
      signature_header: signature,
      computed_signature: computedSignature,
      signature_valid: signatureValid,
      headers: req.headers,
      payload: parsedPayload || payloadString,
    };

    // Buffer event
    events.unshift(eventRecord);
    if (events.length > MAX_EVENTS) {
      events.length = MAX_EVENTS;
    }

    // Broadcast the event to connected SSE clients
    try {
      const data = `data: ${JSON.stringify(eventRecord)}\n\n`;
      for (const clientRes of Array.from(sseClients)) {
        try {
          clientRes.write(data);
        } catch (bErr) {
          // remove client if writing fails
          sseClients.delete(clientRes);
        }
      }
    } catch (broadcastErr) {
      console.error("SSE broadcast error:", broadcastErr);
    }

    console.log(
      `✅ Harbor webhook received (${eventRecord.id})${
        signatureValid === false ? " [signature mismatch]" : ""
      }`
    );

    // respond quickly to Harbor
    res.status(200).json({
      ok: true,
      stored_event_id: eventRecord.id,
      signature_valid: signatureValid,
    });
  }
);

// JSON parser for regular endpoints
app.use(express.json());

// Health / management endpoints
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    buffered_events: events.length,
  });
});

app.get("/events", (_req, res) => {
  res.json({ events });
});

app.post("/events/reset", (_req, res) => {
  events.length = 0;
  res.json({ ok: true });
});

/**
 * SSE stream endpoint: clients (your FE) open this to receive real-time events.
 * Example client: new EventSource('https://...ngrok.io/events/stream')
 */
app.get("/events/stream", (req, res) => {
  console.log(
    "SSE connection from origin:",
    req.get("origin"),
    "url:",
    req.originalUrl
  );

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Allow browsers to reuse CORS policy above
  });

  // initial comment to establish stream
  res.write(`:ok\n\n`);

  // send recent buffered events immediately
  for (const ev of events.slice(0, MAX_EVENTS).reverse()) {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  }

  // add to clients set
  sseClients.add(res);

  // heartbeat to keep connection alive and help detect broken clients
  const hb = setInterval(() => {
    try {
      res.write(`:heartbeat ${Date.now()}\n\n`);
    } catch (err) {
      // ignore; close will clean up
    }
  }, HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(hb);
    sseClients.delete(res);
  });
});

app.listen(PORT, () => {
  console.log(
    `🚀 Harbor webhook listener ready on http://localhost:${PORT}/webhooks/harbor`
  );
  console.log("SSE stream available at /events/stream");
  console.log("Trusted frontend origins:", TRUSTED_ORIGINS.join(", "));
});

/**
 * Constant-time comparison to avoid timing attacks.
 */
function safeCompare(a, b) {
  try {
    const aBuf = Buffer.from(a || "", "utf8");
    const bBuf = Buffer.from(b || "", "utf8");
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch (err) {
    return false;
  }
}
