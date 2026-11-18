
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

    "champions-league": {
        name: "Champions League",
        country: "Europe",
        icon: "🏆"
    },

    "serie-a": {
        name: "Serie A",
        country: "Italy",
        icon: "🏆"
    },

    "la-liga": {
        name: "La Liga",
        country: "Spain",
        icon: "🏆"
    },

    "bundesliga": {
        name: "Bundesliga",
        country: "Germany",
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
    const input = document.getElementById("homeSearchInput");
    const button = document.getElementById("homeSearchButton");
    const results = document.getElementById("homeSearchResults");

    if (!input || !button || !results) return;

    const ids = {
        "premier-league": "cmr77dvkr005nrx06lp7rvp49",
        "la-liga": "cmr77dvnt006nrx063v3w622e",
        "bundesliga": "cmr77dvgm0002rx06rt2uqxii",
        "champions-league": "cmr77dw3900f5rx06j05wgzv4",
        "afcon": "cmr77dvhf0015rx069i57rsbo"
    };

    const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);

    async function search() {
        const query = input.value.trim().toLowerCase();

        if (query.length < 2) {
            results.hidden = true;
            return;
        }

        results.hidden = false;
        results.innerHTML =
            "<p class='search-loading'>Searching teams, leagues and matches...</p>";

        const found = [];

        Object.entries(leagueData).forEach(([slug, league]) => {
            if (
                league.name.toLowerCase().includes(query) ||
                slug.includes(query) ||
                league.country.toLowerCase().includes(query)
            ) {
                found.push({
                    type: "league",
                    label: league.name,
                    detail: league.country,
                    slug
                });
            }
        });

        document.querySelectorAll(
            "#liveMatches .match-card, #fixtures .fixture-card, #fixtures .match-card"
        ).forEach(element => {
            if (element.textContent.toLowerCase().includes(query)) {
                found.push({
                    type: "match",
                    label: element.textContent.trim().replace(/\s+/g, " ").slice(0, 100),
                    detail: "Match",
                    element
                });
            }
        });

        const teamGroups = await Promise.allSettled([
            ...Object.entries(ids).map(async ([slug, id]) => {
                const response = await apiRequest(
                    `/api/goal/leagues/${encodeURIComponent(id)}/teams`
                );

                return (Array.isArray(response.data) ? response.data : [])
                    .map(team => ({ ...team, _league: slug }));
            }),

            (async () => {
                const response = await apiRequest("/api/leagues/serie-a/teams");

                return (Array.isArray(response.teams) ? response.teams : [])
                    .map(team => ({ ...team, _league: "serie-a" }));
            })()
        ]);

        const seen = new Set();

        teamGroups.forEach(group => {
            if (group.status !== "fulfilled") return;

            group.value.forEach(team => {
                const name =
                    team.name ||
                    team.teamName ||
                    team.displayName ||
                    "";

                const id = team.id || team.teamId;
                const key = String(id || name).trim().toLowerCase();

                if (
                    name.toLowerCase().includes(query) &&
                    key &&
                    !seen.has(key)
                ) {
                    seen.add(key);

                    found.push({
                        type: "team",
                        label: name,
                        detail: leagueData[team._league]?.name || "Club",
                        team
                    });
                }
            });
        });

        if (!found.length) {
            results.innerHTML =
                "<p class='search-no-results'>No matching teams, leagues or matches. Try another name.</p>";
            return;
        }

        results.innerHTML = found.slice(0, 12).map((item, index) => `
            <button class="search-result-item"
                    type="button"
                    data-result="${index}">
                <span class="search-result-type">${esc(item.type)}</span>
                <strong>${esc(item.label)}</strong>
                <small>${esc(item.detail)}</small>
            </button>
        `).join("");

        results.querySelectorAll("[data-result]").forEach((element, index) => {
            element.addEventListener("click", () => {
                const item = found[index];

                results.hidden = true;

                if (item.type === "league") {
                    openLeague(item.slug);
                } else if (item.type === "team") {
                    openTeam(item.team);
                } else if (item.element) {
                    item.element.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                    item.element.click();
                }
            });
        });
    }

    button.addEventListener("click", search);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") search();
        if (event.key === "Escape") results.hidden = true;
    });
}

// =========================================
// API HELPER — AUTHENTICATED LUX REQUESTS
// =========================================

