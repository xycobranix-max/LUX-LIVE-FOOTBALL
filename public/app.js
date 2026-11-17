
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
// UPCOMING FIXTURES
// =========================================

async function loadFixtures() {
    const container = document.getElementById("fixtures");

    if (!container) return;

    try {
        const result = await apiRequest("/api/matches/fixtures");

        displayFixtures(result.fixtures || []);

    } catch (error) {
        console.error("Fixtures:", error.message);

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

    if (!fixtures.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📅</span>
                <h3>No fixtures available</h3>
                <p>Upcoming fixtures will appear here when available.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = fixtures.map(match => {
        const date = match.date
            ? new Date(match.date).toLocaleString("en-KE", {
                dateStyle: "medium",
                timeStyle: "short"
            })
            : "Date TBA";

        return `
            <div class="fixture-card">

                <div>
                    <strong class="fixture-teams">
                        ${escapeHTML(match.homeTeam || "Home")}
                        vs
                        ${escapeHTML(match.awayTeam || "Away")}
                    </strong>

                    <p>${escapeHTML(match.competition || "Football")}</p>
                </div>

                <div>
                    <p>${escapeHTML(date)}</p>
                    <strong>${escapeHTML(match.status || "Scheduled")}</strong>
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