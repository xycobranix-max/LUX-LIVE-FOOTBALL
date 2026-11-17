
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY;

// GOAL API CONFIGURATION
const GOAL_API_BASE = "https://api.goal-api.com/v1";
const GOAL_API_KEY = process.env.GOAL_API_KEY;

// =========================================
// SUPABASE CONFIGURATION
// =========================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SECRET_KEY =
    process.env.SUPABASE_SECRET_KEY;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

if (
    !SUPABASE_URL ||
    !SUPABASE_PUBLISHABLE_KEY ||
    !SUPABASE_SECRET_KEY ||
    !ADMIN_EMAIL
) {
    throw new Error("Supabase or admin environment variables are missing");
}

// Used for administrator sign-in and access-token verification
const supabaseAuth = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

// Used only by the backend for database operations
const supabaseDB = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

// FREE PLAN SEASONS
const FREE_PLAN_SEASONS = [2024, 2023, 2022];

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WEBSITE FILES
app.use(express.static(path.join(__dirname, "public")));

// PLATFORM INFORMATION
const platform = {
    name: "LUX LIVE FOOTBALL",
    version: "2.0.0",
    status: "online"
};

// SIX COMPETITIONS
const competitions = {
    "premier-league": {
        name: "Premier League",
        country: "England",
        icon: "🏆",
        id: 39
    },
    "la-liga": {
        name: "La Liga",
        country: "Spain",
        icon: "🏆",
        id: 140
    },
    "serie-a": {
        name: "Serie A",
        country: "Italy",
        icon: "🏆",
        id: 135
    },
    "bundesliga": {
        name: "Bundesliga",
        country: "Germany",
        icon: "🏆",
        id: 78
    },
    "champions-league": {
        name: "Champions League",
        country: "Europe",
        icon: "🏆",
        id: 2
    },
    "afcon": {
        name: "Africa Cup of Nations",
        country: "Africa",
        icon: "🌍",
        id: 6
    }
};

// SIMPLE SERVER CACHE
const cache = new Map();

async function cached(key, duration, loader) {
    const existing = cache.get(key);

    if (existing && existing.expires > Date.now()) {
        return existing.value;
    }

    const value = await loader();

    cache.set(key, {
        value,
        expires: Date.now() + duration
    });

    return value;
}

// API-FOOTBALL REQUEST
async function footballAPI(endpoint, parameters = {}) {
    if (!API_KEY) {
        const error = new Error(
            "API key is missing. Add API_FOOTBALL_KEY in Render Environment."
        );
        error.status = 503;
        throw error;
    }

    const query = new URLSearchParams();

    Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.set(key, String(value));
        }
    });

    const url = `${API_BASE}/${endpoint}?${query.toString()}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "x-apisports-key": API_KEY
        }
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            `Football API returned HTTP ${response.status}`
        );
        error.status = 502;
        throw error;
    }

    if (data.errors && Object.keys(data.errors).length > 0) {
        const details = Object.values(data.errors)
            .map(value =>
                typeof value === "string"
                    ? value
                    : JSON.stringify(value)
            )
            .join("; ");

        const error = new Error(
            details || "Football API request failed."
        );
        error.status = 502;
        throw error;
    }

    return data;
}


// =========================================
// GOAL API CONNECTION
// =========================================

async function goalAPI(endpoint) {
    if (!GOAL_API_KEY) {
        throw new Error("GOAL_API_KEY is not configured");
    }

    const response = await fetch(`${GOAL_API_BASE}${endpoint}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${GOAL_API_KEY}`,
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Goal API error ${response.status}: ${errorText}`);
    }

    return await response.json();
}


// GET AN ACCESSIBLE SEASON FOR A COMPETITION
async function getCompetitionSeason(slug) {
    const competition = competitions[slug];

    if (!competition) {
        throw new Error("Competition not found.");
    }

    return cached(
        `season-${slug}`,
        24 * 60 * 60 * 1000,
        async () => {
            const data = await footballAPI("leagues", {
                id: competition.id
            });

            const league = data.response?.[0];

            if (!league || !league.seasons?.length) {
                throw new Error(
                    `No season information available for ${competition.name}.`
                );
            }

            // Only choose seasons supported by the free plan.
            const accessibleSeasons = league.seasons
                .filter(season =>
                    FREE_PLAN_SEASONS.includes(Number(season.year))
                )
                .sort((a, b) => b.year - a.year);

            if (accessibleSeasons.length === 0) {
                throw new Error(
                    `No season from 2022 to 2024 is listed for ${competition.name}.`
                );
            }

            const selectedSeason = accessibleSeasons[0];

            console.log(
                `${competition.name} selected season: ${selectedSeason.year}`
            );

            return Number(selectedSeason.year);
        }
    );
}

