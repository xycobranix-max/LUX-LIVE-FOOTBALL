
"use strict";

// =========================================
// LUX LIVE FOOTBALL — ADMIN DASHBOARD
// =========================================

const API = "/api";

let adminToken = sessionStorage.getItem("lux_admin_token") || "";
let highlights = [];

const $ = id => document.getElementById(id);

const loginSection = $("loginSection");
const dashboardSection = $("dashboardSection");
const loginForm = $("loginForm");
const highlightForm = $("highlightForm");

// =========================================
// API REQUEST HELPER
// =========================================

async function apiRequest(endpoint, options = {}) {
    const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        ...options.headers
    };

    const response = await fetch(`${API}${endpoint}`, {
        ...options,
        headers
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (response.status === 401 || response.status === 403) {
        if (adminToken && endpoint !== "/admin/login") {
            logout("Your administrator session has expired. Please sign in again.");
        }

        throw new Error(result.message || "Access denied.");
    }

    if (!response.ok) {
        throw new Error(result.message || "Request failed.");
    }

    return result;
}


// =========================================
// SHOW LOGIN / DASHBOARD
// =========================================

function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
}

function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
}

function logout(message = "") {
    adminToken = "";
    sessionStorage.removeItem("lux_admin_token");
    highlights = [];

    showLogin();

    $("loginMessage").textContent = message;
    $("adminPassword").value = "";
}


// =========================================
// ADMIN LOGIN
// =========================================

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const button = $("loginButton");
    const message = $("loginMessage");

    button.disabled = true;
    button.textContent = "SIGNING IN...";
    message.textContent = "";

    try {
        const result = await apiRequest("/admin/login", {
            method: "POST",
            body: JSON.stringify({
                email: $("adminEmail").value.trim(),
                password: $("adminPassword").value
            })
        });

        if (!result.success || !result.access_token) {
            throw new Error("Administrator login failed.");
        }

        adminToken = result.access_token;
        sessionStorage.setItem("lux_admin_token", adminToken);

        $("adminPassword").value = "";

        showDashboard();

        await loadHighlights();

    } catch (error) {
        message.textContent = error.message;
    } finally {
        button.disabled = false;
        button.innerHTML = 'SIGN IN <span>→</span>';
    }
});


// =========================================
// LOAD HIGHLIGHTS
// =========================================

async function loadHighlights() {
    const container = $("highlightsList");

    container.innerHTML =
        '<p class="loading-message">Loading highlights...</p>';

    try {
        const result = await apiRequest("/admin/highlights");

        highlights = Array.isArray(result.data) ? result.data : [];

        renderHighlights();

        $("totalVideos").textContent = highlights.length;

        $("publishedVideos").textContent =
            highlights.filter(video => video.is_published).length;

        $("draftVideos").textContent =
            highlights.filter(video => !video.is_published).length;

    } catch (error) {
        container.textContent = error.message;
    }
}


// =========================================
// RENDER VIDEO LIBRARY
// =========================================

function renderHighlights() {
    const container = $("highlightsList");

    if (!highlights.length) {
        container.innerHTML = `
            <div class="empty-message">
                <h3>No highlights yet ⚽</h3>
                <p>Add your first YouTube highlight above.</p>
            </div>
        `;
        return;
    }

    container.replaceChildren();

    highlights.forEach(video => {
        const row = document.createElement("article");
        row.className = "highlight-row";

        const details = document.createElement("div");
        details.className = "highlight-details";

        const title = document.createElement("h3");
        title.textContent = video.title;

        const info = document.createElement("p");

        const teams = [video.home_team, video.away_team]
            .filter(Boolean)
            .join(" vs ");

        info.textContent = [
            teams,
            video.league,
            video.match_date
        ].filter(Boolean).join(" • ") || "No match details";

        const status = document.createElement("span");
        status.className = video.is_published
            ? "video-status"
            : "video-status draft";

        status.textContent = video.is_published
            ? "PUBLISHED"
            : "DRAFT";

        details.append(title, info, status);

        const actions = document.createElement("div");
        actions.className = "row-actions";

        const editButton = document.createElement("button");
        editButton.textContent = "EDIT";
        editButton.addEventListener("click", () => editHighlight(video.id));

        const publishButton = document.createElement("button");
        publishButton.textContent = video.is_published
            ? "UNPUBLISH"
            : "PUBLISH";

        publishButton.addEventListener("click", () =>
            togglePublish(video.id, video.is_published)
        );

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "DELETE";

        deleteButton.addEventListener("click", () =>
            deleteHighlight(video.id)
        );

        actions.append(editButton, publishButton, deleteButton);
        row.append(details, actions);

        container.appendChild(row);
    });
}