async function apiRequest(url) {
    const token = sessionStorage.getItem("lux_user_token");
    const headers = {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method: "GET",
        headers
    });

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
            typeof url === "string" && /^https:\/\//i.test(url)
                ? escapeAttribute(url)
                : "";

        const homeImage = safeBadge(homeBadge);
        const awayImage = safeBadge(awayBadge);

        return `
            <div class="match-card">
                <div class="match-header">
                    <span>${escapeHTML(competition)}</span>

                    <span class="live-indicator">
                        <span class="live-dot"></span>
                        ${isLive
                            ? `LIVE ${minute != null ? escapeHTML(minute) + "'" : ""}`
                            : escapeHTML(status)}
                    </span>
                </div>

                <div class="match-teams">
                    <div class="team">
                        ${homeImage
                            ? `<img class="team-logo"
                                    src="${homeImage}"
                                    alt="${escapeHTML(homeTeam)}"
                                    loading="lazy">`
                            : `<span class="team-logo">⚽</span>`}

                        <strong>${escapeHTML(homeTeam)}</strong>
                    </div>

                    <div class="match-score">
                        ${escapeHTML(homeScore)} - ${escapeHTML(awayScore)}
                    </div>

                    <div class="team">
                        ${awayImage
                            ? `<img class="team-logo"
                                    src="${awayImage}"
                                    alt="${escapeHTML(awayTeam)}"
                                    loading="lazy">`
                            : `<span class="team-logo">⚽</span>`}

                        <strong>${escapeHTML(awayTeam)}</strong>
                    </div>
                </div>

                ${goalHTML ? `<div class="live-goals">${goalHTML}</div>` : ""}

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

const fixtureLeagues = [
    {
        id: "cmr77dvkr005nrx06lp7rvp49",
        name: "Premier League"
    },
    {
        id: "cmr77dw3900f5rx06j05wgzv4",
        name: "Champions League"
    },
    {
        id: "cmr77dvnt006nrx063v3w622e",
        name: "La Liga"
    },
    {
        id: "cmr77dvgm0002rx06rt2uqxii",
        name: "Bundesliga"
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
                    leagueName: league.name
                }));
            })
        );

        const allMatches = [];

        responses.forEach(response => {
            if (response.status === "fulfilled") {
                allMatches.push(...response.value);
            } else {
                console.error("Fixture league error:", response.reason);
            }
        });

        displayFixtures(allMatches);

    } catch (error) {
        console.error("Fixtures error:", error);

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
                <button class="save-match-button" type="button"
                    data-save-match="${escapeAttribute(match.id)}"
                    data-save-label="${escapeAttribute(homeTeam + " vs " + awayTeam)}"
                    onclick="event.stopPropagation()">☆ Save Match</button>

            </div>
        `;
    }).join("");

    container.querySelectorAll("[data-save-match]").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            window.saveLuxMatch(button.dataset.saveMatch, button.dataset.saveLabel);
            button.textContent = "✓ Saved";
            button.disabled = true;
        });
    });
}


// =========================================
// MATCH VIEWER
// =========================================

function watchMatch(matchId) {
    const player = document.getElementById("homeStreams");

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
        if (typeof window.loadLiveStreams === "function") window.loadLiveStreams();

        const loginButton = document.querySelector(".login-btn");

        if (loginButton) {
            loginButton.textContent = "My Account";
            loginButton.onclick = window.openMyAccount;
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
        "bundesliga": "cmr77dvgm0002rx06rt2uqxii",
        "champions-league": "cmr77dw3900f5rx06j05wgzv4",
        "afcon": "cmr77dvhf0015rx069i57rsbo"
    };

    const goalLeagueId = goalLeagueIds[leagueId];

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
        const result = goalLeagueId
            ? await apiRequest(`/api/goal/leagues/${encodeURIComponent(goalLeagueId)}/teams`)
            : await apiRequest(`/api/leagues/${encodeURIComponent(leagueId)}/teams`);

        if (currentLeagueId !== leagueId) return;

        const sourceTeams = Array.isArray(result.data) ? result.data :
            (Array.isArray(result.teams) ? result.teams : []);
        const uniqueTeams = new Map();
        sourceTeams.forEach(team => {
            const name = team.name || team.teamName || team.displayName || "";
            const key = String(team.id || team.teamId || name).trim().toLowerCase();
            if (key && !uniqueTeams.has(key)) uniqueTeams.set(key, team);

        });
        const teams = Array.from(uniqueTeams.values());

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

// =========================================
// LOAD MATCH DETAILS
// =========================================

window.loadMatchDetails = async function(fixtureId) {

    const container = document.getElementById("matchDetailsContent");

    if (!container) {
        console.error("Match details container not found.");
        return;
    }

    if (!fixtureId) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Match unavailable</h3>
                <p>Missing match ID.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="match-loading">
            <div class="loading-spinner"></div>
            <p>Loading match details...</p>
        </div>
    `;

    try {

        // Goal API match details endpoint
        const response = await fetch(
            `/api/goal/fixtures/${encodeURIComponent(fixtureId)}`
        );

        if (!response.ok) {
            throw new Error(
                `Unable to retrieve match details (${response.status})`
            );
        }

        const result = await response.json();

        const match =
            result.data ||
            result.fixture ||
            result.match ||
            result.response?.[0] ||
            result;

        if (!match || typeof match !== "object") {
            throw new Error("Invalid match information received.");
        }

        window.currentMatchDetails = match;

        renderMatchDetails(match);

    } catch (error) {

        console.error("Match details error:", error);

        container.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <h3>Unable to load match details</h3>
                <p>${escapeHTML(error.message)}</p>

                <button
                    type="button"
                    onclick="window.loadMatchDetails('${escapeAttribute(fixtureId)}')">
                    Try Again
                </button>
            </div>
        `;
    }
};


