const SITE_CONFIG = {
  channelUrl: "https://www.youtube.com/@pontosemfiltro",
  channelId: "UCUebd2BZkh8-4HBUtFVmT8g",
  playlistUrl: "",
  instagramUrl: "https://www.instagram.com/pontosemfiltro",
  tiktokUrl: "https://www.tiktok.com/@pontosemfiltro",
  kwaiUrl: "https://www.kwai.com/@pontosemfiltro",
  xUrl: "https://x.com/pontosemfiltro",
  facebookUrl: "https://www.facebook.com/pontosemfiltro",
  whatsappUrl: "#redes",
  commercialUrl: "#redes",
  launchIso: "2026-06-21T12:00:00-03:00"
};

const CHANNEL_URL = SITE_CONFIG.channelUrl;
const PLAYLIST_URL = SITE_CONFIG.playlistUrl;

let videos = [];
const VIDEO_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${SITE_CONFIG.channelId}`;
const VIDEO_PAGE_URL = `${CHANNEL_URL}/videos`;
const VIDEO_CACHE_KEY = `pontoSemFiltroVideos:${SITE_CONFIG.channelId}`;
const VIDEO_FEED_SOURCES = [
  `https://api.allorigins.win/raw?url=${encodeURIComponent(VIDEO_FEED_URL)}`,
  VIDEO_FEED_URL
];
const VIDEO_PAGE_SOURCES = [
  `https://r.jina.ai/http://r.jina.ai/http://https://www.youtube.com/@pontosemfiltro/videos`,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(VIDEO_PAGE_URL)}`
];

const player = document.getElementById("episodePlayer");
const gallery = document.getElementById("videoGallery");
const featuredTitle = document.getElementById("featuredTitle");
const featuredYoutube = document.getElementById("featuredYoutube");
const videoSearch = document.getElementById("videoSearch");
const videoCount = document.getElementById("videoCount");
const muteClock = document.getElementById("muteClock");
const emberCanvas = document.getElementById("emberField");
const siteAudio = document.getElementById("siteAudio");
const siteAudioToggle = document.getElementById("siteAudioToggle");
const siteAudioProgress = document.getElementById("siteAudioProgress");
const siteAudioRemaining = document.getElementById("siteAudioRemaining");
const siteAudioRate15 = document.getElementById("siteAudioRate15");
const siteAudioRate20 = document.getElementById("siteAudioRate20");
const countdownNodes = {
  days: document.getElementById("countDays"),
  hours: document.getElementById("countHours"),
  minutes: document.getElementById("countMinutes"),
  seconds: document.getElementById("countSeconds"),
  floating: document.getElementById("floatTime"),
  bar: document.getElementById("barTime"),
  soundStatus: document.getElementById("soundStatus")
};
const adminNodes = {
  enter: document.getElementById("adminEnter"),
  panel: document.getElementById("adminPanel"),
  dashboard: document.getElementById("adminDashboard"),
  metricsView: document.getElementById("metricsAdminView"),
  newsWorkspace: document.getElementById("newsAdminWorkspace"),
  refreshBtn: document.getElementById("adminRefresh"),
  exportBtn: document.getElementById("adminExport"),
  clearBtn: document.getElementById("adminClear"),
  visits: document.getElementById("metricVisits"),
  online: document.getElementById("metricOnline"),
  time: document.getElementById("metricTime"),
  cities: document.getElementById("metricCities"),
  countries: document.getElementById("metricCountries"),
  interactions: document.getElementById("metricInteractions"),
  scroll: document.getElementById("metricScroll"),
  returns: document.getElementById("metricReturns"),
  engagedRate: document.getElementById("metricEngagedRate"),
  returnRate: document.getElementById("metricReturnRate"),
  avgInteractions: document.getElementById("metricAvgInteractions"),
  mobileRate: document.getElementById("metricMobileRate"),
  deepScroll: document.getElementById("metricDeepScroll"),
  lastUpdate: document.getElementById("metricLastUpdate"),
  peakHour: document.getElementById("metricPeakHour"),
  mainSource: document.getElementById("metricMainSource"),
  mainDevice: document.getElementById("metricMainDevice"),
  periodSummary: document.getElementById("metricPeriodSummary"),
  sessionCount: document.getElementById("metricSessionCount"),
  hourChart: document.getElementById("hourChart"),
  dayChart: document.getElementById("dayChart"),
  accessMap: document.getElementById("accessMap"),
  locationList: document.getElementById("locationList"),
  sourceList: document.getElementById("sourceList"),
  deviceList: document.getElementById("deviceList"),
  techList: document.getElementById("techList"),
  actionList: document.getElementById("actionList"),
  engagementList: document.getElementById("engagementList"),
  sessionList: document.getElementById("sessionList")
};

let activeVideo = null;
let tickingEnabled = true;
let clockAudios = [];
let clockSoundTimer = null;
let clockSoundStopTimer = null;
let clockSoundIndex = 0;
let activeRangeDays = 1;
const CLOCK_SOUND_SOURCES = ["assets/clock-tick.mp3", "assets/clock-dingdong-loop.wav"];
const CLOCK_SOUND_INTERVAL_MS = 1000;
const CLOCK_SOUND_PLAY_MS = 280;
const metricsSession = {
  id: getSessionId(),
  startedAt: Date.now(),
  lastActiveAt: Date.now(),
  path: location.pathname,
  interactions: 0,
  maxScroll: 0,
  returning: false
};

function youtubeUrl(video) {
  return `https://www.youtube.com/watch?v=${video.id}`;
}

