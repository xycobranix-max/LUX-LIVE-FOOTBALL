
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
    if (document.body.classList.contains("lux-auth-locked")) {
        return;
    }

    const modal = document.getElementById("loginModal");

    if (modal) {
        modal.classList.remove("show");
    }
}


/* =========================================
   LUX ACCOUNT AUTHENTICATION
========================================= */

window.luxAuthMode = "login";

function switchAuthMode() {
    window.luxAuthMode =
        window.luxAuthMode === "login" ? "signup" : "login";

    const signup = window.luxAuthMode === "signup";

    document.getElementById("authTitle").textContent =
        signup ? "Create Your LUX Account" : "Welcome to LUX";

    document.getElementById("authDescription").textContent =
        signup
            ? "Join LUX LIVE FOOTBALL today."
            : "Sign in to your LUX football account.";

    document.getElementById("authSubmitButton").textContent =
        signup ? "Create Account" : "Sign In";

    document.getElementById("authSwitchText").textContent =
        signup ? "Already have an account?" : "Don't have an account?";

    document.getElementById("authSwitchButton").textContent =
        signup ? "Sign In" : "Create Account";

    document.getElementById("loginPassword").value = "";
    document.getElementById("loginMessage").textContent = "";
}

async function login() {
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");
    const submitButton = document.getElementById("authSubmitButton");

    if (!emailInput || !passwordInput || !message || !submitButton) {
        return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const signup = window.luxAuthMode === "signup";

    if (!email || !password) {
        message.textContent = "Enter your email and password.";
        return;
    }

    if (signup && password.length < 8) {
        message.textContent = "Password must have at least 8 characters.";
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Please wait...";
    message.textContent = "";

    try {
        const response = await fetch(
            signup ? "/api/auth/signup" : "/api/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Authentication failed.");
        }

        if (signup) {
            message.textContent = result.message;
            passwordInput.value = "";

            window.luxAuthMode = "login";

            document.getElementById("authTitle").textContent =
                "Account Created";

            document.getElementById("authDescription").textContent =
                "Your LUX account has been registered.";

            document.getElementById("authSubmitButton").textContent =
                "Sign In";

            document.getElementById("authSwitchText").textContent =
                "Already have an account?";

            document.getElementById("authSwitchButton").textContent =
                "Sign In";

            return;
        }

        if (!result.access_token) {
            throw new Error("Login succeeded but no session was returned.");
        }

        sessionStorage.setItem(
            "lux_user_token",
            result.access_token
        );

        sessionStorage.setItem(
            "lux_user_email",
            result.user.email
        );

        sessionStorage.setItem(
            "lux_user_role",
            result.role
        );

        if (result.role === "admin") {
            sessionStorage.setItem(
                "lux_admin_token",
                result.access_token
            );

            message.textContent = "Administrator verified. Opening dashboard...";

            window.location.href = "/admin.html";
            return;
        }

        message.textContent = "Welcome to LUX! You are signed in.";

document.body.classList.remove("lux-auth-locked");

        const loginButton = document.querySelector(".login-btn");

        if (loginButton) {
            loginButton.textContent = "My Account";
        }

        setTimeout(() => {
            closeLogin();
        }, 1200);

    } catch (error) {
        message.textContent = error.message;
    } finally {
        submitButton.disabled = false;

        if (window.luxAuthMode === "signup") {
            submitButton.textContent = "Create Account";
        } else {
            submitButton.textContent = "Sign In";
        }
    }
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



// =========================================
// MATCH TAB NAVIGATION
// PREMIUM MATCH CENTRE
// =========================================

window.showMatchTab = function(tab) {

    const match = window.currentMatchDetails;
    const content = document.getElementById("matchTabContent");

    if (!match || !content) return;

    // Update active tab
    document.querySelectorAll(".match-tabs button").forEach(button => {
        button.classList.toggle(
            "active",
            button.textContent.trim().toLowerCase() === tab
        );
    });

    // =====================================
    // OVERVIEW
    // =====================================

    if (tab === "overview") {

        content.innerHTML = `
            <div class="match-info-panel">
                <h3>⚽ Match Information</h3>

                <p><strong>Competition:</strong>
                    ${escapeHTML(match.leagueName || "N/A")}
                </p>

                <p><strong>Country:</strong>
                    ${escapeHTML(match.countryName || "N/A")}
                </p>

                <p><strong>Season:</strong>
                    ${escapeHTML(match.leagueYear || "N/A")}
                </p>

                <p><strong>Match status:</strong>
                    ${escapeHTML(match.matchStatus || "N/A")}
                </p>

                <p><strong>Venue:</strong>
                    ${escapeHTML(match.matchStadium || "N/A")}
                </p>
            </div>
        `;

        return;
    }

    // =====================================
    // EVENTS
    // =====================================

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
                text: `${
                    String(item.card || "Card").toLowerCase().includes("red")
                        ? "🟥"
                        : "🟨"
                } ${item.homeFault || item.awayFault || "Player"}`,
                detail: item.card || "Card",
                side: item.homeFault ? "home" : "away"
            })),

            ...substitutions.map(item => ({
                time: item.time,
                text: `🔄 ${item.substitution || "Substitution"}`,
                detail: item.team === "home"
                    ? "Home substitution"
                    : "Away substitution",
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
                    <h3>⚡ Match Timeline</h3>

                    ${timeline.map(item => `
                        <div class="match-event ${
                            item.side === "away" ? "away-event" : ""
                        }">
                            <strong>${escapeHTML(item.time || "")}'</strong>
                            <span>${escapeHTML(item.text)}</span>
                            <small>${escapeHTML(item.detail)}</small>
                        </div>
                    `).join("")}
                </div>
            `
            : `
                <div class="empty-state">
                    <span>⚽</span>
                    <h3>No match events available</h3>
                    <p>Match events will appear here when available.</p>
                </div>
            `;

        return;
    }

    
    // =====================================
    // TACTICAL LINEUPS
    // =====================================

    if (tab === "lineups") {

        const lineups = Array.isArray(match.lineups)
            ? match.lineups
            : [];

        const renderTeam = (team, label, formation) => {

            const players = lineups.filter(player =>
                player.team === team
            );

            const starters = players
                .filter(player => player.type === "starting_lineups")
                .sort((a, b) =>
                    Number(a.lineupPosition || 0) -
                    Number(b.lineupPosition || 0)
                );

            const substitutes = players.filter(player =>
                player.type === "substitutes"
            );

            const coaches = players.filter(player =>
                player.type === "coach"
            );

            // Read the actual formation supplied by Goal API
            const formationParts = String(formation || "4-2-3-1")
                .split("-")
                .map(Number)
                .filter(number => Number.isFinite(number) && number > 0);

            // Position 1 is the goalkeeper.
            // Remaining players are grouped by formation lines.
            const lines = [];
            let playerIndex = 1;

            formationParts.forEach(number => {
                lines.push(starters.slice(playerIndex, playerIndex + number));
                playerIndex += number;
            });

            // Fallback if the formation and lineup counts differ
            if (
                starters.length !== 11 ||
                lines.reduce((total, line) => total + line.length, 0) !== 10
            ) {
                lines.length = 0;

                const outfield = starters.slice(1);
                const count = outfield.length;

                if (count > 0) {
                    const groups = formationParts.length
                        ? formationParts
                        : [4, 2, 3, 1];

                    let index = 0;

                    groups.forEach(size => {
                        if (index < count) {
                            lines.push(outfield.slice(index, index + size));
                            index += size;
                        }
                    });

                    if (index < count) {
                        lines.push(outfield.slice(index));
                    }
                }
            }

            const renderPlayer = player => `
                <div class="tactical-player" title="${escapeHTML(player.lineupPlayer || "Player")}">
                    <span class="tactical-shirt">
                        ${escapeHTML(player.lineupNumber || "")}
                    </span>
                    <span class="tactical-player-name">
                        ${escapeHTML(player.lineupPlayer || "Player")}
                    </span>
                </div>
            `;

            const goalkeeper = starters[0];

            return `
                <section class="match-info-panel tactical-team-panel">

                    <div class="tactical-team-header">
                        <div>
                            <h3>${escapeHTML(label)}</h3>
                            <span class="tactical-formation">
                                Formation: ${escapeHTML(formation || "N/A")}
                            </span>
                        </div>
                        <span class="tactical-player-count">
                            ${starters.length}/11 STARTING
                        </span>
                    </div>

                    ${
                        starters.length
                            ? `
                                <div class="tactical-pitch">

                                    <div class="pitch-halfway"></div>
                                    <div class="pitch-center-circle"></div>
                                    <div class="pitch-center-dot"></div>
                                    <div class="pitch-top-box"></div>
                                    <div class="pitch-bottom-box"></div>

                                    <div class="tactical-goalkeeper">
                                        ${goalkeeper ? renderPlayer(goalkeeper) : ""}
                                    </div>

                                    <div class="tactical-lines">
                                        ${lines.map(line => `
                                            <div class="tactical-line">
                                                ${line.map(renderPlayer).join("")}
                                            </div>
                                        `).join("")}
                                    </div>

                                </div>
                            `
                            : `
                                <div class="empty-state">
                                    <p>Starting lineup unavailable.</p>
                                </div>
                            `
                    }

                    <div class="tactical-substitutes">
                        <h4>SUBSTITUTES (${substitutes.length})</h4>

                        ${
                            substitutes.length
                                ? `
                                    <div class="tactical-sub-list">
                                        ${substitutes.map(player => `
                                            <div class="tactical-sub-player">
                                                <span class="tactical-sub-number">
                                                    ${escapeHTML(player.lineupNumber || "-")}
                                                </span>
                                                <span>
                                                    ${escapeHTML(player.lineupPlayer || "Player")}
                                                </span>
                                            </div>
                                        `).join("")}
                                    </div>
                                `
                                : "<p>No substitutes available.</p>"
                        }
                    </div>

                    ${
                        coaches.length
                            ? `
                                <p class="tactical-coach">
                                    <strong>Coach:</strong>
                                    ${escapeHTML(coaches.map(coach =>
                                        coach.lineupPlayer || "N/A"
                                    ).join(", "))}
                                </p>
                            `
                            : ""
                    }

                </section>
            `;
        };

        content.innerHTML = lineups.length
            ? `
                ${renderTeam(
                    "home",
                    match.homeTeamName || "Home",
                    match.homeTeamSystem
                )}

                ${renderTeam(
                    "away",
                    match.awayTeamName || "Away",
                    match.awayTeamSystem
                )}
            `
            : `
                <div class="empty-state">
                    <span>👥</span>
                    <h3>Lineups unavailable</h3>
                    <p>Team lineups have not been provided.</p>
                </div>
            `;

        return;
    }


    // =====================================
    // STATISTICS DASHBOARD
    // =====================================

    if (tab === "statistics") {

        const statistics = Array.isArray(match.statistics)
            ? match.statistics
            : [];

        const homeName = match.homeTeamName || "Home";
        const awayName = match.awayTeamName || "Away";

        // Safely convert statistic values into numbers for bar widths
        const getNumericValue = value => {

            if (value === null || value === undefined || value === "") {
                return null;
            }

            const number = Number(
                String(value).replace(/[%\s,]/g, "")
            );

            return Number.isFinite(number) ? number : null;
        };

        // Render one comparison row
        const renderStatistic = stat => {

            const label = stat.type ||
                stat.name ||
                stat.statistic ||
                "Statistic";

            const homeValue = stat.homeValue ??
                stat.home ??
                stat.homeTeamValue ??
                "-";

            const awayValue = stat.awayValue ??
                stat.away ??
                stat.awayTeamValue ??
                "-";

            const homeNumber = getNumericValue(homeValue);
            const awayNumber = getNumericValue(awayValue);

            const canCompare =
                homeNumber !== null &&
                awayNumber !== null;

            const total = canCompare
                ? Math.max(Math.abs(homeNumber), Math.abs(awayNumber), 1)
                : 1;

            const homeWidth = canCompare
                ? Math.max(0, Math.min(100, (Math.abs(homeNumber) / total) * 100))
                : 0;

            const awayWidth = canCompare
                ? Math.max(0, Math.min(100, (Math.abs(awayNumber) / total) * 100))
                : 0;

            return `
                <div class="stat-comparison-row">

                    <div class="stat-values">
                        <strong class="home-stat-value">
                            ${escapeHTML(homeValue)}
                        </strong>

                        <span class="stat-label">
                            ${escapeHTML(label)}
                        </span>

                        <strong class="away-stat-value">
                            ${escapeHTML(awayValue)}
                        </strong>
                    </div>

                    <div class="stat-bars">

                        <div class="stat-bar-track home-stat-track">
                            <div
                                class="stat-bar-fill home-stat-fill"
                                style="width:${homeWidth}%">
                            </div>
                        </div>

                        <div class="stat-bar-track away-stat-track">
                            <div
                                class="stat-bar-fill away-stat-fill"
                                style="width:${awayWidth}%">
                            </div>
                        </div>

                    </div>

                </div>
            `;
        };

        if (statistics.length === 0) {

            content.innerHTML = `
                <div class="empty-state">
                    <span>📊</span>
                    <h3>Statistics unavailable</h3>
                    <p>
                        Match statistics have not been provided
                        by the data source for this fixture.
                    </p>
                </div>
            `;

            return;
        }

        content.innerHTML = `

            <div class="match-info-panel stats-dashboard">

                <div class="stats-heading">
                    <div>
                        <span class="stats-subtitle">
                            MATCH ANALYSIS
                        </span>
                        <h3>📊 Match Statistics</h3>
                    </div>
                </div>

                <div class="stats-team-heading">
                    <span>${escapeHTML(homeName)}</span>
                    <span>${escapeHTML(awayName)}</span>
                </div>

                <div class="stats-list">
                    ${statistics.map(renderStatistic).join("")}
                </div>

                <div class="stats-legend">
                    <span>
                        <i class="home-legend"></i>
                        ${escapeHTML(homeName)}
                    </span>

                    <span>
                        <i class="away-legend"></i>
                        ${escapeHTML(awayName)}
                    </span>
                </div>

            </div>
        `;
    }
};


/* =========================================
   LUX LIVE FOOTBALL
   GOAL API — HIGHLIGHTS
========================================= */


window.highlightVideos = [];

window.loadHighlights = async function () {
    const grid = document.getElementById("highlightsGrid");
    const count = document.getElementById("highlightsCount");

    if (!grid) return;

    grid.innerHTML = `
        <div class="empty-state">
            <span>⚽</span>
            <h3>Loading highlights...</h3>
        </div>
    `;

    const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

    try {
        // FETCH BOTH VIDEO SOURCES
        const [goalResult, manualResult] = await Promise.allSettled([
            apiRequest("/api/goal/videos/recent"),
            apiRequest("/api/manual-highlights")
        ]);

        // GOAL API VIDEOS
        const goalVideos =
            goalResult.status === "fulfilled" &&
            Array.isArray(goalResult.value?.data)
                ? goalResult.value.data
                : [];

        // MANUALLY ADDED ADMIN VIDEOS
        const manualVideos =
            manualResult.status === "fulfilled" &&
            Array.isArray(manualResult.value?.data)
                ? manualResult.value.data
                : [];

        // FORMAT MANUAL VIDEOS TO MATCH THE DISPLAY STRUCTURE
        const formattedManualVideos = manualVideos.map(video => ({
            source: "manual",
            title: video.title,
            url: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtube_video_id)}`,
            fixture: {
                homeTeamName: video.home_team || "Home Team",
                awayTeamName: video.away_team || "Away Team",
                league: {
                    name: video.league || "Football"
                },
                homeTeamScore: null,
                awayTeamScore: null
            },
            description: video.description || "",
            matchDate: video.match_date || ""
        }));

        // VALIDATE GOAL API YOUTUBE VIDEOS
        const validGoalVideos = goalVideos.filter(video => {
            try {
                const url = new URL(video.url);

                return (
                    ["www.youtube.com", "youtube.com", "youtube-nocookie.com"]
                        .includes(url.hostname) &&
                    url.pathname.startsWith("/embed/")
                );
            } catch {
                return false;
            }
        }).map(video => ({
            ...video,
            source: "goal"
        }));

        // COMBINE BOTH SOURCES
        window.highlightVideos = [
            ...formattedManualVideos,
            ...validGoalVideos
        ];

        if (count) {
            count.textContent =
                `${window.highlightVideos.length} videos`;
        }

        if (!window.highlightVideos.length) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span>⚽</span>
                    <h3>No highlights available</h3>
                    <p>New football videos will appear here when available.</p>
                </div>
            `;
            return;
        }

        // DISPLAY VIDEO CARDS
        grid.innerHTML = window.highlightVideos.map((video, index) => {
            const fixture = video.fixture || {};

            const home = fixture.homeTeamName || "Home Team";
            const away = fixture.awayTeamName || "Away Team";

            const score =
                fixture.homeTeamScore != null &&
                fixture.awayTeamScore != null
                    ? `${fixture.homeTeamScore} - ${fixture.awayTeamScore}`
                    : "Match Highlights";

            const league = fixture.league?.name || "Football";

            const youtubeId = video.url.match(
                /\/embed\/([a-zA-Z0-9_-]{11})/
            )?.[1];

            const thumbnail = youtubeId
                ? `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`
                : "";

            return `
                <article class="highlight-card"
                         onclick="window.playHighlight(${index})">

                    <div class="highlight-image">
                        ${thumbnail
                            ? `<img src="${thumbnail}"
                                    alt="${safe(home)} vs ${safe(away)}"
                                    loading="lazy">`
                            : `<span>▶</span>`
                        }
                        <span class="highlight-play">▶</span>
                    </div>

                    <div class="highlight-card-content">
                        <span class="highlight-league">${safe(league)}</span>
                        <h3>${safe(video.title || `${home} vs ${away}`)}</h3>
                        <p class="highlight-score">${safe(score)}</p>
                        <span class="highlight-watch">▶ Watch Highlights</span>
                    </div>

                </article>
            `;
        }).join("");

    } catch (error) {
        console.error("Highlights loading error:", error);

        grid.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <h3>Highlights unavailable</h3>
                <p>Please try again later.</p>
            </div>
        `;

        if (count) count.textContent = "Unavailable";
    }
};