// =========================================
// RENDER MATCH DETAILS
// =========================================

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

            const formationParts = String(formation || "4-2-3-1")
                .split("-")
                .map(Number)
                .filter(number => Number.isFinite(number) && number > 0);

            const lines = [];
            let playerIndex = 1;

            formationParts.forEach(number => {
                lines.push(starters.slice(playerIndex, playerIndex + number));
                playerIndex += number;
            });

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
                <div class="tactical-player"
                     title="${escapeHTML(player.lineupPlayer || "Player")}">

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

        if (!statistics.length) {
            content.innerHTML = `
                <div class="empty-state">
                    <span>📊</span>
                    <h3>Statistics unavailable</h3>
                    <p>Match statistics will appear here when available.</p>
                </div>
            `;
            return;
        }

        const homeStats = statistics.find(item =>
            item.team === "home"
        ) || {};

        const awayStats = statistics.find(item =>
            item.team === "away"
        ) || {};

        const getStat = (team, key) => {
            const value = team[key];

            return value === undefined || value === null
                ? 0
                : value;
        };

        const statList = [
            { key: "shotsOnTarget", label: "Shots on Target" },
            { key: "shotsOffTarget", label: "Shots off Target" },
            { key: "totalShots", label: "Total Shots" },
            { key: "blockedShots", label: "Blocked Shots" },
            { key: "cornerKicks", label: "Corner Kicks" },
            { key: "offsides", label: "Offsides" },
            { key: "fouls", label: "Fouls" },
            { key: "yellowCards", label: "Yellow Cards" },
            { key: "redCards", label: "Red Cards" },
            { key: "totalPasses", label: "Total Passes" },
            { key: "accuratePasses", label: "Accurate Passes" },
            { key: "ballPossession", label: "Possession" }
        ];

        content.innerHTML = `
            <div class="match-info-panel statistics-panel">

                <h3>📊 Match Statistics</h3>

                <div class="statistics-team-headings">
                    <strong>
                        ${escapeHTML(match.homeTeamName || "Home")}
                    </strong>

                    <strong>
                        ${escapeHTML(match.awayTeamName || "Away")}
                    </strong>
                </div>

                ${statList.map(stat => {

                    const homeValue = getStat(homeStats, stat.key);
                    const awayValue = getStat(awayStats, stat.key);

                    const homeNumber =
                        parseFloat(String(homeValue).replace("%", "")) || 0;

                    const awayNumber =
                        parseFloat(String(awayValue).replace("%", "")) || 0;

                    const total = homeNumber + awayNumber;

                    const homeWidth = total > 0
                        ? (awayNumber / total) * 100
                        : 50;

                    return `
                        <div class="statistics-item">

                            <div class="statistics-values">
                                <strong>${escapeHTML(homeValue)}</strong>
                                <span>${escapeHTML(stat.label)}</span>
                                <strong>${escapeHTML(awayValue)}</strong>
                            </div>

                            <div class="statistics-bar">
                                <span
                                    class="statistics-home-bar"
                                    style="width:${homeWidth}%">
                                </span>

                                <span
                                    class="statistics-away-bar"
                                    style="width:${awayWidth}%">
                                </span>
                            </div>

                        </div>
                    `;

                }).join("")}

            </div>
        `;

        return;
    }


    // =====================================
    // UNKNOWN TAB FALLBACK
    // =====================================

    content.innerHTML = `
        <div class="empty-state">
            <h3>Section unavailable</h3>
            <p>Please select another match section.</p>
        </div>
    `;

};


// =========================================
// MATCH DETAILS PAGE INITIALIZATION
// =========================================

document.addEventListener("DOMContentLoaded", function() {

    const params = new URLSearchParams(window.location.search);

    const page = params.get("page");
    const fixtureId = params.get("id");

    if (page === "match" && fixtureId) {

        if (typeof window.loadMatchDetails === "function") {
            window.loadMatchDetails(fixtureId);
        }

    }

});
                   