// GET TEAMS FOR ONE COMPETITION
async function getCompetitionTeams(slug) {
    const competition = competitions[slug];

    if (!competition) {
        throw new Error("Competition not found.");
    }

    return cached(
        `teams-${slug}`,
        12 * 60 * 60 * 1000,
        async () => {
            const season = await getCompetitionSeason(slug);

            const data = await footballAPI("teams", {
                league: competition.id,
                season
            });

            return {
                competition: {
                    slug,
                    name: competition.name,
                    country: competition.country,
                    icon: competition.icon,
                    id: competition.id,
                    season
                },
                teams: (data.response || []).map(item => ({
                    id: item.team.id,
                    name: item.team.name,
                    code: item.team.code,
                    country: item.team.country,
                    founded: item.team.founded,
                    national: item.team.national,
                    logo: item.team.logo,
                    venue: {
                        id: item.venue?.id,
                        name: item.venue?.name,
                        address: item.venue?.address,
                        city: item.venue?.city,
                        capacity: item.venue?.capacity,
                        surface: item.venue?.surface,
                        image: item.venue?.image
                    }
                }))
            };
        }
    );
}

// GET TEAM PROFILE AND SQUAD
async function getTeamProfile(teamId) {
    return cached(
        `team-profile-${teamId}`,
        6 * 60 * 60 * 1000,
        async () => {
            const [teamData, squadData] = await Promise.all([
                footballAPI("teams", { id: teamId }),
                footballAPI("players/squads", { team: teamId })
            ]);

            const item = teamData.response?.[0];

            if (!item) {
                throw new Error("Team not found.");
            }

            const squad = squadData.response?.[0]?.players || [];

            return {
                team: {
                    id: item.team.id,
                    name: item.team.name,
                    code: item.team.code,
                    country: item.team.country,
                    founded: item.team.founded,
                    national: item.team.national,
                    logo: item.team.logo,
                    venue: item.venue || {}
                },
                squad: squad.map(player => ({
                    id: player.id,
                    name: player.name,
                    age: player.age,
                    number: player.number,
                    position: player.position,
                    photo: player.photo
                }))
            };
        }
    );
}

// FORMAT FIXTURE DATA
function formatFixture(item) {
    return {
        id: item.fixture.id,
        date: item.fixture.date,
        timestamp: item.fixture.timestamp,
        status: item.fixture.status?.short,
        elapsed: item.fixture.status?.elapsed,
        competition: item.league?.name,
        leagueId: item.league?.id,
        homeTeam: item.teams?.home?.name,
        homeLogo: item.teams?.home?.logo,
        homeId: item.teams?.home?.id,
        homeScore: item.goals?.home,
        awayTeam: item.teams?.away?.name,
        awayLogo: item.teams?.away?.logo,
        awayId: item.teams?.away?.id,
        awayScore: item.goals?.away,
        venue: item.fixture?.venue?.name
    };
}

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
        apiKeyConfigured: Boolean(API_KEY),
        platform: platform.name,
        timestamp: new Date().toISOString()
    });
});

// LIST ALL COMPETITIONS
app.get("/api/competitions", (req, res) => {
    const list = Object.entries(competitions).map(([slug, item]) => ({
        slug,
        ...item
    }));

    res.json({
        success: true,
        count: list.length,
        competitions: list
    });
});

