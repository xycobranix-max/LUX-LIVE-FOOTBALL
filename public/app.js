
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
