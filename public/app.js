
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
// LIVE MATCHES
// =========================================

async function loadLiveMatches() {
    const container = document.getElementById("liveMatches");

    if (!container) return;

    try {
        const result = await apiRequest("/api/matches/live");

        displayLiveMatches(result.matches || []);

    } catch (error) {
        console.error("Live matches:", error.message);

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

    if (!matches.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span>⚽</span>
                <h3>No live matches currently</h3>
                <p>Live matches from our six competitions will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = matches.map(match => `
        <div class="match-card">

            <div class="match-header">
                <span>${escapeHTML(match.competition || "Football")}</span>

                <span class="live-indicator">
                    <span class="live-dot"></span>
                    LIVE ${match.elapsed != null ? escapeHTML(match.elapsed) + "'" : ""}
                </span>
            </div>

            <div class="match-teams">

                <div class="team">
                    ${match.homeLogo
                        ? `<img class="team-logo" src="${escapeAttribute(match.homeLogo)}" alt="">`
                        : `<span class="team-logo">⚽</span>`
                    }
                    ${escapeHTML(match.homeTeam || "Home")}
                </div>

                <div class="match-score">
                    ${escapeHTML(match.homeScore ?? "-")}
                    -
                    ${escapeHTML(match.awayScore ?? "-")}
                </div>

                <div class="team">
                    ${match.awayLogo
                        ? `<img class="team-logo" src="${escapeAttribute(match.awayLogo)}" alt="">`
                        : `<span class="team-logo">⚽</span>`
                    }
                    ${escapeHTML(match.awayTeam || "Away")}
                </div>

            </div>

            <button class="watch-btn"
                onclick="watchMatch('${escapeAttribute(match.id)}')">
                View Match
            </button>

        </div>
    `).join("");
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

    if (!league) return;

    currentLeagueId = leagueId;

    const home = document.getElementById("homePage");
    const details = document.getElementById("leagueDetailsPage");
    const profile = document.getElementById("teamProfilePage");

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

    const teamsContainer = document.getElementById("leagueTeams");

    teamsContainer.innerHTML = `
        <div class="empty-state">
            <span>⚽</span>
            <h3>Loading ${escapeHTML(league.name)}...</h3>
            <p>Connecting to live football data.</p>
        </div>
    `;

    window.scrollTo(0, 0);

    try {
        const result = await apiRequest(
            `/api/leagues/${encodeURIComponent(leagueId)}/teams`
        );

        if (currentLeagueId !== leagueId) return;

        const teams = result.teams || [];

        document.getElementById("leagueCountry").textContent =
            `${league.country} · ${result.competition.season} Season · ${teams.length} Teams`;

        teamsContainer.replaceChildren();

        if (!teams.length) {
            teamsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No teams available</h3>
                    <p>This competition has no team data available for this season.</p>
                </div>
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
            logo.alt = team.name;
            logo.loading = "lazy";

            logo.onerror = () => {
                logo.replaceWith(document.createTextNode("⚽"));
            };

            const name = document.createElement("strong");
            name.textContent = team.name;

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
        console.error("League teams:", error.message);

        teamsContainer.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <h3>Unable to load teams</h3>
                <p>${escapeHTML(error.message)}</p>
                <button class="watch-btn" onclick="openLeague('${escapeAttribute(leagueId)}')">
                    Try Again
                </button>
            </div>
        `;
    }
}

// =========================================
// INDIVIDUAL TEAM PROFILE
// =========================================

async function openTeam(team) {
    const profile = document.getElementById("teamProfilePage");
    const details = document.getElementById("leagueDetailsPage");

    details.hidden = true;
    profile.hidden = false;

    const logo = document.getElementById("teamProfileLogo");

    document.getElementById("teamProfileName").textContent = team.name;

    document.getElementById("teamProfileLeague").textContent =
        leagueData[currentLeagueId].name + " · " +
        leagueData[currentLeagueId].country;

    document.getElementById("teamProfileCountry").textContent =
        team.country || leagueData[currentLeagueId].country;

    document.getElementById("teamProfileCompetition").textContent =
        leagueData[currentLeagueId].name;

    logo.textContent = "⚽";

    if (team.logo) {
        logo.innerHTML = `
            <img
                src="${escapeAttribute(team.logo)}"
                alt="${escapeHTML(team.name)}"
                style="width:100%;height:100%;object-fit:contain;padding:12px;"
            >
        `;
    }

    document.getElementById("teamProfileDescription").textContent =
        `Explore ${team.name}, its stadium, squad and football information.`;

    const content = document.querySelector(
        "#teamProfilePage .team-profile-content"
    );

    let extra = document.getElementById("teamProfileExtra");

    if (!extra) {
        extra = document.createElement("div");
        extra.id = "teamProfileExtra";
        content.appendChild(extra);
    }

    extra.innerHTML = `
        <div class="empty-state">
            <span>⚽</span>
            <h3>Loading team information...</h3>
        </div>
    `;

    window.scrollTo(0, 0);

    try {
        const result = await apiRequest(`/api/teams/${team.id}`);

        const club = result.team;
        const venue = club.venue || {};
        const squad = result.squad || [];

        document.getElementById("teamProfileName").textContent =
            club.name;

        document.getElementById("teamProfileCountry").textContent =
            club.country || "Not available";

        document.getElementById("teamProfileDescription").textContent =
            `${club.name} is a ${club.national ? "national team" : "football club"}. ` +
            `Explore its home ground and available squad information below.`;

        logo.innerHTML = club.logo
            ? `<img src="${escapeAttribute(club.logo)}"
                alt="${escapeHTML(club.name)}"
                style="width:100%;height:100%;object-fit:contain;padding:12px;">`
            : "⚽";

        extra.innerHTML = `
            <h2>Stadium Information</h2>

            <div class="team-profile-grid">

                <div class="team-info-card">
                    <span>🏟️</span>
                    <h3>Home Stadium</h3>
                    <p>${escapeHTML(venue.name || "Not available")}</p>
                </div>

                <div class="team-info-card">
                    <span>📍</span>
                    <h3>City</h3>
                    <p>${escapeHTML(venue.city || "Not available")}</p>
                </div>

                <div class="team-info-card">
                    <span>👥</span>
                    <h3>Stadium Capacity</h3>
                    <p>${venue.capacity
                        ? Number(venue.capacity).toLocaleString()
                        : "Not available"
                    }</p>
                </div>

                <div class="team-info-card">
                    <span>📅</span>
                    <h3>Founded</h3>
                    <p>${escapeHTML(club.founded || "Not available")}</p>
                </div>

            </div>

            <h2>Squad Information</h2>

            <p>${squad.length} players returned by the football data provider.</p>

            <div class="team-profile-grid">
                ${squad.length
                    ? squad.map(player => `
                        <div class="team-info-card">
                            ${player.photo
                                ? `<img src="${escapeAttribute(player.photo)}"
                                    alt="${escapeHTML(player.name)}"
                                    loading="lazy"
                                    style="width:65px;height:65px;object-fit:cover;border-radius:50%;">`
                                : ""
                            }
                            <h3>${escapeHTML(player.name)}</h3>
                            <p>
                                ${escapeHTML(player.position || "Player")}
                                ${player.number != null
                                    ? " · #" + escapeHTML(player.number)
                                    : ""
                                }
                            </p>
                            <p>${player.age != null
                                ? escapeHTML(player.age) + " years"
                                : ""
                            }</p>
                        </div>
                    `).join("")
                    : `
                        <div class="team-info-card">
                            <p>Squad information is not currently available.</p>
                        </div>
                    `
                }
            </div>

            <h2>More Team Information</h2>

            <div class="team-info-card">
                <p><strong>Country:</strong> ${escapeHTML(club.country || "Not available")}</p>
                <p><strong>Club code:</strong> ${escapeHTML(club.code || "Not available")}</p>
                <p><strong>Team ID:</strong> ${escapeHTML(club.id)}</p>
            </div>
        `;

    } catch (error) {
        console.error("Team profile:", error.message);

        extra.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <h3>Team details unavailable</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
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