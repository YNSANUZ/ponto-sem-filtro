const BIO_CONFIG = {
  channelUrl: "https://www.youtube.com/@pontosemfiltro",
  channelId: "UCUebd2BZkh8-4HBUtFVmT8g",
  launchIso: "2026-06-19T17:00:00-03:00",
  socials: {
    instagram: "https://www.instagram.com/pontosemfiltro",
    youtube: "https://www.youtube.com/@pontosemfiltro",
    tiktok: "https://www.tiktok.com/@pontosemfiltro",
    kwai: "https://www.kwai.com/@pontosemfiltro",
    x: "https://x.com/pontosemfiltro",
    facebook: "https://www.facebook.com/pontosemfiltro"
  }
};

const BIO_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${BIO_CONFIG.channelId}`;
const BIO_PAGE_URL = `${BIO_CONFIG.channelUrl}/videos`;
const BIO_FEED_SOURCES = [
  `https://api.allorigins.win/raw?url=${encodeURIComponent(BIO_FEED_URL)}`,
  BIO_FEED_URL
];
const BIO_PAGE_SOURCES = [
  `https://r.jina.ai/http://r.jina.ai/http://https://www.youtube.com/@pontosemfiltro/videos`,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(BIO_PAGE_URL)}`
];

const bioPlayer = document.getElementById("bioPlayer");
const bioVideoTitle = document.getElementById("bioVideoTitle");
const bioYoutubeOpen = document.getElementById("bioYoutubeOpen");
const bioMoreVideos = document.getElementById("bioMoreVideos");
const bioVideoList = document.getElementById("bioVideoList");
const bioTime = document.getElementById("bioTime");
const bioEmbers = document.getElementById("bioEmbers");

let bioVideos = [];
let activeBioVideo = null;

initBioLinks();
initBioCountdown();
initBioEmbers();
loadBioVideos();

bioMoreVideos?.addEventListener("click", () => {
  const expanded = bioMoreVideos.getAttribute("aria-expanded") === "true";
  bioMoreVideos.setAttribute("aria-expanded", String(!expanded));
  bioMoreVideos.textContent = expanded ? "Mais vídeos" : "Ocultar vídeos";
  bioVideoList.hidden = expanded;
});

function initBioLinks() {
  document.getElementById("bioInstagram").href = BIO_CONFIG.socials.instagram;
  document.getElementById("bioYoutube").href = BIO_CONFIG.socials.youtube;
  document.getElementById("bioTiktok").href = BIO_CONFIG.socials.tiktok;
  document.getElementById("bioKwai").href = BIO_CONFIG.socials.kwai;
  document.getElementById("bioX").href = BIO_CONFIG.socials.x;
  document.getElementById("bioFacebook").href = BIO_CONFIG.socials.facebook;
}

function initBioCountdown() {
  updateBioCountdown();
  setInterval(updateBioCountdown, 1000);
}

function updateBioCountdown() {
  const remaining = Math.max(0, new Date(BIO_CONFIG.launchIso).getTime() - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  bioTime.textContent = `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

async function loadBioVideos() {
  try {
    bioVideos = await fetchBioVideos();
  } catch (error) {
    bioVideos = [];
  }
  renderBioVideos(bioVideos);
}

async function fetchBioVideos() {
  for (const source of BIO_FEED_SOURCES) {
    try {
      const response = await fetchWithTimeout(source);
      if (!response.ok) continue;
      const list = parseVideoFeed(await response.text());
      if (list.length) return list;
    } catch (error) {}
  }

  for (const source of BIO_PAGE_SOURCES) {
    try {
      const response = await fetchWithTimeout(source, 10000);
      if (!response.ok) continue;
      const list = parseVideoPage(await response.text());
      if (list.length) return list;
    } catch (error) {}
  }

  return [];
}

async function fetchWithTimeout(url, timeoutMs = 6500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function renderBioVideos(list) {
  if (!list.length) {
    bioVideoTitle.textContent = "Vídeo em atualização";
    bioYoutubeOpen.href = BIO_CONFIG.channelUrl;
    bioVideoList.innerHTML = "";
    return;
  }

  selectBioVideo(list[0]);
  bioVideoList.innerHTML = list.slice(0, 10).map((video) => `
    <button class="bio-video-item" type="button" data-video-id="${video.id}">
      <img src="${thumbUrl(video)}" alt="">
      <strong>${escapeHtml(video.title)}</strong>
    </button>
  `).join("");

  bioVideoList.querySelectorAll(".bio-video-item").forEach((button) => {
    button.addEventListener("click", () => {
      const video = list.find((item) => item.id === button.dataset.videoId);
      if (video) selectBioVideo(video);
    });
  });
}

function selectBioVideo(video) {
  activeBioVideo = video;
  bioPlayer.src = `https://www.youtube.com/embed/${video.id}?rel=0&modestbranding=1`;
  bioVideoTitle.textContent = video.title;
  bioYoutubeOpen.href = youtubeUrl(video);
  bioVideoList?.querySelectorAll(".bio-video-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.videoId === video.id);
  });
}

function parseVideoFeed(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("entry")).map((entry) => {
    const id = entry.getElementsByTagNameNS("*", "videoId")[0]?.textContent?.trim();
    const title = entry.getElementsByTagName("title")[0]?.textContent?.trim();
    if (!id) return null;
    return { id, title: title || "Vídeo do Ponto Sem Filtro" };
  }).filter(Boolean);
}

function parseVideoPage(text) {
  const videosById = new Map();
  const markdownLinkPattern = /\[([^\]]+)\]\(https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})[^)]*\)/g;
  let match;
  while ((match = markdownLinkPattern.exec(text))) {
    const title = cleanVideoTitle(match[1]);
    const id = match[2];
    if (title && !videosById.has(id)) videosById.set(id, { id, title });
  }
  const rawVideoPattern = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  while ((match = rawVideoPattern.exec(text))) {
    const id = match[1];
    if (!videosById.has(id)) videosById.set(id, { id, title: "Vídeo do Ponto Sem Filtro" });
  }
  return Array.from(videosById.values());
}

function initBioEmbers() {
  if (!bioEmbers || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = bioEmbers.getContext("2d");
  const particles = [];

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.6);
    bioEmbers.width = Math.floor(innerWidth * dpr);
    bioEmbers.height = Math.floor(innerHeight * dpr);
    bioEmbers.style.width = `${innerWidth}px`;
    bioEmbers.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles.length = 0;
    const total = Math.max(34, Math.min(76, Math.round((innerWidth * innerHeight) / 17000)));
    for (let index = 0; index < total; index += 1) particles.push(makeParticle(true));
  }

  function makeParticle(randomY = false) {
    return {
      x: Math.random() * innerWidth,
      y: randomY ? Math.random() * innerHeight : innerHeight + 20,
      r: 0.8 + Math.random() * 2.6,
      vy: -(0.08 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 0.16,
      a: 0.22 + Math.random() * 0.42
    };
  }

  function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = "lighter";
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -20 || p.x < -20 || p.x > innerWidth + 20) Object.assign(p, makeParticle(false));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
      g.addColorStop(0, `rgba(255, 177, 61, ${p.a})`);
      g.addColorStop(1, "rgba(255, 122, 0, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }

  resize();
  addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(frame);
}

function youtubeUrl(video) {
  return `https://www.youtube.com/watch?v=${video.id}`;
}

function thumbUrl(video) {
  return `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
}

function cleanVideoTitle(value) {
  return value.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}

function pad(value) {
  return String(value).padStart(2, "0");
}