/* =========================================
   PLAY SELECTED HIGHLIGHT
========================================= */

window.playHighlight = function (index) {
    const video = window.highlightVideos[index];

    if (!video) return;

    const player = document.getElementById("highlightPlayer");
    const info = document.getElementById("highlightVideoInfo");

    if (!player) return;

    const safe = value => String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

    const fixture = video.fixture || {};
    const home = fixture.homeTeamName || "Home Team";
    const away = fixture.awayTeamName || "Away Team";

    const embedURL = new URL(video.url);
    embedURL.searchParams.set("autoplay", "1");
    embedURL.searchParams.set("rel", "0");

    player.innerHTML = `
        <iframe
            src="${safe(embedURL.href)}"
            title="${safe(video.title || "Football Highlights")}"
            allow="accelerometer; autoplay; clipboard-write;
                   encrypted-media; gyroscope; picture-in-picture;
                   web-share"
            allowfullscreen
            loading="lazy">
        </iframe>
    `;

    if (info) {
        info.hidden = false;
        info.innerHTML = `
            <h2>${safe(video.title || "Match Highlights")}</h2>
            <h3>${safe(home)} vs ${safe(away)}</h3>
            <p>${safe(fixture.league?.name || "Football")}</p>
        `;
    }

    player.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
};

/* =========================================
   LUX MEMBERS-ONLY SESSION GUARD
========================================= */

(async function luxSessionGuard() {
    document.body.classList.add("lux-auth-locked");

    const modal = document.getElementById("loginModal");

    if (modal) {
        modal.classList.add("show");
    }

    window.luxAuthMode = "login";

    const token = sessionStorage.getItem("lux_user_token");

    if (!token) {
        return;
    }

    try {
        const response = await fetch("/api/auth/me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error("Session expired.");
        }

        if (result.role === "admin") {
            sessionStorage.setItem("lux_user_role", "admin");
            sessionStorage.setItem("lux_admin_token", token);
            window.location.replace("/admin.html");
            return;
        }

        sessionStorage.setItem("lux_user_role", "user");
        sessionStorage.setItem("lux_user_email", result.user.email);

        document.body.classList.remove("lux-auth-locked");

        if (modal) {
            modal.classList.remove("show");
        }

        const loginButton = document.querySelector(".login-btn");

        if (loginButton) {
            loginButton.textContent = "My Account";
        }

    } catch (error) {
        sessionStorage.removeItem("lux_user_token");
        sessionStorage.removeItem("lux_user_email");
        sessionStorage.removeItem("lux_user_role");
        sessionStorage.removeItem("lux_admin_token");

        console.log("LUX session:", error.message);
    }
})();