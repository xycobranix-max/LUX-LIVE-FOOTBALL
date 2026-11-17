
/* =========================================
   LUX LIVE FOOTBALL
   MAIN WEBSITE JAVASCRIPT
   API-FOOTBALL INTEGRATION
========================================= */

"use strict";

// =========================================
// COMPETITION INFORMATION
// =========================================

const leagueData = {
    "premier-league": {
        name: "Premier League",
        country: "England",
        icon: "🏆"
    },
    "la-liga": {
        name: "La Liga",
        country: "Spain",
        icon: "🏆"
    },
    "serie-a": {
        name: "Serie A",
        country: "Italy",
        icon: "🏆"
    },
    "bundesliga": {
        name: "Bundesliga",
        country: "Germany",
        icon: "🏆"
    },
    "champions-league": {
        name: "Champions League",
        country: "Europe",
        icon: "🏆"
    },
    "afcon": {
        name: "Africa Cup of Nations",
        country: "Africa",
        icon: "🌍"
    }
};

let currentLeagueId = null;

// =========================================
// INITIALIZATION
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    initializeWebsite();
});

function initializeWebsite() {
    updateYear();
    initializeNavigation();
    initializeSearch();
    loadLiveMatches();
    loadFixtures();

    console.log("LUX LIVE FOOTBALL is running!");
}

// =========================================
// FOOTER YEAR
// =========================================

function updateYear() {
    const year = document.getElementById("year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }
}

// =========================================
// NAVIGATION
// =========================================

function initializeNavigation() {
    const links = document.querySelectorAll(".navigation a");

    links.forEach(link => {
        link.addEventListener("click", () => {
            links.forEach(item => item.classList.remove("active"));
            link.classList.add("active");
        });
    });
}

// =========================================
// SEARCH
// =========================================

function initializeSearch() {
    const searchButton = document.querySelector(".search-btn");

    if (!searchButton) return;

    searchButton.addEventListener("click", () => {
        const search = prompt("Search LUX LIVE FOOTBALL:");

        if (!search || !search.trim()) return;

        const query = search.trim().toLowerCase();

        const sections = document.querySelectorAll(
            ".section, .league-card, .highlight-card, .league-team-card"
        );

        let found = false;

        sections.forEach(section => {
            if (
                !found &&
                section.textContent.toLowerCase().includes(query)
            ) {
                section.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                found = true;
            }
        });

        if (!found) {
            alert("No matching content found.");
        }
    });
}

// =========================================
// API HELPER
// =========================================

async function apiRequest(url) {
    const response = await fetch(url);

    const result = await response.json();

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message || "Unable to retrieve football data."
        );
    }

    return result;
}


// =========================================
// LIVE MATCHES - GOAL API
// =========================================

