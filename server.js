require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const matches = [];

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    app: "LUX LIVE FOOTBALL",
    status: "online"
  });
});

app.get("/api/matches", (req, res) => {
  res.json({
    success: true,
    message: "No fixtures have been added yet.",
    matches
  });
});

app.get("/api/stream", (req, res) => {
  const streamUrl = process.env.LIVE_STREAM_URL || "";
  const streamTitle = process.env.LIVE_STREAM_TITLE || "Live football";

  // Only allow HTTPS stream URLs. Configure this with a stream you are
  // authorized to distribute. Do not put private provider credentials here.
  let safeUrl = "";

  if (streamUrl) {
    try {
      const parsed = new URL(streamUrl);
      if (parsed.protocol === "https:" && parsed.pathname.toLowerCase().endsWith(".m3u8")) {
        safeUrl = parsed.toString();
      }
    } catch (_) {
      safeUrl = "";
    }
  }

  res.json({
    success: true,
    available: Boolean(safeUrl),
    title: streamTitle,
    streamUrl: safeUrl,
    message: safeUrl
      ? "An authorized stream is configured."
      : "No authorized live stream is configured yet."
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LUX LIVE FOOTBALL running on port ${PORT}`);
});