// GET TEAMS FOR A COMPETITION
app.get("/api/leagues/:slug/teams", async (req, res, next) => {
    try {
        const result = await getCompetitionTeams(req.params.slug);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
});

// GET STANDINGS
app.get("/api/leagues/:slug/standings", async (req, res, next) => {
    try {
        const competition = competitions[req.params.slug];

        if (!competition) {
            return res.status(404).json({
                success: false,
                message: "Competition not found."
            });
        }

        const season = await getCompetitionSeason(req.params.slug);

        const result = await cached(
            `standings-${req.params.slug}`,
            60 * 60 * 1000,
            () => footballAPI("standings", {
                league: competition.id,
                season
            })
        );

        res.json({
            success: true,
            competition: competition.name,
            season,
            standings: result.response || []
        });
    } catch (error) {
        next(error);
    }
});

// GET FIXTURES FOR A COMPETITION
app.get("/api/leagues/:slug/fixtures", async (req, res, next) => {
    try {
        const competition = competitions[req.params.slug];

        if (!competition) {
            return res.status(404).json({
                success: false,
                message: "Competition not found."
            });
        }

        const season = await getCompetitionSeason(req.params.slug);

        const result = await cached(
            `fixtures-${req.params.slug}`,
            60 * 60 * 1000,
            () => footballAPI("fixtures", {
                league: competition.id,
                season,
                next: 10,
                timezone: "Africa/Nairobi"
            })
        );

        const fixtures = (result.response || []).map(formatFixture);

        res.json({
            success: true,
            competition: competition.name,
            season,
            count: fixtures.length,
            fixtures
        });
    } catch (error) {
        next(error);
    }
});

// GET INDIVIDUAL TEAM PROFILE
app.get("/api/teams/:id", async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);

        if (!Number.isInteger(teamId) || teamId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid team ID."
            });
        }

        const profile = await getTeamProfile(teamId);

        res.json({
            success: true,
            ...profile
        });
    } catch (error) {
        next(error);
    }
});

// LIVE MATCHES ACROSS ALL SIX COMPETITIONS
app.get("/api/matches/live", async (req, res, next) => {
    try {
        const allowedLeagueIds = new Set(
            Object.values(competitions).map(item => item.id)
        );

        const result = await cached(
            "all-live-matches",
             30 * 1000,
            () => footballAPI("fixtures", {
                live: "all"
            })
        );

        const matches = (result.response || [])
            .filter(item => allowedLeagueIds.has(item.league?.id))
            .map(formatFixture);

        res.json({
            success: true,
            count: matches.length,
            matches
        });
    } catch (error) {
        next(error);
    }
});

// UPCOMING FIXTURES ACROSS ALL SIX COMPETITIONS
app.get("/api/matches/fixtures", async (req, res, next) => {
    try {
        const results = await Promise.allSettled(
            Object.keys(competitions).map(async slug => {
                const competition = competitions[slug];
                const season = await getCompetitionSeason(slug);

                const fixtureData = await cached(
                    `fixtures-${slug}`,
                    60 * 60 * 1000,
                    () => footballAPI("fixtures", {
                        league: competition.id,
                        season,
                        next: 10,
                        timezone: "Africa/Nairobi"
                    })
                );

                return (fixtureData.response || []).map(formatFixture);
            })
        );

        const fixtures = results
            .filter(result => result.status === "fulfilled")
            .flatMap(result => result.value)
            .sort((a, b) => a.timestamp - b.timestamp);

        const failures = results.filter(
            result => result.status === "rejected"
        ).length;

        res.json({
            success: true,
            count: fixtures.length,
            fixtures,
            partial: failures > 0,
            competitionsUnavailable: failures
        });
    } catch (error) {
        next(error);
    }
});

// SINGLE MATCH
app.get("/api/matches/:id", async (req, res, next) => {
    try {
        const matchId = Number(req.params.id);

        if (!Number.isInteger(matchId) || matchId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid match ID."
            });
        }

        const result = await cached(
            `match-${matchId}`,
            60 * 1000,
            () => footballAPI("fixtures", {
                id: matchId
            })
        );

        const item = result.response?.[0];

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Match not found."
            });
        }

        res.json({
            success: true,
            match: formatFixture(item)
        });
    } catch (error) {
        next(error);
    }
});

// STREAMING PLACEHOLDER
app.get("/api/stream/:matchId", (req, res) => {
    res.status(501).json({
        success: false,
        message: "A licensed streaming provider is not configured.",
        matchId: req.params.matchId
    });
});

// PLATFORM DETAILS
app.get("/api/platform", (req, res) => {
    res.json({
        success: true,
        platform,
        competitions: Object.keys(competitions),
        features: [
            "Real team names and badges",
            "Club stadium information",
            "Team squads where available",
            "Live match listings",
            "Upcoming fixtures",
            "League standings",
            "Match information"
        ]
    });
});

