
/* =========================================
   LUX LIVE FOOTBALL
   MAIN WEBSITE JAVASCRIPT
========================================= */

"use strict";

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
            ".section, .league-card, .highlight-card"
        );

        let found = false;

        sections.forEach(section => {
            if (section.textContent.toLowerCase().includes(query)) {
                if (!found) {
                    section.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                    found = true;
                }
            }
        });

        if (!found) {
            alert("No matching content found.");
        }
    });
}

// =========================================
// LIVE MATCHES
// =========================================

async function loadLiveMatches() {
    const container = document.getElementById("liveMatches");

    if (!container) return;

    try {
        const response = await fetch("/api/matches/live");

        if (!response.ok) {
            throw new Error("Unable to load live matches.");
        }

        const result = await response.json();

        const matches = Array.isArray(result)
            ? result
            : result.matches || [];

        displayLiveMatches(matches);

    } catch (error) {
        console.log("Live matches:", error.message);

        container.innerHTML = `
            <div class="empty-state">
                <span>⚽</span>
                <h3>No live matches available</h3>
                <p>Live matches will appear here when match data is available.</p>
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
                <p>Check back when matches are being played.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = matches.map(match => `
        <div class="match-card">

            <div class="match-header">
                <span>${escapeHTML(match.competition || "Football")}</span>
                <span class="live-indicator">
                    <span class="live-dot"></span> LIVE
                </span>
            </div>

            <div class="match-teams">

                <div class="team">
                    <span class="team-logo">⚽</span>
                    ${escapeHTML(match.homeTeam || "Home")}
                </div>

                <div class="match-score">
                    ${escapeHTML(match.homeScore ?? 0)}
                    -
                    ${escapeHTML(match.awayScore ?? 0)}
                </div>

                <div class="team">
                    <span class="team-logo">⚽</span>
                    ${escapeHTML(match.awayTeam || "Away")}
                </div>

            </div>

            <button class="watch-btn"
                onclick="watchMatch('${escapeAttribute(match.id || "")}')">
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
        const response = await fetch("/api/matches/fixtures");

        if (!response.ok) {
            throw new Error("Unable to load fixtures.");
        }

        const result = await response.json();

        const fixtures = Array.isArray(result)
            ? result
            : result.fixtures || [];

        displayFixtures(fixtures);

    } catch (error) {
        console.log("Fixtures:", error.message);

        container.innerHTML = `
            <div class="empty-state">
                <span>📅</span>
                <h3>Fixtures coming soon</h3>
                <p>Match schedules will appear here when data is available.</p>
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
                <p>Check back later for upcoming matches.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = fixtures.map(match => `
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
                <p>${escapeHTML(match.date || "Date TBA")}</p>
                <strong>${escapeHTML(match.time || "Time TBA")}</strong>
            </div>

        </div>
    `).join("");
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

    player.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

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
    const email = document.getElementById("loginEmail").value.trim();

    const password = document.getElementById("loginPassword").value;

    const message = document.getElementById("loginMessage");

    if (!email || !password) {
        message.textContent = "Enter your email and password.";
        return;
    }

    message.textContent =
        "Login service is not connected yet. Please try again later.";
}

// =========================================
// SECURITY HELPERS
// =========================================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function escapeAttribute(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "");
}

// =========================================
// AUTOMATIC MATCH REFRESH
// =========================================

setInterval(() => {
    loadLiveMatches();
    loadFixtures();
}, 60000);


const leagueData = {
    "premier-league": {
        name: "Premier League",
        country: "England",
        icon: "🏆",
        teams: [
            "Arsenal", "Manchester City", "Liverpool",
            "Manchester United", "Chelsea", "Tottenham Hotspur",
            "Newcastle United", "Aston Villa", "West Ham United",
            "Brighton", "Everton", "Crystal Palace",
            "Fulham", "Brentford", "Wolves",
            "Bournemouth", "Nottingham Forest", "Leicester City",
            "Ipswich Town", "Southampton"
        ]
    },
    "la-liga": {
        name: "La Liga",
        country: "Spain",
        icon: "🏆",
        teams: [
            "Real Madrid", "Barcelona", "Atletico Madrid",
            "Athletic Bilbao", "Real Sociedad", "Real Betis",
            "Sevilla", "Villarreal", "Valencia", "Girona",
            "Getafe", "Osasuna", "Celta Vigo", "Mallorca",
            "Rayo Vallecano", "Las Palmas", "Leganes",
            "Espanyol", "Alaves", "Real Valladolid"
        ]
    },
    "serie-a": {
        name: "Serie A",
        country: "Italy",
        icon: "🏆",
        teams: [
            "Inter Milan", "AC Milan", "Juventus", "Napoli",
            "Roma", "Lazio", "Atalanta", "Fiorentina",
            "Bologna", "Torino", "Udinese", "Genoa",
            "Como", "Parma", "Cagliari", "Lecce",
            "Empoli", "Verona", "Monza", "Venezia"
        ]
    },
    "bundesliga": {
        name: "Bundesliga",
        country: "Germany",
        icon: "🏆",
        teams: [
            "Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen",
            "RB Leipzig", "Eintracht Frankfurt", "Stuttgart",
            "Hoffenheim", "Wolfsburg", "Freiburg", "Mainz",
            "Augsburg", "Werder Bremen", "Union Berlin",
            "Borussia Monchengladbach", "Heidenheim",
            "St Pauli", "Holstein Kiel", "Bochum"
        ]
    },
    "champions-league": {
        name: "Champions League",
        country: "Europe",
        icon: "🏆",
        teams: [
            "Real Madrid", "Manchester City", "Arsenal",
            "Liverpool", "Barcelona", "Bayern Munich",
            "Paris Saint-Germain", "Inter Milan", "AC Milan",
            "Juventus", "Borussia Dortmund", "Atletico Madrid"
        ]
    },
    "afcon": {
        name: "AFCON",
        country: "Africa",
        icon: "🌍",
        teams: [
            "Kenya", "Nigeria", "Egypt", "Morocco",
            "Senegal", "Ivory Coast", "Ghana", "Cameroon",
            "South Africa", "Algeria", "Tunisia", "Mali"
        ]
    }
};


// Remember which league the visitor opened
let currentLeagueId = null;

function openLeague(leagueId) {
    const league = leagueData[leagueId];

    if (!league) return;

    currentLeagueId = leagueId;

    document.querySelectorAll("[data-page-section]").forEach(page => {
        page.hidden = true;
    });

    document.getElementById("teamProfilePage").hidden = true;

    const details = document.getElementById("leagueDetailsPage");
    details.hidden = false;

    document.getElementById("leagueIcon").textContent = league.icon;
    document.getElementById("leagueTitle").textContent = league.name;
    document.getElementById("leagueCountry").textContent =
        league.country + " · Participating Teams";

    const teamsContainer = document.getElementById("leagueTeams");
    teamsContainer.replaceChildren();

    league.teams.forEach((team, index) => {
        const card = document.createElement("div");
        card.className = "league-team-card";
        card.style.cursor = "pointer";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");

        const number = document.createElement("span");
        number.textContent = index + 1;

        const name = document.createElement("strong");
        name.textContent = team;

        const arrow = document.createElement("span");
        arrow.textContent = "›";

        card.append(number, name, arrow);

        card.addEventListener("click", () => openTeam(team));

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openTeam(team);
            }
        });

        teamsContainer.appendChild(card);
    });

    window.scrollTo(0, 0);
}


// Open an individual team profile
function openTeam(teamName) {
    const league = leagueData[currentLeagueId];

    if (!league) return;

    document.getElementById("leagueDetailsPage").hidden = true;

    const profile = document.getElementById("teamProfilePage");
    profile.hidden = false;

    document.getElementById("teamProfileName").textContent = teamName;

    document.getElementById("teamProfileLeague").textContent =
        league.name + " · " + league.country;

    document.getElementById("teamProfileCountry").textContent =
        league.country;

    document.getElementById("teamProfileCompetition").textContent =
        league.name;

    document.getElementById("teamProfileLogo").textContent =
        teamName.split(" ").map(word => word[0]).join("").substring(0, 3);

    document.getElementById("teamProfileDescription").textContent =
        "Welcome to the " + teamName +
        " club profile. Explore club information, players, fixtures and results.";

    window.scrollTo(0, 0);
}


// Return from team profile to its league
function closeTeam() {
    document.getElementById("teamProfilePage").hidden = true;
    document.getElementById("leagueDetailsPage").hidden = false;

    window.scrollTo(0, 0);
}


// Return from league to homepage
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


