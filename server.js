
require("dotenv").config();

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

console.log("RAW GOAL LIVE DATA:", JSON.stringify(data, null, 2));

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