// =========================================
// GOAL API LEAGUE TEAMS
// =========================================

app.get("/api/goal/leagues/:leagueId/teams", async (req, res) => {
    try {
        const { leagueId } = req.params;

        const data = await goalAPI(
            `/leagues/${encodeURIComponent(leagueId)}/teams`
        );

        res.json(data);

    } catch (error) {
        console.error("Goal API Error:", error.message);

        res.status(502).json({
            success: false,
            message: "Unable to retrieve teams from Goal API",
            error: error.message
        });
    }
});

// GOAL API - LIST AVAILABLE LEAGUES
app.get("/api/goal/leagues", async (req, res) => {
    try {
        const data = await goalAPI("/leagues");

        res.json(data);

    } catch (error) {
        console.error("Goal leagues error:", error.message);

        res.status(502).json({
            success: false,
            message: "Unable to retrieve Goal API leagues",
            error: error.message
        });
    }
});

/* =========================================
   GOAL API - LEAGUE FIXTURES
========================================= */

app.get("/api/goal/leagues/:leagueId/fixtures", async (req, res) => {
    try {
        const data = await goalAPI(
            `/leagues/${encodeURIComponent(req.params.leagueId)}/fixtures`
        );
        res.json(data);
    } catch (error) {
        console.error("Goal fixtures error:", error.message);
        res.status(502).json({
            success: false,
            message: "Unable to retrieve league fixtures",
            error: error.message
        });
    }
});


/* =========================================
   GOAL API - LIVE MATCHES
========================================= */


app.get("/api/goal/fixtures/live", async (req, res) => {
    try {
        const data = await goalAPI("/fixtures/live");

        console.log("========== GOAL LIVE DIAGNOSTIC ==========");
        console.log("Success:", data.success);
        console.log("Source:", data.source);
        console.log("Count:", data.count);
        console.log("Timestamp:", data.timestamp);
        console.log("Full response:", JSON.stringify(data, null, 2));
        console.log("==========================================");

        res.json(data);

    } catch (error) {
        console.error("Goal live fixtures error:", error.message);

        res.status(502).json({
            success: false,
            message: "Unable to retrieve live matches from Goal API",
            error: error.message
        });
    }
});


/* =========================================
   GOAL API - TEAM RESULTS
========================================= */

app.get("/api/goal/teams/:teamId/results", async (req, res) => {
    try {
        const data = await goalAPI(
            `/teams/${encodeURIComponent(req.params.teamId)}/results`
        );
        res.json(data);
    } catch (error) {
        console.error("Goal results error:", error.message);
        res.status(502).json({
            success: false,
            message: "Unable to retrieve team results",
            error: error.message
        });
    }
});

/* =========================================
   GOAL API - TEAM UPCOMING MATCHES
========================================= */

app.get("/api/goal/teams/:teamId/upcoming", async (req, res) => {
    try {
        const data = await goalAPI(
            `/teams/${encodeURIComponent(req.params.teamId)}/upcoming`
        );
        res.json(data);
    } catch (error) {
        console.error("Goal upcoming error:", error.message);
        res.status(502).json({
            success: false,
            message: "Unable to retrieve upcoming team matches",
            error: error.message
        });
    }
});

// =========================================
// GOAL API — FOOTBALL HIGHLIGHTS
// =========================================

app.get("/api/goal/videos", async (req, res) => {
    try {
        const data = await goalAPI("/videos");
        res.json(data);
    } catch (error) {
        console.error("Goal videos error:", error.message);
        res.status(502).json({
            success: false,
            message: "Unable to retrieve football highlights"
        });
    }
});

app.get("/api/goal/videos/recent", async (req, res) => {
    try {
        const data = await goalAPI("/videos/recent");
        res.json(data);
    } catch (error) {
        console.error("Recent videos error:", error.message);
        res.status(502).json({
            success: false,
            message: "Unable to retrieve recent highlights"
        });
    }
});

app.get("/api/goal/videos/match/:matchId", async (req, res) => {
    try {
        const data = await goalAPI(
            `/videos/match/${encodeURIComponent(req.params.matchId)}`
        );
        res.json(data);
    } catch (error) {
        console.error("Match videos error:", error.message);
        res.status(502).json({
            success: false,
            message: "Unable to retrieve match highlights"
        });
    }
});