function channelVideosUrl() {
  return `${CHANNEL_URL}/videos`;
}

function embedUrl(video) {
  return `https://www.youtube.com/embed/${video.id}?rel=0&modestbranding=1`;
}

function thumbUrl(video) {
  return `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
}

function selectVideo(video, shouldScroll = true) {
  if (!video) {
    showEmptyVideos();
    return;
  }

  activeVideo = video;
  player.src = embedUrl(video);
  player.hidden = false;
  player.parentElement?.classList.remove("is-empty");
  featuredTitle.textContent = video.title;
  featuredYoutube.href = youtubeUrl(video);
  featuredYoutube.textContent = "Abrir no YouTube";

  document.querySelectorAll(".video-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.videoId === video.id);
  });

  if (shouldScroll) {
    document.getElementById("episodios").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderVideos(list) {
  gallery.innerHTML = "";

  if (!list.length) {
    showEmptyVideos();
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach((video, index) => {
    const card = document.createElement("button");
    card.className = "video-card";
    card.type = "button";
    card.dataset.videoId = video.id;
    card.innerHTML = `
      <span class="video-thumb">
        <img src="${thumbUrl(video)}" alt="" loading="lazy">
      </span>
      <strong>${escapeHtml(video.title)}</strong>
      <small>Episódio ${String(index + 1).padStart(2, "0")}</small>
    `;
    card.addEventListener("click", () => selectVideo(video));
    fragment.appendChild(card);
  });

  gallery.appendChild(fragment);
  videoCount.textContent = `${list.length} vídeo${list.length === 1 ? "" : "s"}`;
  selectVideo(list.includes(activeVideo) ? activeVideo : list[0], false);
}

function showEmptyVideos(message = "Assim que o primeiro vídeo for publicado no canal, ele aparece automaticamente aqui.") {
  activeVideo = null;
  player.removeAttribute("src");
  player.hidden = true;
  player.parentElement?.classList.add("is-empty");
  featuredTitle.textContent = "Aguardando o primeiro vídeo do canal";
  featuredYoutube.href = channelVideosUrl();
  featuredYoutube.textContent = "Abrir canal no YouTube";
  videoCount.textContent = "0 vídeos";
  gallery.innerHTML = `<div class="empty-gallery"><strong>Nenhum vídeo publicado ainda.</strong><span>${escapeHtml(message)}</span></div>`;
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}

videoSearch.addEventListener("input", (event) => {
  const term = event.target.value.trim().toLowerCase();
  const filtered = videos.filter((video) => video.title.toLowerCase().includes(term));
  renderVideos(term ? filtered : videos);
});

document.querySelectorAll("[data-youtube-link]").forEach((link) => {
  link.href = CHANNEL_URL || PLAYLIST_URL;
});

document.querySelectorAll('.social-grid a[aria-label="Instagram"], .top-social a[aria-label="Instagram"]').forEach((link) => link.href = SITE_CONFIG.instagramUrl);
document.querySelectorAll('.social-grid a[aria-label="TikTok"], .top-social a[aria-label="TikTok"]').forEach((link) => link.href = SITE_CONFIG.tiktokUrl);
document.querySelectorAll('.social-grid a[aria-label="Kwai"]').forEach((link) => link.href = SITE_CONFIG.kwaiUrl);
document.querySelectorAll('.social-grid a[aria-label="X"]').forEach((link) => link.href = SITE_CONFIG.xUrl);
document.querySelectorAll('.social-grid a[aria-label="Facebook"]').forEach((link) => link.href = SITE_CONFIG.facebookUrl);
document.querySelectorAll('.social-grid a[aria-label="WhatsApp"], .top-social a[aria-label="WhatsApp"]').forEach((link) => link.href = SITE_CONFIG.whatsappUrl);
document.querySelectorAll('.social-grid a[aria-label="Contato comercial"]').forEach((link) => link.href = SITE_CONFIG.commercialUrl);

loadChannelVideos();

initEmberField();
initCountdown();
initSiteAudioPlayer();
initMetrics();
initAdminPanel();

function initSiteAudioPlayer() {
  if (!siteAudio || !siteAudioToggle || !siteAudioProgress || !siteAudioRemaining || !siteAudioRate15 || !siteAudioRate20) return;

  const playerShell = siteAudio.closest(".site-audio-player");

  function formatAudioTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    const total = Math.ceil(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
      : `${minutes}:${String(rest).padStart(2, "0")}`;
  }

  function updateAudioPlayer() {
    const duration = Number.isFinite(siteAudio.duration) ? siteAudio.duration : 0;
    const current = Number.isFinite(siteAudio.currentTime) ? siteAudio.currentTime : 0;
    const progress = duration ? Math.min(100, (current / duration) * 100) : 0;

    siteAudioProgress.max = String(duration || 0);
    siteAudioProgress.value = String(current);
    siteAudioProgress.style.setProperty("--audio-progress", `${progress}%`);
    siteAudioProgress.setAttribute("aria-valuetext", `${formatAudioTime(current)} de ${formatAudioTime(duration)}`);
    siteAudioRemaining.textContent = duration ? formatAudioTime(Math.max(0, duration - current)) : "--:--";
  }

  function setAudioPlaying(playing) {
    playerShell?.classList.toggle("is-playing", playing);
    siteAudioToggle.setAttribute("aria-label", playing ? "Pausar áudio" : "Reproduzir áudio");
  }

  siteAudioToggle.addEventListener("click", () => {
    if (siteAudio.paused) {
      setClockSound(false);
      siteAudio.play().catch(() => setAudioPlaying(false));
    } else {
      siteAudio.pause();
    }
  });

  siteAudioProgress.addEventListener("input", () => {
    siteAudio.currentTime = Number(siteAudioProgress.value) || 0;
    updateAudioPlayer();
  });

  function syncAudioRateButtons() {
    const isRate15 = siteAudio.playbackRate === 1.5;
    const isRate20 = siteAudio.playbackRate === 2;
    siteAudioRate15.setAttribute("aria-pressed", String(isRate15));
    siteAudioRate20.setAttribute("aria-pressed", String(isRate20));
    siteAudioRate15.setAttribute("aria-label", isRate15 ? "Voltar à velocidade normal" : "Ativar velocidade 1,5x");
    siteAudioRate20.setAttribute("aria-label", isRate20 ? "Voltar à velocidade normal" : "Ativar velocidade 2x");
  }

  function toggleAudioRate(rate) {
    siteAudio.playbackRate = siteAudio.playbackRate === rate ? 1 : rate;
    syncAudioRateButtons();
  }

  siteAudioRate15.addEventListener("click", () => toggleAudioRate(1.5));
  siteAudioRate20.addEventListener("click", () => toggleAudioRate(2));

  siteAudio.addEventListener("loadedmetadata", updateAudioPlayer);
  siteAudio.addEventListener("durationchange", updateAudioPlayer);
  siteAudio.addEventListener("timeupdate", updateAudioPlayer);
  siteAudio.addEventListener("ratechange", syncAudioRateButtons);
  siteAudio.addEventListener("play", () => {
    setClockSound(false);
    setAudioPlaying(true);
  });
  siteAudio.addEventListener("pause", () => setAudioPlaying(false));
  siteAudio.addEventListener("ended", () => {
    setAudioPlaying(false);
    updateAudioPlayer();
  });

  updateAudioPlayer();
  syncAudioRateButtons();
}

function initEmberField() {
  if (!emberCanvas) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ctx = emberCanvas.getContext("2d");
  if (!ctx || reduceMotion.matches) {
    emberCanvas.hidden = true;
    return;
  }

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    particles: [],
    raf: 0,
    lastTime: performance.now()
  };

  function resizeEmbers() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    emberCanvas.width = Math.floor(state.width * state.dpr);
    emberCanvas.height = Math.floor(state.height * state.dpr);
    emberCanvas.style.width = `${state.width}px`;
    emberCanvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    seedEmbers();
  }

  function seedEmbers() {
    const area = state.width * state.height;
    const isSmall = state.width < 720;
    const target = Math.max(isSmall ? 34 : 54, Math.min(isSmall ? 62 : 118, Math.round(area / (isSmall ? 17000 : 13000))));
    while (state.particles.length < target) state.particles.push(createEmber(true));
    state.particles.length = target;
  }

  function createEmber(randomY = false) {
    const depth = Math.random();
    const molecule = Math.random() > 0.62;
    return {
      x: Math.random() * state.width,
      y: randomY ? Math.random() * state.height : state.height + 24,
      radius: molecule ? 1.1 + Math.random() * 1.8 : 0.7 + Math.random() * 2.8,
      vx: (Math.random() - 0.5) * (0.08 + depth * 0.18),
      vy: -(0.06 + Math.random() * 0.28 + depth * 0.12),
      drift: Math.random() * Math.PI * 2,
      depth,
      molecule,
      alpha: molecule ? 0.16 + Math.random() * 0.28 : 0.2 + Math.random() * 0.5,
      hue: Math.random() > 0.34 ? 29 : 42
    };
  }

  function drawEmbers(now) {
    const delta = Math.min(34, now - state.lastTime) / 16.67;
    state.lastTime = now;
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.globalCompositeOperation = "lighter";

    for (const ember of state.particles) {
      ember.drift += 0.006 * delta;
      ember.x += (ember.vx + Math.sin(ember.drift) * 0.08) * delta;
      ember.y += ember.vy * delta;

      if (ember.y < -32 || ember.x < -40 || ember.x > state.width + 40) {
        Object.assign(ember, createEmber(false));
      }

      const pulse = 0.72 + Math.sin(now * 0.0016 + ember.drift) * 0.28;
      const alpha = ember.alpha * pulse;
      const glow = ember.radius * (ember.molecule ? 7 : 9);
      const gradient = ctx.createRadialGradient(ember.x, ember.y, 0, ember.x, ember.y, glow);
      gradient.addColorStop(0, `hsla(${ember.hue}, 100%, 68%, ${alpha})`);
      gradient.addColorStop(0.32, `hsla(${ember.hue}, 100%, 52%, ${alpha * 0.5})`);
      gradient.addColorStop(1, "rgba(255, 122, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, glow, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${ember.hue}, 100%, 76%, ${Math.min(0.88, alpha + 0.15)})`;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    drawMoleculeLines();
    state.raf = requestAnimationFrame(drawEmbers);
  }

  function drawMoleculeLines() {
    const points = state.particles.filter((particle) => particle.molecule);
    const maxDistance = state.width < 720 ? 82 : 118;
    ctx.lineWidth = 0.7;

    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i];
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);
        if (distance > maxDistance) continue;
        const alpha = (1 - distance / maxDistance) * 0.16;
        ctx.strokeStyle = `rgba(255, 150, 35, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  resizeEmbers();
  window.addEventListener("resize", resizeEmbers, { passive: true });
  reduceMotion.addEventListener?.("change", () => {
    if (reduceMotion.matches) {
      cancelAnimationFrame(state.raf);
      emberCanvas.hidden = true;
    } else {
      emberCanvas.hidden = false;
      resizeEmbers();
      state.lastTime = performance.now();
      state.raf = requestAnimationFrame(drawEmbers);
    }
  });
  state.raf = requestAnimationFrame(drawEmbers);
}

async function loadChannelVideos() {
  showEmptyVideos("Buscando os vídeos mais recentes do canal Ponto Sem Filtro...");

  try {
    videos = await fetchChannelVideos();
    renderVideos(videos);
  } catch (error) {
    const cached = readVideoCache();
    videos = cached;
    renderVideos(videos);
    if (!videos.length) {
      showEmptyVideos("Não encontrei vídeos publicados ainda. A galeria tenta atualizar automaticamente quando o canal receber o primeiro envio.");
    }
  }
}

async function fetchChannelVideos() {
  for (const source of VIDEO_FEED_SOURCES) {
    try {
      const response = await fetchWithTimeout(source);
      if (!response.ok) continue;
      const xml = await response.text();
      const list = parseVideoFeed(xml);
      if (list.length) {
        writeVideoCache(list);
        return list;
      }
    } catch (error) {}
  }

  const pageList = await fetchChannelVideosFromPage();
  if (pageList.length) {
    writeVideoCache(pageList);
    return pageList;
  }

  return readVideoCache();
}

async function fetchChannelVideosFromPage() {
  for (const source of VIDEO_PAGE_SOURCES) {
    try {
      const response = await fetchWithTimeout(source, 10000);
      if (!response.ok) continue;
      const text = await response.text();
      const list = parseVideoPage(text);
      if (list.length) return list;
    } catch (error) {}
  }

  return [];
}

async function fetchWithTimeout(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function parseVideoFeed(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const entries = Array.from(doc.getElementsByTagName("entry"));

  return entries.map((entry) => {
    const idNode = entry.getElementsByTagNameNS("*", "videoId")[0];
    const titleNode = entry.getElementsByTagName("title")[0];
    const publishedNode = entry.getElementsByTagName("published")[0];
    const id = idNode?.textContent?.trim();
    if (!id) return null;

    return {
      id,
      title: titleNode?.textContent?.trim() || "Vídeo do Ponto Sem Filtro",
      publishedAt: publishedNode?.textContent?.trim() || ""
    };
  }).filter(Boolean);
}

function parseVideoPage(text) {
  const videosById = new Map();
  const markdownLinkPattern = /\[([^\]]+)\]\(https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})[^)]*\)/g;
  let match;

  while ((match = markdownLinkPattern.exec(text))) {
    const title = cleanVideoTitle(match[1]);
    const id = match[2];
    if (title && !videosById.has(id)) {
      videosById.set(id, { id, title, publishedAt: "" });
    }
  }

  const rawVideoPattern = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  while ((match = rawVideoPattern.exec(text))) {
    const id = match[1];
    if (!videosById.has(id)) {
      videosById.set(id, { id, title: "Vídeo do Ponto Sem Filtro", publishedAt: "" });
    }
  }

  return Array.from(videosById.values()).filter((video) => video.id);
}

function cleanVideoTitle(value) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readVideoCache() {
  try {
    return JSON.parse(localStorage.getItem(VIDEO_CACHE_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function writeVideoCache(list) {
  try {
    localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(list.slice(0, 30)));
  } catch (error) {}
}

function initCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 1000);
  document.getElementById("floatingCountdown")?.addEventListener("click", () => {
    document.getElementById("contagem")?.scrollIntoView({ behavior: "smooth", block: "center" });
    enableClockSound();
  });
  ["click", "pointerdown", "keydown", "scroll", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, enableClockSoundFromPage, { passive: true });
  });
  setClockSound(true);
}

function enableClockSoundFromPage(event) {
  if (event?.target?.closest?.("#muteClock, .site-audio-player")) return;
  if (tickingEnabled) playClockLoop();
}

function updateCountdown() {
  const target = new Date(SITE_CONFIG.launchIso).getTime();
  const remaining = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  setText(countdownNodes.days, pad(days));
  setText(countdownNodes.hours, pad(hours));
  setText(countdownNodes.minutes, pad(minutes));
  setText(countdownNodes.seconds, pad(seconds));
  setText(countdownNodes.floating, `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
  setText(countdownNodes.bar, `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
  if (remaining <= 0) {
    if (tickingEnabled) setClockSound(false);
    setText(countdownNodes.soundStatus, "Estreia liberada");
  }
}

function enableClockSound() {
  setClockSound(true);
}

function setClockSound(enabled) {
  tickingEnabled = enabled;
  muteClock?.setAttribute("aria-pressed", String(enabled));
  muteClock?.setAttribute("aria-label", enabled ? "Desligar som do relógio" : "Ligar som do relógio");
  setText(muteClock, enabled ? "MUTAR" : "SOM");

  if (!enabled) {
    stopClockSounds();
    setText(countdownNodes.soundStatus, "Som do relógio desligado");
    return;
  }

  setText(countdownNodes.soundStatus, "Som do relógio ativo");
  playClockLoop();
}

function playClockLoop() {
  if (!tickingEnabled || clockSoundTimer) return;
  playNextClockSound();
}

function playNextClockSound() {
  if (!tickingEnabled) return;
  const sounds = getClockSounds();
  const audio = sounds[clockSoundIndex % sounds.length];
  clockSoundIndex = (clockSoundIndex + 1) % sounds.length;

  if (clockSoundStopTimer) {
    clearTimeout(clockSoundStopTimer);
    clockSoundStopTimer = null;
  }

  sounds.forEach((item) => {
    if (item !== audio) {
      item.pause();
      item.currentTime = 0;
    }
  });

  audio.pause();
  audio.currentTime = 0;
  audio.play().then(() => {
    clockSoundStopTimer = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      clockSoundStopTimer = null;
    }, CLOCK_SOUND_PLAY_MS);
    clockSoundTimer = setTimeout(() => {
      clockSoundTimer = null;
      playNextClockSound();
    }, CLOCK_SOUND_INTERVAL_MS);
  }).catch(() => {
    clockSoundTimer = null;
    setText(countdownNodes.soundStatus, "Som ativo; aguardando interacao do navegador");
  });
}

function getClockSounds() {
  if (clockAudios.length) return clockAudios;
  clockAudios = CLOCK_SOUND_SOURCES.map((source, index) => {
    const audio = new Audio(source);
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = index === 0 ? 0.22 : 0.14;
    return audio;
  });
  return clockAudios;
}

function stopClockSounds() {
  if (clockSoundTimer) {
    clearTimeout(clockSoundTimer);
    clockSoundTimer = null;
  }
  if (clockSoundStopTimer) {
    clearTimeout(clockSoundStopTimer);
    clockSoundStopTimer = null;
  }
  clockAudios.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}

muteClock?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setClockSound(!tickingEnabled);
});

function pad(value) {
  return String(value).padStart(2, "0");
}

function setText(node, text) {
  if (node) node.textContent = text;
}

function getSessionId() {
  try {
    const key = "tiagoSessionId";
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch (error) {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function initMetrics() {
  markReturningVisitor();
  recordMetric("visit");
  enrichMetricLocation();
  ["click", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      metricsSession.lastActiveAt = Date.now();
      metricsSession.interactions += 1;
      recordMetric("interaction", getInteractionDetails(event));
    }, { passive: true });
  });
  ["scroll", "mousemove"].forEach((eventName) => {
    window.addEventListener(eventName, () => {
      metricsSession.lastActiveAt = Date.now();
      updateScrollDepth();
      if (eventName === "scroll") recordMetric("scroll");
    }, { passive: true });
  });
  document.addEventListener("visibilitychange", () => {
    recordMetric(document.visibilityState === "hidden" ? "hidden" : "visible");
  });
  window.addEventListener("beforeunload", () => recordMetric("leave"));
  setInterval(() => recordMetric("heartbeat"), 15000);
}

function getInteractionDetails(event) {
  const target = event.target?.closest?.("a, button, input");
  if (!target) return { lastAction: event.type, lastTarget: "Página" };
  const label = target.getAttribute("aria-label") || target.textContent?.trim() || target.id || target.tagName;
  const href = target.getAttribute("href") || "";
  return {
    lastAction: event.type,
    lastTarget: label.replace(/\s+/g, " ").slice(0, 80),
    lastHref: href.slice(0, 160)
  };
}

function markReturningVisitor() {
  try {
    const key = "tiagoReturningVisitor";
    metricsSession.returning = localStorage.getItem(key) === "1";
    localStorage.setItem(key, "1");
  } catch (error) {}
}

function updateScrollDepth() {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const depth = Math.round((window.scrollY / scrollable) * 100);
  metricsSession.maxScroll = Math.max(metricsSession.maxScroll, Math.min(100, Math.max(0, depth)));
}

function readMetrics() {
  try {
    return JSON.parse(localStorage.getItem("tiagoSiteMetrics") || "[]");
  } catch (error) {
    return [];
  }
}

function writeMetrics(items) {
  try {
    localStorage.setItem("tiagoSiteMetrics", JSON.stringify(items.slice(-1500)));
  } catch (error) {}
}

function recordMetric(type, extra = {}) {
  const items = readMetrics();
  const now = Date.now();
  const last = items.find((item) => item.sessionId === metricsSession.id);
  const duration = Math.max(0, Math.round((now - metricsSession.startedAt) / 1000));
  if (last) {
    Object.assign(last, extra, { type, updatedAt: now, duration });
    last.interactions = metricsSession.interactions;
    last.maxScroll = metricsSession.maxScroll;
    last.viewport = `${window.innerWidth}x${window.innerHeight}`;
    last.referrer = last.referrer || document.referrer || "Direto";
    last.browser = last.browser || getBrowserName();
    last.device = last.device || getDeviceType();
    last.language = last.language || navigator.language || "";
    last.returning = metricsSession.returning;
  } else {
    items.push({
      sessionId: metricsSession.id,
      type,
      createdAt: now,
      updatedAt: now,
      duration,
      city: "Local não identificado",
      region: "",
      country: "",
      lat: null,
      lng: null,
      path: metricsSession.path,
      referrer: document.referrer || "Direto",
      browser: getBrowserName(),
      device: getDeviceType(),
      language: navigator.language || "",
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      interactions: metricsSession.interactions,
      maxScroll: metricsSession.maxScroll,
      returning: metricsSession.returning
    });
  }
  writeMetrics(items);
}

function getDeviceType() {
  const ua = navigator.userAgent || "";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "Celular";
  return "Desktop";
}

function getBrowserName() {
  const ua = navigator.userAgent || "";
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "Outro";
}

async function enrichMetricLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) return;
    const data = await response.json();
    recordMetric("visit", {
      city: data.city || "Local não identificado",
      region: data.region || data.region_code || "",
      country: data.country_name || data.country || "",
      lat: Number(data.latitude) || null,
      lng: Number(data.longitude) || null
    });
  } catch (error) {}
}

function initAdminPanel() {
  placeMetricsInsidePublications();
  adminNodes.enter?.addEventListener("click", (event) => {
    event.preventDefault();
    openAdminPanel();
  });
  adminNodes.panel?.querySelector(".admin-close")?.addEventListener("click", (event) => {
    event.preventDefault();
    closeAdminPanel();
  });
  adminNodes.panel?.querySelector(".admin-shell")?.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  adminNodes.refreshBtn?.addEventListener("click", renderAdminMetrics);
  adminNodes.exportBtn?.addEventListener("click", exportAdminMetrics);
  adminNodes.clearBtn?.addEventListener("click", clearAdminMetrics);
  document.querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      activeRangeDays = Number(button.dataset.range) || 1;
      renderAdminMetrics();
    });
  });
  document.querySelectorAll("[data-admin-mode]").forEach((button) => {
    button.addEventListener("click", () => setAdminMode(button.dataset.adminMode || "metrics"));
  });
  if (location.hash === "#admin-noticias") {
    openAdminPanel();
  }
}

function placeMetricsInsidePublications() {
  if (!adminNodes.metricsView || !adminNodes.newsWorkspace) return;
  const publisherLayout = adminNodes.newsWorkspace.querySelector(".publisher-layout");
  if (publisherLayout) {
    adminNodes.newsWorkspace.insertBefore(adminNodes.metricsView, publisherLayout);
  } else {
    adminNodes.newsWorkspace.appendChild(adminNodes.metricsView);
  }
  adminNodes.metricsView.hidden = false;
}

function openAdminPanel() {
  if (!adminNodes.panel) return;
  renderAdminMetrics();
  if (typeof adminNodes.panel.showModal === "function") {
    adminNodes.panel.showModal();
    return;
  }
  adminNodes.panel.setAttribute("open", "");
  adminNodes.panel.classList.add("open-fallback");
}

function closeAdminPanel() {
  if (!adminNodes.panel) return;
  if (typeof adminNodes.panel.close === "function") {
    adminNodes.panel.close();
  }
  adminNodes.panel.removeAttribute("open");
  adminNodes.panel.classList.remove("open-fallback");
}

function setAdminMode(mode) {
  const selectedMode = mode === "news" ? "news" : "metrics";
  document.querySelectorAll("[data-admin-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminMode === selectedMode);
  });
  document.querySelectorAll("[data-admin-view]").forEach((view) => {
    view.hidden = view.dataset.adminView !== selectedMode;
  });
  if (selectedMode === "metrics") renderAdminMetrics();
}

function renderAdminMetrics() {
  const since = Date.now() - activeRangeDays * 86400000;
  const rows = readMetrics().filter((item) => (item.updatedAt || item.createdAt) >= since);
  const sessions = new Map(rows.map((item) => [item.sessionId, item]));
  const visits = Array.from(sessions.values());
  const cities = new Set(visits.map((item) => item.city).filter(Boolean));
  const countries = new Set(visits.map((item) => item.country).filter(Boolean));
  const avgTime = visits.length ?Math.round(visits.reduce((sum, item) => sum + (Number(item.duration) || 0), 0) / visits.length) : 0;
  const online = visits.filter((item) => Date.now() - (item.updatedAt || 0) < 90000).length;
  const interactions = visits.reduce((sum, item) => sum + (Number(item.interactions) || 0), 0);
  const avgScroll = visits.length ?Math.round(visits.reduce((sum, item) => sum + (Number(item.maxScroll) || 0), 0) / visits.length) : 0;
  const returns = visits.filter((item) => item.returning).length;
  const engaged = visits.filter((item) => (Number(item.duration) || 0) >= 30 || (Number(item.maxScroll) || 0) >= 50 || (Number(item.interactions) || 0) >= 3).length;
  const deepScroll = visits.filter((item) => (Number(item.maxScroll) || 0) >= 80).length;
  const mobile = visits.filter((item) => item.device === "Celular").length;
  const avgInteractions = visits.length ? (interactions / visits.length).toFixed(1) : "0";
  const hourCounts = countBy(visits, (item) => `${new Date(item.createdAt || item.updatedAt).getHours()}h`);
  const sourceCounts = countBy(visits, (item) => item.referrer || "Direto");
  const deviceCounts = countBy(visits, (item) => item.device || "Dispositivo");
  const lastUpdatedAt = Math.max(0, ...visits.map((item) => Number(item.updatedAt || item.createdAt) || 0));

  setText(adminNodes.visits, String(visits.length));
  setText(adminNodes.online, String(online));
  setText(adminNodes.time, formatDuration(avgTime));
  setText(adminNodes.cities, String(cities.size));
  setText(adminNodes.countries, String(countries.size));
  setText(adminNodes.interactions, String(interactions));
  setText(adminNodes.scroll, `${avgScroll}%`);
  setText(adminNodes.returns, String(returns));
  setText(adminNodes.engagedRate, formatPercent(engaged, visits.length));
  setText(adminNodes.returnRate, formatPercent(returns, visits.length));
  setText(adminNodes.avgInteractions, avgInteractions);
  setText(adminNodes.mobileRate, formatPercent(mobile, visits.length));
  setText(adminNodes.deepScroll, formatPercent(deepScroll, visits.length));
  setText(adminNodes.lastUpdate, lastUpdatedAt ? formatRelativeTime(lastUpdatedAt) : "Sem dados");
  setText(adminNodes.peakHour, topCountLabel(hourCounts, "--"));
  setText(adminNodes.mainSource, simplifyReferrer(topCountLabel(sourceCounts, "Direto")));
  setText(adminNodes.mainDevice, topCountLabel(deviceCounts, "--"));
  setText(adminNodes.periodSummary, visits.length
    ? `${visits.length} visita${visits.length === 1 ? "" : "s"} no período, ${engaged} com engajamento relevante.`
    : "Nenhum dado no período.");
  setText(adminNodes.sessionCount, `${visits.length} registro${visits.length === 1 ? "" : "s"}`);

  document.querySelectorAll("[data-range]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.range) === activeRangeDays);
  });
  renderHourChart(visits);
  renderDayChart(visits);
  renderAccessMap(visits);
  renderLocationList(visits);
  renderCountList(adminNodes.sourceList, visits, (item) => simplifyReferrer(item.referrer || "Direto"));
  renderCountList(adminNodes.deviceList, visits, (item) => `${item.device || "Dispositivo"} / ${item.browser || "Navegador"}`);
  renderTechList(visits);
  renderActionList(visits);
  renderEngagementList(visits);
  renderSessionList(visits);
}

function countBy(items, getLabel) {
  const counts = new Map();
  items.forEach((item) => {
    const label = getLabel(item) || "Não identificado";
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return counts;
}

function topCountLabel(counts, fallback) {
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || fallback;
}

function formatPercent(value, total) {
  return `${total ? Math.round((value / total) * 100) : 0}%`;
}

function simplifyReferrer(value) {
  if (!value || value === "Direto") return "Direto";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (error) {
    return value;
  }
}

function renderHourChart(visits) {
  if (!adminNodes.hourChart) return;
  const counts = Array.from({ length: 24 }, () => 0);
  visits.forEach((item) => counts[new Date(item.createdAt || item.updatedAt).getHours()] += 1);
  const max = Math.max(1, ...counts);
  adminNodes.hourChart.innerHTML = counts.map((count, hour) =>
    `<span class="${count ? "" : "is-empty"}" title="${hour}h: ${count} acesso${count === 1 ? "" : "s"}" style="height:${Math.max(12, Math.round((count / max) * 170))}px">${count ? `<strong>${count}</strong><em>${String(hour).padStart(2, "0")}h</em>` : ""}</span>`
  ).join("");
}

function renderAccessMap(visits) {
  if (!adminNodes.accessMap) return;
  const located = visits.filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)));
  const grouped = new Map();
  located.forEach((item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    const label = [item.city, item.region, item.country].filter(Boolean).join(" - ") || "Local não identificado";
    const key = `${lat.toFixed(2)},${lng.toFixed(2)},${label}`;
    const current = grouped.get(key) || { lat, lng, label, count: 0 };
    current.count += 1;
    grouped.set(key, current);
  });
  const points = Array.from(grouped.values());
  if (!points.length) {
    adminNodes.accessMap.innerHTML = `<span class="map-empty">Aguardando localização dos próximos acessos.</span>`;
    return;
  }
  adminNodes.accessMap.innerHTML = points.map((item) => {
    const x = Math.max(4, Math.min(96, ((item.lng + 180) / 360) * 100));
    const y = Math.max(6, Math.min(94, ((90 - item.lat) / 180) * 100));
    const size = Math.min(34, 14 + item.count * 4);
    return `<span class="map-dot" title="${escapeHtml(item.label)}: ${item.count}" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px"><strong>${item.count}</strong><em>${escapeHtml(item.label)}</em></span>`;
  }).join("");
}

