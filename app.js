const video = document.getElementById("liveVideo");
const playerMessage = document.getElementById("playerMessage");
const streamTitle = document.getElementById("streamTitle");
const streamStatus = document.getElementById("streamStatus");
const matchesGrid = document.getElementById("matchesGrid");

document.getElementById("year").textContent = new Date().getFullYear();

let hlsPlayer = null;

async function loadStream() {
  try {
    const response = await fetch("/api/stream");
    const data = await response.json();

    streamTitle.textContent = data.title || "LUX LIVE FOOTBALL";

    if (!data.available || !data.streamUrl) {
      streamStatus.textContent = "Waiting for an authorized broadcast.";
      playerMessage.classList.remove("hidden");
      return;
    }

    playerMessage.classList.add("hidden");
    streamStatus.textContent = "Authorized stream is ready.";

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = data.streamUrl;
      return;
    }

    if (window.Hls && Hls.isSupported()) {
      if (hlsPlayer) hlsPlayer.destroy();

      hlsPlayer = new Hls();
      hlsPlayer.loadSource(data.streamUrl);
      hlsPlayer.attachMedia(video);

      hlsPlayer.on(Hls.Events.ERROR, (_event, details) => {
        if (details.fatal) {
          streamStatus.textContent = "The stream could not be loaded. Check the provider URL and permissions.";
          playerMessage.classList.remove("hidden");
        }
      });
      return;
    }

    streamStatus.textContent = "This browser does not support HLS playback.";
    playerMessage.classList.remove("hidden");
  } catch (error) {
    streamStatus.textContent = "Unable to contact the streaming server.";
    playerMessage.classList.remove("hidden");
    console.error("Stream loading error:", error);
  }
}

function createMatchCard(match) {
  const card = document.createElement("article");
  card.className = "match-card";

  const competition = document.createElement("div");
  competition.className = "competition";
  competition.textContent = match.competition || "Football";

  const teams = document.createElement("div");
  teams.className = "teams";
  teams.textContent = `${match.homeTeam || "Home team"}  VS  ${match.awayTeam || "Away team"}`;

  const time = document.createElement("div");
  time.className = "match-time";
  time.textContent = match.kickoff || "Kick-off to be announced";

  card.append(competition, teams, time);
  return card;
}

async function loadMatches() {
  try {
    const response = await fetch("/api/matches");
    const data = await response.json();

    matchesGrid.replaceChildren();

    if (!data.matches || data.matches.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = "<span>📅</span><h3>Fixtures coming soon</h3><p>Connect a football data provider to display verified fixtures.</p>";
      matchesGrid.appendChild(empty);
      return;
    }

    data.matches.forEach(match => matchesGrid.appendChild(createMatchCard(match)));
  } catch (error) {
    console.error("Fixtures loading error:", error);
    matchesGrid.textContent = "Fixtures are temporarily unavailable.";
  }
}

loadStream();
loadMatches();