app.get("/api/goal/videos/league/:leagueId", async (req, res) => {
    try {
        const data = await goalAPI(
            `/videos/league/${encodeURIComponent(req.params.leagueId)}`
        );
        res.json(data);
    } catch (error) {
        console.error("League videos error:", error.message);
        res.status(502).json({
            success: false,
            message: "Unable to retrieve league highlights"
        });
    }
});

app.get("/api/goal/videos/date/:date", async (req, res) => {
    try {
        const data = await goalAPI(
            `/videos/date/${encodeURIComponent(req.params.date)}`
        );
        res.json(data);
    } catch (error) {
        console.error("Date videos error:", error.message);
        res.status(502).json({
            success: false,
            message: "Unable to retrieve highlights for this date"
        });
    }
});

/* =========================================
   LUX LIVE FOOTBALL
   MATCH DETAILS - GOAL API
========================================= */

// MATCH DETAILS
app.get("/api/goal/fixtures/:fixtureId", async (req, res) => {
    try {
        const { fixtureId } = req.params;

        const data = await goalAPI(
            `/fixtures/${encodeURIComponent(fixtureId)}`
        );

        res.json(data);

    } catch (error) {
        console.error("Match details error:", error.message);

        res.status(502).json({
            success: false,
            message: "Unable to retrieve match details"
        });
    }
});

// MATCH EVENTS
app.get("/api/goal/fixtures/:fixtureId/events", async (req, res) => {
    try {
        const { fixtureId } = req.params;

        const data = await goalAPI(
            `/fixtures/${encodeURIComponent(fixtureId)}/events`
        );

        res.json(data);

    } catch (error) {
        console.error("Match events error:", error.message);

        res.status(502).json({
            success: false,
            message: "Unable to retrieve match events"
        });
    }
});

// MATCH LINEUPS
app.get("/api/goal/fixtures/:fixtureId/lineups", async (req, res) => {
    try {
        const { fixtureId } = req.params;

        const data = await goalAPI(
            `/fixtures/${encodeURIComponent(fixtureId)}/lineups`
        );

        res.json(data);

    } catch (error) {
        console.error("Match lineups error:", error.message);

        res.status(502).json({
            success: false,
            message: "Unable to retrieve match lineups"
        });
    }
});

// MATCH STATISTICS
app.get("/api/goal/fixtures/:fixtureId/statistics", async (req, res) => {
    try {
        const { fixtureId } = req.params;

        const data = await goalAPI(
            `/fixtures/${encodeURIComponent(fixtureId)}/statistics`
        );

        res.json(data);

    } catch (error) {
        console.error("Match statistics error:", error.message);

        res.status(502).json({
            success: false,
            message: "Unable to retrieve match statistics"
        });
    }
});


/* =========================================
   LUX ADMIN — AUTHENTICATION & HIGHLIGHTS
========================================= */

// Basic login attempt protection
const adminLoginAttempts = new Map();

function getYouTubeVideoId(value) {
    try {
        const url = new URL(value);

        if (url.protocol !== "https:") return null;

        const host = url.hostname.toLowerCase().replace(/^www\./, "");

        let id = null;

        if (host === "youtu.be") {
            id = url.pathname.split("/")[1];
        } else if (
            ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
        ) {
            if (url.pathname === "/watch") {
                id = url.searchParams.get("v");
            } else {
                const parts = url.pathname.split("/").filter(Boolean);

                if (["embed", "shorts", "live"].includes(parts[0])) {
                    id = parts[1];
                }
            }
        }

        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;

    } catch {
        return null;
    }
}


/* =========================================
   LUX USER REGISTRATION
========================================= */