async function loadLiveMatches() {
    const container = document.getElementById("liveMatches");

    if (!container) return;

    try {
        const result = await apiRequest("/api/goal/fixtures/live");

        const matches = Array.isArray(result.data)
            ? result.data
            : [];

        displayLiveMatches(matches);

    } catch (error) {
        console.error("Goal API live matches:", error.message);

        container.innerHTML = `
            <div class="empty-state">
                <span>⚽</span>
                <h3>Live matches unavailable</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

function displayLiveMatches(matches) {
    const container = document.getElementById("liveMatches");

    if (!container) return;

    if (!Array.isArray(matches) || matches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>⚽</span>
                <h3>No live matches currently</h3>
                <p>Live football matches will appear here when available.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = matches.map(match => {

        const homeTeam =
            match.homeTeamName ||
            match.homeTeam?.name ||
            "Home";

        const awayTeam =
            match.awayTeamName ||
            match.awayTeam?.name ||
            "Away";

        const homeScore = match.homeTeamScore ?? "-";
        const awayScore = match.awayTeamScore ?? "-";

        const homeBadge =
            match.teamHomeBadge ||
            match.homeTeam?.badge ||
            "";

        const awayBadge =
            match.teamAwayBadge ||
            match.awayTeam?.badge ||
            "";

        const competition =
            match.leagueName ||
            match.league?.name ||
            "Football";

        const minute = match.matchMinute;

        const status = match.matchStatus || "LIVE";

        const isLive = status.toUpperCase() === "LIVE";

        const events = Array.isArray(match.events)
            ? match.events
            : [];

        const goalEvents = events.filter(event =>
            String(event.type || "").toUpperCase() === "GOAL"
        );

        const goalHTML = goalEvents.map(event => {

            const scorer =
                event.homeScorer ||
                event.awayScorer ||
                "Unknown scorer";

            const team = event.homeScorer
                ? homeTeam
                : awayTeam;

            return `
                <div class="live-goal-event">
                    ⚽ ${escapeHTML(scorer)}
                    <span>${escapeHTML(team)} · ${escapeHTML(event.time)}'</span>
                </div>
            `;
        }).join("");

        const safeBadge = url =>
            typeof url === "string" &&
            /^https:\/\//i.test(url)
                ? escapeAttribute(url)
                : "";

        const homeImage = safeBadge(homeBadge);
        const awayImage = safeBadge(awayBadge);

        return `
            <div class="match-card">

                <div class="match-header">

                    <span>
                        ${escapeHTML(competition)}
                    </span>

                    <span class="live-indicator">
                        <span class="live-dot"></span>
                        ${isLive
                            ? `LIVE ${minute != null ? escapeHTML(minute) + "'" : ""}`
                            : escapeHTML(status)
                        }
                    </span>

                </div>

                <div class="match-teams">

                    <div class="team">

                        ${homeImage
                            ? `<img class="team-logo"
                                    src="${homeImage}"
                                    alt="${escapeHTML(homeTeam)}"
                                    loading="lazy">`
                            : `<span class="team-logo">⚽</span>`
                        }

                        <strong>${escapeHTML(homeTeam)}</strong>

                    </div>

                    <div class="match-score">

                        ${escapeHTML(homeScore)}
                        -
                        ${escapeHTML(awayScore)}

                    </div>

                    <div class="team">

                        ${awayImage
                            ? `<img class="team-logo"
                                    src="${awayImage}"
                                    alt="${escapeHTML(awayTeam)}"
                                    loading="lazy">`
                            : `<span class="team-logo">⚽</span>`
                        }

                        <strong>${escapeHTML(awayTeam)}</strong>

                    </div>

                </div>

                ${goalHTML
                    ? `<div class="live-goals">${goalHTML}</div>`
                    : ""
                }

                <div class="live-match-footer">
                    <span>${escapeHTML(match.matchPeriod || "")}</span>
                    <span>${escapeHTML(match.matchStadium || "")}</span>
                </div>

            </div>
        `;

    }).join("");
}



// =========================================
// UPCOMING FIXTURES - GOAL API
// =========================================

// Your existing Goal API league database IDs
const fixtureLeagues = [
    {
        id: "cmr77dvkr005nrx06lp7rvp49",
        name: "Premier League"
    },
    {
        id: "cmr77dvnt006nrx063v3w622e",
        name: "La Liga"
    },
    {
        id: "cmr77dvpd006yrx06zig7907g",
        name: "Serie A"
    },
    {
        id: "cmr77dvgm0002rx06rt2uqxii",
        name: "Bundesliga"
    },
    {
        id: "cmr77dw3900f5rx06j05wgzv4",
        name: "Champions League"
    },
    {
        id: "cmr77dvhf0015rx069i57rsbo",
        name: "AFCON"
    }
];

async function loadFixtures() {
    const container = document.getElementById("fixtures");

    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <span>📅</span>
            <h3>Loading fixtures...</h3>
            <p>Fetching upcoming matches.</p>
        </div>
    `;

    try {
        const responses = await Promise.allSettled(
            fixtureLeagues.map(async league => {
                const result = await apiRequest(
                    `/api/goal/leagues/${encodeURIComponent(league.id)}/fixtures`
                );

                const matches = Array.isArray(result.data)
                    ? result.data
                    : [];

                return matches.map(match => ({
                    ...match,
                    leagueName: match.leagueName || league.name
                }));
            })
        );

        const fixtures = responses
            .filter(response => response.status === "fulfilled")
            .flatMap(response => response.value);

        const failedCount = responses.filter(
            response => response.status === "rejected"
        ).length;

        displayFixtures(fixtures);

        if (failedCount === fixtureLeagues.length) {
            throw new Error("Unable to retrieve fixtures from Goal API.");
        }

    } catch (error) {
        console.error("Goal API Fixtures:", error.message);

        container.innerHTML = `
            <div class="empty-state">
                <span>📅</span>
                <h3>Fixtures unavailable</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

function displayFixtures(fixtures) {
    const container = document.getElementById("fixtures");

    if (!container) return;

    if (!Array.isArray(fixtures) || fixtures.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📅</span>
                <h3>No fixtures available</h3>
                <p>Upcoming fixtures will appear here when available.</p>
            </div>
        `;
        return;
    }

    // Sort fixtures by kickoff date
    const sortedFixtures = [...fixtures].sort((a, b) => {
        const dateA = new Date(a.kickoffUtc || a.matchDate || 0);
        const dateB = new Date(b.kickoffUtc || b.matchDate || 0);

        return dateA - dateB;
    });

    // Display scheduled and upcoming matches first
    const upcomingFixtures = sortedFixtures.filter(match => {
        const status = String(match.matchStatus || "").toUpperCase();

        return ![
            "FINISHED",
            "FT",
            "CANCELLED",
            "POSTPONED",
            "ABANDONED"
        ].includes(status);
    });

    if (upcomingFixtures.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📅</span>
                <h3>No upcoming fixtures</h3>
                <p>Check again later for new matches.</p>
            </div>
        `;
        return;
    }

    const safeBadge = url =>
        typeof url === "string" && /^https:\/\//i.test(url)
            ? escapeAttribute(url)
            : "";

    container.innerHTML = upcomingFixtures.map(match => {

        const homeTeam = match.homeTeamName ||
            match.homeTeam?.name || "Home";

        const awayTeam = match.awayTeamName ||
            match.awayTeam?.name || "Away";

        const homeBadge = safeBadge(
            match.teamHomeBadge || match.homeTeam?.badge || ""
        );

        const awayBadge = safeBadge(
            match.teamAwayBadge || match.awayTeam?.badge || ""
        );

        const rawDate = match.kickoffUtc || match.matchDate;

        const date = rawDate
            ? new Date(rawDate).toLocaleString("en-KE", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Africa/Nairobi"
            })
            : "Date TBA";

        const status = match.matchStatus || "SCHEDULED";

        const homeScore = match.homeTeamScore ?? "";
        const awayScore = match.awayTeamScore ?? "";

        const hasScore = homeScore !== "" && awayScore !== "";

        return `
    <div class="fixture-card"
         role="button"
         tabindex="0"
         onclick="openMatchDetails('${escapeAttribute(match.id)}')">

                <div class="fixture-header">
                    <span>
                        ${escapeHTML(match.leagueName || "Football")}
                    </span>

                    <strong>
                        ${escapeHTML(status)}
                    </strong>
                </div>

                <div class="fixture-teams">

                    <div class="team">
                        ${
                            homeBadge
                                ? `<img class="team-logo"
                                        src="${homeBadge}"
                                        alt="${escapeHTML(homeTeam)}"
                                        loading="lazy">`
                                : `<span class="team-logo">⚽</span>`
                        }

                        <strong>${escapeHTML(homeTeam)}</strong>
                    </div>

                    <div class="fixture-score">
                        ${
                            hasScore
                                ? `${escapeHTML(homeScore)} - ${escapeHTML(awayScore)}`
                                : "VS"
                        }
                    </div>

                    <div class="team">
                        ${
                            awayBadge
                                ? `<img class="team-logo"
                                        src="${awayBadge}"
                                        alt="${escapeHTML(awayTeam)}"
                                        loading="lazy">`
                                : `<span class="team-logo">⚽</span>`
                        }

                        <strong>${escapeHTML(awayTeam)}</strong>
                    </div>

                </div>

                <div class="fixture-date">
                    📅 ${escapeHTML(date)}
                </div>

            </div>
        `;
    }).join("");
}


// =========================================
// MATCH VIEWER
// =========================================

function watchMatch(matchId) {
    const player = document.getElementById("player");

    if (!matchId) {
        alert("Match information is unavailable.");
        return;
    }

    if (player) {
        player.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    alert(
        "Match selected. An authorised streaming provider must be connected before video can play."
    );
}

// =========================================
// LOGIN MODAL
// =========================================

function showLogin() {
    const modal = document.getElementById("loginModal");

    if (modal) {
        modal.classList.add("show");
    }
}

function closeLogin() {
    const modal = document.getElementById("loginModal");

    if (modal) {
        modal.classList.remove("show");
    }
}

// =========================================
// LOGIN PLACEHOLDER
// =========================================

async function login() {
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");

    if (!emailInput || !passwordInput || !message) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        message.textContent = "Enter your email and password.";
        return;
    }

    message.textContent =
        "Login service is not connected yet. Please try again later.";
}

// =========================================
// LOAD LEAGUE TEAMS FROM API
// =========================================


async function openLeague(leagueId) {
    const league = leagueData[leagueId];

    if (!league) {
        console.error("Competition not found:", leagueId);
        return;
    }

    // Goal API database IDs
    const goalLeagueIds = {
        "premier-league": "cmr77dvkr005nrx06lp7rvp49",
        "la-liga": "cmr77dvnt006nrx063v3w622e",
        "serie-a": "cmr77dvpd006yrx06zig7907g",
        "bundesliga": "cmr77dvgm0002rx06rt2uqxii",
        "champions-league": "cmr77dw3900f5rx06j05wgzv4",
        "afcon": "cmr77dvhf0015rx069i57rsbo"
    };

    const goalLeagueId = goalLeagueIds[leagueId];

    if (!goalLeagueId) {
        console.error("Goal API ID missing:", leagueId);
        return;
    }

    currentLeagueId = leagueId;

    const home = document.getElementById("homePage");
    const details = document.getElementById("leagueDetailsPage");
    const profile = document.getElementById("teamProfilePage");
    const teamsContainer = document.getElementById("leagueTeams");

    if (!details || !teamsContainer) {
        console.error("League details HTML elements are missing.");
        return;
    }

    document.querySelectorAll("[data-page-section]").forEach(page => {
        page.hidden = true;
    });

    if (home) home.hidden = true;
    if (profile) profile.hidden = true;

    details.hidden = false;

    document.getElementById("leagueIcon").textContent = league.icon;
    document.getElementById("leagueTitle").textContent = league.name;
    document.getElementById("leagueCountry").textContent =
        league.country + " · Loading teams...";

    teamsContainer.innerHTML = `
        <div class="loading-state">
            <p>⚽ Loading ${league.name} teams...</p>
        </div>
    `;

    window.scrollTo(0, 0);

    try {
        const result = await apiRequest(
            `/api/goal/leagues/${encodeURIComponent(goalLeagueId)}/teams`
        );

        if (currentLeagueId !== leagueId) return;

        const teams = result.data || [];

        document.getElementById("leagueCountry").textContent =
            `${league.country} · ${teams.length} Teams`;

        teamsContainer.replaceChildren();

        if (!teams.length) {
            teamsContainer.innerHTML = `
                <p class="empty-state">
                    No teams are currently available for this competition.
                </p>
            `;
            return;
        }

        teams.forEach((team, index) => {
            const card = document.createElement("div");

            card.className = "league-team-card";
            card.style.cursor = "pointer";
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");

            const number = document.createElement("span");
            number.textContent = index + 1;

            const logo = document.createElement("img");
            logo.className = "team-badge";
            logo.src = team.logo || "";
            logo.alt = team.name || "Team";
            logo.loading = "lazy";

            logo.onerror = () => {
                logo.replaceWith(
                    document.createTextNode("⚽")
                );
            };

            const name = document.createElement("strong");
            name.textContent = team.name || "Unknown Team";

            const arrow = document.createElement("span");
            arrow.textContent = "›";

            card.append(number, logo, name, arrow);

            card.addEventListener("click", () => {
                openTeam(team);
            });

            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openTeam(team);
                }
            });

            teamsContainer.appendChild(card);
        });

    } catch (error) {
        console.error("League teams error:", error);

        if (currentLeagueId !== leagueId) return;

        teamsContainer.innerHTML = `
            <p class="error-state">
                Unable to load teams.
                Please try again later.
            </p>
        `;

        document.getElementById("leagueCountry").textContent =
            league.country + " · Teams unavailable";
    }
}

// =========================================
// INDIVIDUAL TEAM PROFILE
// =========================================


async function openTeam(team) {
    const profilePage = document.getElementById("teamProfilePage");
    const leaguePage = document.getElementById("leagueDetailsPage");

    if (!profilePage) {
        console.error("Team profile page not found.");
        return;
    }

    // Hide other pages and show team profile
    document.querySelectorAll("[data-page-section]").forEach(page => {
        page.hidden = true;
    });

    document.getElementById("homePage")?.setAttribute("hidden", "");
    leaguePage?.setAttribute("hidden", "");

    profilePage.hidden = false;

    const teamId = team.id;
    const teamName = team.name || "Football Club";

    const badge = team.badge || team.logo || "";
    const country = team.country || "Unknown";
    const founded = team.founded || "Unknown";

    // Basic team information
    profilePage.innerHTML = `
        <div class="team-profile-container">

            <button class="back-button" onclick="closeTeam()">
                ← Back to Teams
            </button>

            <div class="team-profile-header">

                ${badge ? `
                    <img src="${badge}"
                         alt="${teamName}"
                         class="team-profile-logo">
                ` : ""}

                <h1>${teamName}</h1>

                <p>${country}</p>

                <div class="team-basic-info">
                    <span>Founded: ${founded}</span>
                    <span>Team ID: ${teamId}</span>
                </div>

            </div>

            <div class="team-stadium-card">
                <h2>🏟️ Stadium Information</h2>

                <p id="teamVenue">
                    Stadium: ${team.venueName || "Not available"}
                </p>

                <p id="teamVenueCity">
                    Location: ${team.venueCity || "Not available"}
                </p>

                <p>
                    Capacity: ${
                        team.venueCapacity
                        ? Number(team.venueCapacity).toLocaleString()
                        : "Not available"
                    }
                </p>

                <p>
                    Surface: ${team.venueSurface || "Not available"}
                </p>
            </div>

            <div class="team-matches-section">

                <h2>📊 Recent Results</h2>

                <div id="teamRecentResults">
                    Loading recent results...
                </div>

                <h2>📅 Upcoming Fixtures</h2>

                <div id="teamUpcomingFixtures">
                    Loading upcoming fixtures...
                </div>

            </div>

        </div>
    `;

    // Escape HTML from API-provided values
    const escapeHTML = value => String(value ?? "")
        .replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    // Render match cards
    function renderMatches(matches, emptyMessage) {
        if (!Array.isArray(matches) || matches.length === 0) {
            return `<p>${escapeHTML(emptyMessage)}</p>`;
        }

        return matches.map(match => {
            const home = match.homeTeamName || match.homeTeam?.name || "Home";
            const away = match.awayTeamName || match.awayTeam?.name || "Away";

            const homeScore = match.homeTeamScore;
            const awayScore = match.awayTeamScore;

            const finished = match.matchStatus === "FINISHED";

            const score = homeScore !== null && homeScore !== undefined &&
                          awayScore !== null && awayScore !== undefined
                ? `${escapeHTML(homeScore)} - ${escapeHTML(awayScore)}`
                : "VS";

            const date = match.matchDate || "";
            const time = match.matchTime || "";
            const competition = match.leagueName || "Competition";
            const stadium = match.matchStadium || "";

            const homeBadge = match.teamHomeBadge || match.homeTeam?.badge || "";
            const awayBadge = match.teamAwayBadge || match.awayTeam?.badge || "";

            return `
                <div class="team-match-card">

                    <p class="match-competition">
                        ${escapeHTML(competition)}
                    </p>

                    <div class="team-match-teams">

                        <div class="match-team">
                            ${homeBadge ? `
                                <img src="${escapeHTML(homeBadge)}"
                                     alt=""
                                     class="match-team-logo">
                            ` : ""}
                            <strong>${escapeHTML(home)}</strong>
                        </div>

                        <div class="match-score">
                            <strong>${score}</strong>
                            <small>
                                ${finished ? "FT" : escapeHTML(match.matchStatus || "Scheduled")}
                            </small>
                        </div>

                        <div class="match-team">
                            ${awayBadge ? `
                                <img src="${escapeHTML(awayBadge)}"
                                     alt=""
                                     class="match-team-logo">
                            ` : ""}
                            <strong>${escapeHTML(away)}</strong>
                        </div>

                    </div>

                    <p class="match-date">
                        ${escapeHTML(date)} ${escapeHTML(time)}
                    </p>

                    ${stadium ? `
                        <p class="match-stadium">
                            🏟️ ${escapeHTML(stadium)}
                        </p>
                    ` : ""}

                </div>
            `;
        }).join("");
    }

    // Load results and upcoming fixtures
    const resultsElement = document.getElementById("teamRecentResults");
    const upcomingElement = document.getElementById("teamUpcomingFixtures");

    try {
        const [resultsResponse, upcomingResponse] =
            await Promise.allSettled([
                apiRequest(
                    `/api/goal/teams/${encodeURIComponent(teamId)}/results`
                ),
                apiRequest(
                    `/api/goal/teams/${encodeURIComponent(teamId)}/upcoming`
                )
            ]);

        if (resultsResponse.status === "fulfilled") {
            const results = resultsResponse.value.data || [];

            resultsElement.innerHTML = renderMatches(
                results,
                "No recent results available."
            );
        } else {
            resultsElement.innerHTML =
                "<p>Unable to load recent results.</p>";

            console.error("Results error:", resultsResponse.reason);
        }

        if (upcomingResponse.status === "fulfilled") {
            const upcoming = upcomingResponse.value.data || [];

            upcomingElement.innerHTML = renderMatches(
                upcoming,
                "No upcoming fixtures available."
            );
        } else {
            upcomingElement.innerHTML =
                "<p>Unable to load upcoming fixtures.</p>";

            console.error("Upcoming fixtures error:", upcomingResponse.reason);
        }

    } catch (error) {
        console.error("Team profile error:", error);

        resultsElement.innerHTML =
            "<p>Could not load team information.</p>";

        upcomingElement.innerHTML =
            "<p>Could not load fixtures.</p>";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// =========================================
// RETURN TO LEAGUE
// =========================================

function closeTeam() {
    document.getElementById("teamProfilePage").hidden = true;
    document.getElementById("leagueDetailsPage").hidden = false;

        window.scrollTo(0, 0);
}

// =========================================
// RETURN TO HOMEPAGE
// =========================================

function closeLeague() {
    document.getElementById("teamProfilePage").hidden = true;
    document.getElementById("leagueDetailsPage").hidden = true;

    document.getElementById("homePage").hidden = false;

    currentLeagueId = null;

    window.history.pushState(
        { page: "home" },
        "",
        window.location.pathname
    );

    document.title = "HOME | LUX LIVE FOOTBALL";

    window.scrollTo(0, 0);
}

// =========================================
// SECURITY HELPERS
// =========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function escapeAttribute(value) {
    return String(value ?? "").replace(/[^a-zA-Z0-9_:/.-]/g, "");
}

// =========================================
// AUTOMATIC MATCH REFRESH
// =========================================

setInterval(() => {
    loadLiveMatches();
    loadFixtures();
}, 60000);

// =========================================
// OPEN MATCH DETAILS PAGE
// =========================================

window.openMatchDetails = function(fixtureId) {

    if (!fixtureId) {
        console.error("Match ID is missing");
        return;
    }

    window.location.href =
        `?page=match&id=${encodeURIComponent(fixtureId)}`;
};


/* =========================================
   LUX LIVE FOOTBALL
   MATCH DETAILS FRONTEND
========================================= */

window.currentMatchDetails = null;

// LOAD MATCH DETAILS
window.loadMatchDetails = async function(fixtureId) {

    const container = document.getElementById("matchDetailsContent");

    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <span>⚽</span>
            <h3>Loading match details...</h3>
            <p>Please wait.</p>
        </div>
    `;

    try {

        const result = await apiRequest(
            `/api/goal/fixtures/${encodeURIComponent(fixtureId)}`
        );

        if (!result || !result.success || !result.data) {
            throw new Error("Match information was not found.");
        }

        window.currentMatchDetails = result.data;

        renderMatchDetails(result.data);

    } catch (error) {

        console.error("Match details error:", error);

        container.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <h3>Unable to load match details</h3>
                <p>${escapeHTML(error.message)}</p>
                <button onclick="window.loadMatchDetails('${escapeAttribute(fixtureId)}')">
                    Try Again
                </button>
            </div>
        `;
    }
};


// RENDER MATCH DETAILS
function renderMatchDetails(match) {

    const container = document.getElementById("matchDetailsContent");

    if (!container) return;

    const home = match.homeTeamName || match.homeTeam?.name || "Home";
    const away = match.awayTeamName || match.awayTeam?.name || "Away";

    const homeBadge = match.teamHomeBadge || match.homeTeam?.badge || "";
    const awayBadge = match.teamAwayBadge || match.awayTeam?.badge || "";

    const safeImage = url =>
        typeof url === "string" && /^https:\/\//i.test(url)
            ? escapeAttribute(url)
            : "";

    const homeLogo = safeImage(homeBadge);
    const awayLogo = safeImage(awayBadge);

    const status = match.matchStatus || "SCHEDULED";

    let homeScore = match.homeTeamScore ?? "-";
    let awayScore = match.awayTeamScore ?? "-";

    // Show regulation/extra-time result for penalty shootouts
    if (status === "AFTER_PEN") {
        homeScore = match.homeTeamFtScore ?? homeScore;
        awayScore = match.awayTeamFtScore ?? awayScore;
    }

    const penalties = status === "AFTER_PEN"
        ? `<p class="penalty-score">
            Penalties: ${escapeHTML(match.homeTeamPenaltyScore ?? "-")}
            - ${escapeHTML(match.awayTeamPenaltyScore ?? "-")}
           </p>`
        : "";

    const date = match.kickoffUtc
        ? new Date(match.kickoffUtc).toLocaleString("en-KE", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Africa/Nairobi"
        })
        : "Date unavailable";

    container.innerHTML = `

        <div class="match-details-card">

            <div class="match-details-league">
                ${escapeHTML(match.leagueName || "Football")}
                ${match.leagueYear ? " · " + escapeHTML(match.leagueYear) : ""}
            </div>

            <div class="match-details-status">
                ${escapeHTML(status.replaceAll("_", " "))}
            </div>

            <div class="match-details-scoreboard">

                <div class="match-details-team">
                    ${homeLogo
                        ? `<img src="${homeLogo}" alt="${escapeHTML(home)}">`
                        : `<span>⚽</span>`
                    }
                    <strong>${escapeHTML(home)}</strong>
                </div>

                <div class="match-details-score">
                    <strong>${escapeHTML(homeScore)} - ${escapeHTML(awayScore)}</strong>
                    ${penalties}
                </div>

                <div class="match-details-team">
                    ${awayLogo
                        ? `<img src="${awayLogo}" alt="${escapeHTML(away)}">`
                        : `<span>⚽</span>`
                    }
                    <strong>${escapeHTML(away)}</strong>
                </div>

            </div>

            <div class="match-details-info">
                <p>📅 ${escapeHTML(date)}</p>
                <p>🏟️ ${escapeHTML(match.matchStadium || "Stadium unavailable")}</p>
                <p>🏆 ${escapeHTML(match.stageName || match.matchRound || "")}</p>
                <p>🧑‍⚖️ ${escapeHTML(match.matchReferee || "Referee unavailable")}</p>
            </div>

        </div>

        <div class="match-tabs">
            <button class="active" onclick="showMatchTab('overview')">Overview</button>
            <button onclick="showMatchTab('events')">Events</button>
            <button onclick="showMatchTab('lineups')">Lineups</button>
            <button onclick="showMatchTab('statistics')">Statistics</button>
        </div>

        <div id="matchTabContent"></div>
    `;

    showMatchTab("overview");
}


// MATCH TAB NAVIGATION
window.showMatchTab = function(tab) {

    const match = window.currentMatchDetails;
    const content = document.getElementById("matchTabContent");

    if (!match || !content) return;

    document.querySelectorAll(".match-tabs button").forEach(button => {
        button.classList.toggle(
            "active",
            button.textContent.trim().toLowerCase() === tab
        );
    });

    if (tab === "overview") {

        content.innerHTML = `
            <div class="match-info-panel">
                <h3>Match Information</h3>
                <p><strong>Competition:</strong> ${escapeHTML(match.leagueName || "N/A")}</p>
                <p><strong>Country:</strong> ${escapeHTML(match.countryName || "N/A")}</p>
                <p><strong>Season:</strong> ${escapeHTML(match.leagueYear || "N/A")}</p>
                <p><strong>Match status:</strong> ${escapeHTML(match.matchStatus || "N/A")}</p>
                <p><strong>Venue:</strong> ${escapeHTML(match.matchStadium || "N/A")}</p>
            </div>
        `;

        return;
    }

    if (tab === "events") {

        const events = match.events || [];
        const cards = match.cards || [];
        const substitutions = match.substitutions || [];

        const timeline = [
            ...events.map(item => ({
                time: item.time,
                text: `⚽ ${item.homeScorer || item.awayScorer || "Goal"}`,
                detail: item.info || item.score || "Goal",
                side: item.homeScorer ? "home" : "away"
            })),

            ...cards.map(item => ({
                time: item.time,
                text: `${String(item.card || "Card").toLowerCase().includes("red") ? "🟥" : "🟨"} ${item.homeFault || item.awayFault || "Player"}`,
                detail: item.card || "Card",
                side: item.homeFault ? "home" : "away"
            })),

            ...substitutions.map(item => ({
                time: item.time,
                text: `🔄 ${item.substitution || "Substitution"}`,
                detail: item.team === "home" ? "Home substitution" : "Away substitution",
                side: item.team
            }))
        ];

        timeline.sort((a, b) => {
            const timeA = parseInt(a.time, 10) || 0;
            const timeB = parseInt(b.time, 10) || 0;
            return timeA - timeB;
        });

        content.innerHTML = timeline.length
            ? `
                <div class="match-info-panel">
                    <h3>Match Events</h3>
                    ${timeline.map(item => `
                        <div class="match-event ${item.side === "away" ? "away-event" : ""}">
                            <strong>${escapeHTML(item.time || "")}'</strong>
                            <span>${escapeHTML(item.text)}</span>
                            <small>${escapeHTML(item.detail)}</small>
                        </div>
                    `).join("")}
                </div>
            `
            : `<div class="empty-state">
                <h3>No match events available</h3>
                <p>Match events will appear here when available.</p>
               </div>`;

        return;
    }

    if (tab === "lineups") {

        const lineups = match.lineups || [];

        const renderTeam = (team, label) => {

            const players = lineups.filter(player =>
                player.team === team &&
                player.type !== "coach"
            );

            const starters = players.filter(player =>
                player.type === "starting_lineups"
            );

            const substitutes = players.filter(player =>
                player.type === "substitutes"
            );

            const coaches = lineups.filter(player =>
                player.team === team &&
                player.type === "coach"
            );

            return `
                <div class="match-info-panel">
                    <h3>${label}</h3>

                    <h4>Starting XI</h4>

                    ${starters.length
                        ? starters.map(player => `
                            <p>
                                ${escapeHTML(player.lineupNumber || "")}
                                · ${escapeHTML(player.lineupPlayer || "Player")}
                            </p>
                        `).join("")
                        : "<p>Starting lineup unavailable.</p>"
                    }

                    <h4>Substitutes</h4>

                    ${substitutes.length
                        ? substitutes.map(player => `
                            <p>
                                ${escapeHTML(player.lineupNumber || "")}
                                · ${escapeHTML(player.lineupPlayer || "Player")}
                            </p>
                        `).join("")
                        : "<p>Substitutes unavailable.</p>"
                    }

                    ${coaches.map(coach => `
                        <p><strong>Coach:</strong> ${escapeHTML(coach.lineupPlayer)}</p>
                    `).join("")}
                </div>
            `;
        };

        content.innerHTML = lineups.length
            ? renderTeam("home", match.homeTeamName || "Home") +
              renderTeam("away", match.awayTeamName || "Away")
            : `<div class="empty-state">
                <h3>Lineups unavailable</h3>
                <p>Team lineups have not been provided.</p>
               </div>`;

        return;
    }

    if (tab === "statistics") {

        const statistics = match.statistics || [];

        content.innerHTML = statistics.length
            ? `
                <div class="match-info-panel">
                    <h3>Match Statistics</h3>
                    ${statistics.map(stat => `
                        <p>
                            ${escapeHTML(stat.type || stat.name || "Statistic")}
                            : ${escapeHTML(stat.homeValue ?? stat.home ?? "-")}
                            - ${escapeHTML(stat.awayValue ?? stat.away ?? "-")}
                        </p>
                    `).join("")}
                </div>
            `
            : `<div class="empty-state">
                <h3>Statistics unavailable</h3>
                <p>Match statistics will appear here when provided by the data source.</p>
               </div>`;
    }
};
