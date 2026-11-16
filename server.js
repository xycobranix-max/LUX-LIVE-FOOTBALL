
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WEBSITE FILES
app.use(express.static(path.join(__dirname, "public")));

// PLATFORM INFORMATION
const platform = {
    name: "LUX LIVE FOOTBALL",
    version: "1.0.0",
    status: "online"
};

// MATCH DATA
const liveMatches = [];
const fixtures = [];

// API HOME
app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to LUX LIVE FOOTBALL API",
        platform
    });
});

// HEALTH CHECK
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy",
        platform: platform.name,
        timestamp: new Date().toISOString()
    });
});

// LIVE MATCHES
app.get("/api/matches/live", (req, res) => {
    res.json({
        success: true,
        count: liveMatches.length,
        matches: liveMatches
    });
});

// FIXTURES
app.get("/api/matches/fixtures", (req, res) => {
    res.json({
        success: true,
        count: fixtures.length,
        fixtures
    });
});

// SINGLE MATCH
app.get("/api/matches/:id", (req, res) => {
    const match = [...liveMatches, ...fixtures]
        .find(item => String(item.id) === req.params.id);

    if (!match) {
        return res.status(404).json({
            success: false,
            message: "Match not found"
        });
    }

    res.json({
        success: true,
        match
    });
});

// STREAMING PLACEHOLDER
app.get("/api/stream/:matchId", (req, res) => {
    res.status(501).json({
        success: false,
        message: "Licensed streaming provider not configured",
        matchId: req.params.matchId
    });
});

// PLATFORM DETAILS
app.get("/api/platform", (req, res) => {
    res.json({
        success: true,
        platform,
        features: [
            "Live football listings",
            "Upcoming fixtures",
            "Match information",
            "Streaming integration"
        ]
    });
});

// API NOT FOUND
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// GENERAL NOT FOUND
app.use((req, res) => {
    res.status(404).send("Page not found - LUX LIVE FOOTBALL");
});

// ERROR HANDLER
app.use((error, req, res, next) => {
    console.error(error);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
    console.log("================================");
    console.log("LUX LIVE FOOTBALL");
    console.log("Server successfully started");
    console.log("Port:", PORT);
    console.log("================================");
});