app.post("/api/auth/signup", async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const password = req.body.password;

        if (!email || typeof password !== "string" || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        if (email === ADMIN_EMAIL) {
            return res.status(403).json({
                success: false,
                message: "This email is reserved for the administrator."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const { data, error } = await supabaseAuth.auth.signUp({
            email,
            password
        });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(201).json({
            success: true,
            message: data.session
                ? "Account created successfully. You can now sign in."
                : "Account created. Please check your email to confirm your account."
        });

    } catch (error) {
        console.error("User registration error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create your account."
        });
    }
});


/* =========================================
   LUX USER AND ADMIN SIGN-IN
========================================= */

app.post("/api/auth/login", async (req, res) => {
    try {
        const ip = req.ip;
        const now = Date.now();
        const windowMs = 15 * 60 * 1000;

        let attempts = adminLoginAttempts.get(ip);

        if (!attempts || now - attempts.started > windowMs) {
            attempts = { count: 0, started: now };
        }

        if (attempts.count >= 5) {
            return res.status(429).json({
                success: false,
                message: "Too many login attempts. Try again later."
            });
        }

        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const password = req.body.password;

        if (!email || typeof password !== "string" || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        attempts.count++;
        adminLoginAttempts.set(ip, attempts);

        const { data, error } =
            await supabaseAuth.auth.signInWithPassword({
                email,
                password
            });

        if (error || !data.user || !data.session) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const authenticatedEmail = (
            data.user.email || ""
        ).trim().toLowerCase();

        const isAdmin = authenticatedEmail === ADMIN_EMAIL;

        adminLoginAttempts.delete(ip);

        return res.json({
            success: true,
            role: isAdmin ? "admin" : "user",
            access_token: data.session.access_token,
            expires_at: data.session.expires_at,
            user: {
                email: authenticatedEmail
            }
        });

    } catch (error) {
        console.error("LUX sign-in error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to sign in. Please try again."
        });
    }
});


// =========================================
// VERIFY LUX USER SESSION
// =========================================

app.get("/api/auth/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization || "";

        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Please sign in."
            });
        }

        const { data, error } =
            await supabaseAuth.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                success: false,
                message: "Your session is invalid or expired."
            });
        }

        const email = (data.user.email || "")
            .trim()
            .toLowerCase();

        const role = email === ADMIN_EMAIL
            ? "admin"
            : "user";

        return res.json({
            success: true,
            role,
            user: {
                email
            }
        });

    } catch (error) {
        console.error("LUX SESSION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify your session."
        });
    }
});


 // ADMIN LOGIN
app.post("/api/admin/login", async (req, res) => {
    try {
        const ip = req.ip;
        const now = Date.now();
        const windowMs = 15 * 60 * 1000;

        let attempts = adminLoginAttempts.get(ip);

        if (!attempts || now - attempts.started > windowMs) {
            attempts = { count: 0, started: now };
        }

        if (attempts.count >= 5) {
            return res.status(429).json({
                success: false,
                message: "Too many login attempts. Try again later."
            });
        }

        const email = String(req.body.email || "").trim().toLowerCase();
        const password = req.body.password;

        if (!email || typeof password !== "string" || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        if (email !== ADMIN_EMAIL) {
            console.warn("Admin login rejected: email does not match ADMIN_EMAIL.");

            attempts.count++;
            adminLoginAttempts.set(ip, attempts);

            return res.status(401).json({
                success: false,
                message: "Invalid administrator credentials."
            });
        }

        attempts.count++;
        adminLoginAttempts.set(ip, attempts);

        const { data, error } =
            await supabaseAuth.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            console.error("Supabase sign-in failed:", {
                message: error.message,
                status: error.status,
                code: error.code
            });

            return res.status(401).json({
                success: false,
                message: "Invalid administrator credentials."
            });
        }

        if (!data.user || !data.session) {
            console.error("Supabase sign-in returned no user or session.");

            return res.status(401).json({
                success: false,
                message: "Invalid administrator credentials."
            });
        }

        if (
            !data.user.email ||
            data.user.email.trim().toLowerCase() !== ADMIN_EMAIL
        ) {
            console.error("Admin login rejected: authenticated email mismatch.");

            return res.status(403).json({
                success: false,
                message: "Administrator access denied."
            });
        }

        adminLoginAttempts.delete(ip);

        return res.json({
            success: true,
            access_token: data.session.access_token,
            expires_at: data.session.expires_at,
            user: {
                email: data.user.email
            }
        });

    } catch (error) {
        console.error("Admin login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to sign in."
        });
    }
});