function renderLocationList(visits) {
  if (!adminNodes.locationList) return;
  const counts = new Map();
  visits.forEach((item) => {
    const key = [item.city, item.region, item.country].filter(Boolean).join(" - ") || "Local não identificado";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  adminNodes.locationList.innerHTML = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([label, count]) => `<span><strong>${label}</strong><em>${count}</em></span>`)
    .join("") || "<span>Nenhum acesso registrado ainda.</span>";
}

function renderDayChart(visits) {
  if (!adminNodes.dayChart) return;
  const days = [];
  for (let index = activeRangeDays - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 86400000);
    const key = date.toISOString().slice(0, 10);
    days.push({ key, label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), count: 0 });
  }
  visits.forEach((item) => {
    const key = new Date(item.createdAt || item.updatedAt).toISOString().slice(0, 10);
    const row = days.find((day) => day.key === key);
    if (row) row.count += 1;
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  adminNodes.dayChart.innerHTML = days.map((day) =>
    `<span class="${day.count ? "" : "is-empty"}" title="${day.label}: ${day.count} acesso${day.count === 1 ? "" : "s"}" style="height:${Math.max(14, Math.round((day.count / max) * 170))}px">${day.count ? `<strong>${day.count}</strong><em>${day.label}</em>` : ""}</span>`
  ).join("");
}

function renderCountList(node, visits, getLabel) {
  if (!node) return;
  const counts = new Map();
  visits.forEach((item) => {
    const label = getLabel(item) || "Não identificado";
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  node.innerHTML = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => `<span><strong>${escapeHtml(label)}</strong><em>${count}</em></span>`)
    .join("") || "<span>Nenhum dado no período.</span>";
}

function renderTechList(visits) {
  if (!adminNodes.techList) return;
  const languages = new Set(visits.map((item) => item.language).filter(Boolean));
  const viewports = countBy(visits, (item) => item.viewport || "Tela não identificada");
  adminNodes.techList.innerHTML = [
    ["Idiomas únicos", languages.size],
    ["Tela mais comum", topCountLabel(viewports, "--")],
    ["Navegadores", new Set(visits.map((item) => item.browser).filter(Boolean)).size],
    ["Desktop", visits.filter((item) => item.device === "Desktop").length],
    ["Celular", visits.filter((item) => item.device === "Celular").length]
  ].map(([label, value]) => `<span><strong>${label}</strong><em>${value}</em></span>`).join("") || "<span>Nenhum dado no período.</span>";
}

function renderActionList(visits) {
  if (!adminNodes.actionList) return;
  const recent = visits
    .filter((item) => item.lastTarget || item.lastAction)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 8);
  adminNodes.actionList.innerHTML = recent.map((item) => {
    const action = item.lastTarget || item.lastAction || "Página";
    const time = item.updatedAt ? formatRelativeTime(item.updatedAt) : "--";
    return `<span><strong>${escapeHtml(action)}</strong><em>${time}</em></span>`;
  }).join("") || "<span>Nenhuma ação registrada no período.</span>";
}

function renderEngagementList(visits) {
  if (!adminNodes.engagementList) return;
  const totalTime = visits.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
  const totalInteractions = visits.reduce((sum, item) => sum + (Number(item.interactions) || 0), 0);
  const topScroll = visits.reduce((max, item) => Math.max(max, Number(item.maxScroll) || 0), 0);
  adminNodes.engagementList.innerHTML = [
    ["Tempo total", formatDuration(totalTime)],
    ["Interações totais", totalInteractions],
    ["Maior profundidade de scroll", `${topScroll}%`],
    ["Idiomas únicos", new Set(visits.map((item) => item.language).filter(Boolean)).size]
  ].map(([label, value]) => `<span><strong>${label}</strong><em>${value}</em></span>`).join("");
}

function renderSessionList(visits) {
  if (!adminNodes.sessionList) return;
  adminNodes.sessionList.innerHTML = visits
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 18)
    .map((item) => {
      const place = [item.city, item.region, item.country].filter(Boolean).join(" - ") || "Local não identificado";
      const source = simplifyReferrer(item.referrer || "Direto");
      const action = item.lastTarget || item.type || "--";
      const time = item.updatedAt || item.createdAt;
      return `<div class="session-row"><strong>${escapeHtml(place)}</strong><span>${escapeHtml(source)}</span><span>${escapeHtml(item.device || "Dispositivo")} / ${escapeHtml(item.browser || "Browser")}</span><span>${formatDuration(Number(item.duration) || 0)}</span><span>${Number(item.maxScroll) || 0}%</span><span>${escapeHtml(action)}</span><em>${time ? new Date(time).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "--"}</em></div>`;
    }).join("") || "<span>Nenhuma sessão no período.</span>";
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function formatRelativeTime(timestamp) {
  const diff = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (diff < 15) return "agora";
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return new Date(timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function exportAdminMetrics() {
  const rows = readMetrics();
  if (!rows.length) return;
  const headers = ["sessionId", "createdAt", "updatedAt", "duration", "city", "region", "country", "referrer", "device", "browser", "language", "viewport", "interactions", "maxScroll", "returning", "lastAction", "lastTarget"];
  const csv = [
    headers.join(";"),
    ...rows.map((row) => headers.map((key) => csvCell(row[key] ?? "")).join(";"))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ponto-sem-filtro-metricas-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function clearAdminMetrics() {
  if (!confirm("Apagar as métricas salvas neste navegador?")) return;
  localStorage.removeItem("tiagoSiteMetrics");
  recordMetric("visit");
  renderAdminMetrics();
}