// =========================================
// ADD / EDIT HIGHLIGHT
// =========================================

highlightForm.addEventListener("submit", async event => {
    event.preventDefault();

    const id = $("highlightId").value;

    const payload = {
        title: $("videoTitle").value.trim(),
        youtube_url: $("youtubeUrl").value.trim(),
        home_team: $("homeTeam").value.trim(),
        away_team: $("awayTeam").value.trim(),
        league: $("league").value.trim(),
        match_date: $("matchDate").value || null,
        description: $("videoDescription").value.trim(),
        is_published: $("publishVideo").checked
    };

    const button = $("saveButton");
    const message = $("formMessage");

    button.disabled = true;
    button.textContent = "SAVING...";
    message.textContent = "";

    try {
        const result = await apiRequest(
            id ? `/admin/highlights/${encodeURIComponent(id)}` : "/admin/highlights",
            {
                method: id ? "PATCH" : "POST",
                body: JSON.stringify(payload)
            }
        );

        message.style.color = "#b8ff35";
        message.textContent = id
            ? "Highlight updated successfully."
            : "Highlight added successfully.";

        resetForm();
        await loadHighlights();

    } catch (error) {
        message.style.color = "#ff6262";
        message.textContent = error.message;
    } finally {
        button.disabled = false;
        button.textContent = "SAVE HIGHLIGHT →";
    }
});


// =========================================
// EDIT HIGHLIGHT
// =========================================

function editHighlight(id) {
    const video = highlights.find(item => item.id === id);

    if (!video) return;

    $("highlightId").value = video.id;
    $("videoTitle").value = video.title || "";
    $("youtubeUrl").value = video.youtube_url || "";
    $("homeTeam").value = video.home_team || "";
    $("awayTeam").value = video.away_team || "";
    $("league").value = video.league || "";
    $("matchDate").value = video.match_date || "";
    $("videoDescription").value = video.description || "";
    $("publishVideo").checked = Boolean(video.is_published);

    $("formHeading").textContent = "EDIT HIGHLIGHT";
    $("saveButton").textContent = "UPDATE HIGHLIGHT →";
    $("cancelEditButton").hidden = false;

    $("formMessage").textContent = "";

    $("highlightForm").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// =========================================
// RESET FORM
// =========================================

function resetForm() {
    highlightForm.reset();

    $("highlightId").value = "";
    $("formHeading").textContent = "ADD NEW HIGHLIGHT";
    $("saveButton").textContent = "SAVE HIGHLIGHT →";
    $("cancelEditButton").hidden = true;
}


// =========================================
// PUBLISH / UNPUBLISH
// =========================================

async function togglePublish(id, currentStatus) {
    const action = currentStatus ? "unpublish" : "publish";

    if (!confirm(`Are you sure you want to ${action} this highlight?`)) {
        return;
    }

    try {
        await apiRequest(`/admin/highlights/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: JSON.stringify({
                is_published: !currentStatus
            })
        });

        await loadHighlights();

    } catch (error) {
        alert(error.message);
    }
}


// =========================================
// DELETE HIGHLIGHT
// =========================================

async function deleteHighlight(id) {
    if (!confirm("Permanently delete this highlight?")) {
        return;
    }

    try {
        await apiRequest(`/admin/highlights/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        await loadHighlights();

    } catch (error) {
        alert(error.message);
    }
}


// =========================================
// BUTTONS
// =========================================

$("logoutButton").addEventListener("click", () => {
    logout("You have signed out.");
});

$("refreshButton").addEventListener("click", loadHighlights);

$("cancelEditButton").addEventListener("click", resetForm);


// =========================================
// INITIAL SESSION CHECK
// =========================================

async function initializeAdmin() {
    if (!adminToken) {
        showLogin();
        return;
    }

    showDashboard();

    try {
        await loadHighlights();

        if (!adminToken) return;

    } catch {
        logout("Please sign in again.");
    }
}

initializeAdmin();