// VERIFY ADMINISTRATOR
async function requireAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Administrator login required."
            });
        }

        const { data, error } =
            await supabaseAuth.auth.getUser(token);

        if (
            error ||
            !data.user ||
            !data.user.email ||
            data.user.email.toLowerCase() !== ADMIN_EMAIL
        ) {
            return res.status(403).json({
                success: false,
                message: "Administrator access denied."
            });
        }

        req.adminUser = data.user;
        next();

    } catch (error) {
        console.error("Admin verification error:", error.message);

        res.status(401).json({
            success: false,
            message: "Unable to verify administrator."
        });
    }
}


// PUBLIC — PUBLISHED MANUAL HIGHLIGHTS
app.get("/api/manual-highlights", async (req, res) => {
    try {
        const { data, error } = await supabaseDB
            .from("manual_highlights")
            .select("*")
            .eq("is_published", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Public highlights error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve highlights."
        });
    }
});


// ADMIN — VIEW ALL MANUAL HIGHLIGHTS
app.get("/api/admin/highlights", requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseDB
            .from("manual_highlights")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });

    } catch (error) {
        console.error("Admin highlights error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve admin highlights."
        });
    }
});


// ADMIN — ADD HIGHLIGHT
app.post("/api/admin/highlights", requireAdmin, async (req, res) => {
    try {
        const {
            title,
            youtube_url,
            home_team,
            away_team,
            league,
            match_date,
            description,
            is_published
        } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            typeof youtube_url !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "A title and YouTube URL are required."
            });
        }

        const youtube_video_id = getYouTubeVideoId(youtube_url);

        if (!youtube_video_id) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid YouTube video link."
            });
        }

        const { data, error } = await supabaseDB
            .from("manual_highlights")
            .insert({
                title: title.trim(),
                youtube_url,
                youtube_video_id,
                home_team: home_team || null,
                away_team: away_team || null,
                league: league || null,
                match_date: match_date || null,
                description: description || null,
                is_published: is_published === true
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Add highlight error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to add highlight."
        });
    }
});


// ADMIN — EDIT HIGHLIGHT
app.patch("/api/admin/highlights/:id", requireAdmin, async (req, res) => {
    try {
        const updates = {};
        const allowed = [
            "title",
            "youtube_url",
            "home_team",
            "away_team",
            "league",
            "match_date",
            "description",
            "is_published"
        ];

        for (const field of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updates[field] = req.body[field];
            }
        }

        if (updates.title !== undefined) {
            if (typeof updates.title !== "string" || !updates.title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Title cannot be empty."
                });
            }

            updates.title = updates.title.trim();
        }

        if (updates.youtube_url !== undefined) {
            const videoId = getYouTubeVideoId(updates.youtube_url);

            if (!videoId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid YouTube video link."
                });
            }

            updates.youtube_video_id = videoId;
        }

        if (updates.is_published !== undefined &&
            typeof updates.is_published !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Invalid publishing status."
            });
        }

        if (Object.keys(updates).length === 0) {
    return res.status(400).json({
        success: false,
        message: "No valid changes were provided."
    });
}

updates.updated_at = new Date().toISOString();

        const { data, error } = await supabaseDB
            .from("manual_highlights")
            .update(updates)
            .eq("id", req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });

    } catch (error) {
        console.error("Edit highlight error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to update highlight."
        });
    }
});


// ADMIN — DELETE HIGHLIGHT
app.delete("/api/admin/highlights/:id", requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseDB
            .from("manual_highlights")
            .delete()
            .eq("id", req.params.id)
            .select("id")
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: "Highlight deleted successfully."
        });

    } catch (error) {
        console.error("Delete highlight error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to delete highlight."
        });
    }
});


// =========================================
// LUX LIVE TV - STREAM MANAGEMENT API
// =========================================

// Convert an authorised YouTube URL into an embed URL
function getYouTubeEmbedUrl(value) {
    try {
        const url = new URL(value);

        if (url.protocol !== "https:") return null;

        const host = url.hostname.toLowerCase();
        let videoId = "";

        if (host === "youtu.be") {
            videoId = url.pathname.split("/").filter(Boolean)[0] || "";
        } else if (
            host === "youtube.com" ||
            host === "www.youtube.com" ||
            host === "m.youtube.com" ||
            host === "youtube-nocookie.com" ||
            host === "www.youtube-nocookie.com"
        ) {
            if (url.pathname === "/watch") {
                videoId = url.searchParams.get("v") || "";
            } else {
                const parts = url.pathname.split("/").filter(Boolean);
                if (["embed", "live", "shorts"].includes(parts[0])) {
                    videoId = parts[1] || "";
                }
            }
        }

        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

        return `https://www.youtube-nocookie.com/embed/${videoId}`;
    } catch {
        return null;
    }
}


// PUBLIC: Get currently published streams
app.get("/api/live-streams", async (req, res) => {
    try {
        const { data, error } = await supabaseDB
            .from("live_streams")
            .select("*")
            .eq("is_published", true)
            .in("status", ["live", "scheduled"])
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            streams: data || []
        });
    } catch (error) {
        console.error("Public streams error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load live streams"
        });
    }
});


// ADMIN: Get all streams
app.get("/api/admin/live-streams", requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseDB
            .from("live_streams")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({ success: true, streams: data || [] });
    } catch (error) {
        console.error("Admin streams error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load streams"
        });
    }
});


// ADMIN: Add a YouTube stream
app.post("/api/admin/live-streams", requireAdmin, async (req, res) => {
    try {
        const {
            title,
            home_team,
            away_team,
            competition,
            source_url,
            status,
            scheduled_at,
            description,
            is_published
        } = req.body;

        if (!title || !source_url) {
            return res.status(400).json({
                success: false,
                message: "Stream title and YouTube URL are required"
            });
        }

        const playback_url = getYouTubeEmbedUrl(source_url);

        if (!playback_url) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid HTTPS YouTube video or live-stream URL"
            });
        }

        const allowedStatuses = ["scheduled", "live", "ended"];

        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid stream status"
            });
        }

        const { data, error } = await supabaseDB
            .from("live_streams")
            .insert([{
                title: String(title).trim(),
                home_team: home_team || null,
                away_team: away_team || null,
                competition: competition || null,
                stream_type: "external",
                source_url: source_url.trim(),
                playback_url,
                status: status || "scheduled",
                scheduled_at: scheduled_at || null,
                description: description || null,
                is_published: is_published === true
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: "Live stream added successfully",
            stream: data
        });
    } catch (error) {
        console.error("Add stream error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not add live stream"
        });
    }
});


// ADMIN: Update stream details or status
app.patch("/api/admin/live-streams/:id", requireAdmin, async (req, res) => {
    try {
        const allowedFields = [
            "title",
            "home_team",
            "away_team",
            "competition",
            "status",
            "scheduled_at",
            "description",
            "is_published"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (req.body.source_url !== undefined) {
            const playback_url = getYouTubeEmbedUrl(req.body.source_url);

            if (!playback_url) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid HTTPS YouTube URL"
                });
            }

            updates.source_url = req.body.source_url.trim();
            updates.playback_url = playback_url;
        }

        if (
            updates.status !== undefined &&
            !["scheduled", "live", "ended"].includes(updates.status)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid stream status"
            });
        }

        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabaseDB
            .from("live_streams")
            .update(updates)
            .eq("id", req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: "Stream updated successfully",
            stream: data
        });
    } catch (error) {
        console.error("Update stream error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not update stream"
        });
    }
});


// ADMIN: Delete a stream
app.delete("/api/admin/live-streams/:id", requireAdmin, async (req, res) => {
    try {
        const { error } = await supabaseDB
            .from("live_streams")
            .delete()
            .eq("id", req.params.id);

        if (error) throw error;

        res.json({
            success: true,
            message: "Stream deleted successfully"
        });
    } catch (error) {
        console.error("Delete stream error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not delete stream"
        });
    }
});


 // API NOT FOUND
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

// GENERAL NOT FOUND
app.use((req, res) => {
    res.status(404).send("Page not found - LUX LIVE FOOTBALL");
});

// ERROR HANDLER
app.use((error, req, res, next) => {
    console.error("LUX API ERROR:", error.message);

    res.status(error.status || 500).json({
        success: false,
        message: error.message || "Internal server error."
    });
});


// START SERVER
app.listen(PORT, "0.0.0.0", () => {
    console.log("================================");
    console.log("LUX LIVE FOOTBALL");
    console.log("Server successfully started");
    console.log("Port:", PORT);
    console.log("Football API key:", API_KEY ? "Configured" : "MISSING");
    console.log("Free plan seasons:", FREE_PLAN_SEASONS.join(", "));
    console.log("================================");
});
