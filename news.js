const OWNER_ADMINS = new Set(["ynsanuz@gmail.com", "pontosemfiltro@gmail.com"]);
const FIREBASE_CDN_VERSION = "10.12.5";
const NEWS_COLLECTION = "noticias";
const MODERATOR_COLLECTION = "newsModerators";

const config = window.PSF_SITE_INTEGRATIONS || window.PSF_FIREBASE_CONFIG || {};
const firebaseConfig = config.firebase || {};

const nodes = {
  feature: document.getElementById("newsFeature"),
  grid: document.getElementById("newsGrid"),
  toggle: document.getElementById("newsToggle"),
  reader: document.getElementById("newsReader"),
  readerClose: document.getElementById("newsReaderClose"),
  readerMeta: document.getElementById("newsReaderMeta"),
  readerTitle: document.getElementById("newsReaderTitle"),
  readerImage: document.getElementById("newsReaderImage"),
  readerAudio: document.getElementById("newsReaderAudio"),
  readerBody: document.getElementById("newsReaderBody"),
  login: document.getElementById("newsGoogleLogin"),
  logout: document.getElementById("newsGoogleLogout"),
  status: document.getElementById("newsAdminStatus"),
  workspace: document.getElementById("newsAdminWorkspace"),
  account: document.getElementById("newsAdminAccount"),
  role: document.getElementById("newsAdminRole"),
  editorTitle: document.getElementById("newsEditorTitle"),
  editorState: document.getElementById("newsEditorState"),
  title: document.getElementById("newsTitle"),
  slug: document.getElementById("newsSlug"),
  summary: document.getElementById("newsSummary"),
  category: document.getElementById("newsCategory"),
  imageFile: document.getElementById("newsImageFile"),
  uploadImage: document.getElementById("newsUploadImage"),
  imageUrl: document.getElementById("newsImageUrl"),
  imagePreview: document.getElementById("newsImagePreview"),
  audioUrl: document.getElementById("newsAudioUrl"),
  content: document.getElementById("newsContent"),
  statusSelect: document.getElementById("newsStatus"),
  saveDraft: document.getElementById("newsSaveDraft"),
  publish: document.getElementById("newsPublish"),
  reset: document.getElementById("newsReset"),
  delete: document.getElementById("newsDelete"),
  adminList: document.getElementById("adminNewsList"),
  adminCount: document.getElementById("newsAdminCount"),
  moderatorPanel: document.getElementById("moderatorAdminPanel"),
  moderatorEmail: document.getElementById("moderatorEmail"),
  moderatorAdd: document.getElementById("moderatorAdd"),
  moderatorList: document.getElementById("moderatorList")
};

const state = {
  expanded: false,
  editingId: "",
  posts: [],
  adminPosts: [],
  moderators: [],
  user: null,
  isOwnerAdmin: false,
  isModerator: false,
  app: null,
  auth: null,
  db: null,
  provider: null,
  modules: null,
  unlistenPublic: null,
  unlistenAdmin: null,
  unlistenModerators: null
};

bindStaticEvents();
renderPublicPosts([]);
initNewsSystem();

function bindStaticEvents() {
  nodes.toggle?.addEventListener("click", () => {
    state.expanded = !state.expanded;
    renderPublicPosts(state.posts);
  });
  nodes.readerClose?.addEventListener("click", closeReader);
  nodes.login?.addEventListener("click", signInWithGoogle);
  nodes.logout?.addEventListener("click", signOutGoogle);
  nodes.title?.addEventListener("input", updateSlugFromTitle);
  nodes.imageUrl?.addEventListener("input", renderImagePreview);
  nodes.uploadImage?.addEventListener("click", uploadImageToProvider);
  nodes.saveDraft?.addEventListener("click", () => savePost("rascunho"));
  nodes.publish?.addEventListener("click", () => savePost("publicado"));
  nodes.reset?.addEventListener("click", resetEditor);
  nodes.delete?.addEventListener("click", deleteCurrentPost);
  nodes.moderatorAdd?.addEventListener("click", addModerator);
  nodes.moderatorEmail?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addModerator();
  });
}

async function initNewsSystem() {
  if (!isPublishingConfigured()) {
    if (nodes.login) {
      nodes.login.disabled = true;
      nodes.login.textContent = "Google não configurado";
      nodes.login.title = "Preencha as credenciais Firebase em site-config.js para ativar o login Google.";
    }
    setAdminStatus("Login Google ainda não configurado. Preencha o Firebase em site-config.js para ativar publicações.");
    return;
  }

  try {
    state.modules = await loadPublishingModules();
    state.app = state.modules.initializeApp(firebaseConfig);
    state.auth = state.modules.getAuth(state.app);
    state.db = state.modules.getFirestore(state.app);
    state.provider = new state.modules.GoogleAuthProvider();
    subscribePublicPosts();
    state.modules.onAuthStateChanged(state.auth, handleAuthState);
    setAdminStatus("Entre para gerenciar notícias.");
  } catch (error) {
    setAdminStatus("Não foi possível iniciar a área de publicações. Tente novamente em instantes.");
  }
}

function isPublishingConfigured() {
  return ["apiKey", "authDomain", "projectId", "appId"].every((key) => Boolean(firebaseConfig[key]));
}

async function loadPublishingModules() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_CDN_VERSION}`;
  const [app, auth, firestore] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  return { ...app, ...auth, ...firestore };
}

function subscribePublicPosts() {
  const { collection, onSnapshot, query, where } = state.modules;
  const publicQuery = query(collection(state.db, NEWS_COLLECTION), where("status", "==", "publicado"));
  state.unlistenPublic?.();
  state.unlistenPublic = onSnapshot(publicQuery, (snapshot) => {
    state.posts = snapshot.docs.map(docToPost).sort(sortByPublishedAt);
    renderPublicPosts(state.posts);
  }, () => {
    renderPublicPosts([]);
  });
}

async function handleAuthState(user) {
  state.user = user;
  state.isOwnerAdmin = false;
  state.isModerator = false;
  state.unlistenAdmin?.();
  state.unlistenModerators?.();

  if (!user) {
    updateAdminAuthUi();
    resetEditor();
    return;
  }

  const email = normalizeEmail(user.email);
  state.isOwnerAdmin = OWNER_ADMINS.has(email);
  state.isModerator = state.isOwnerAdmin || await readModeratorPermission(email);

  updateAdminAuthUi();

  if (!state.isOwnerAdmin && !state.isModerator) {
    setAdminStatus(`A conta ${email} não tem permissão para alimentar notícias.`);
    return;
  }

  subscribeAdminPosts();
  if (state.isOwnerAdmin) subscribeModerators();
}

async function readModeratorPermission(email) {
  try {
    const { doc, getDoc } = state.modules;
    const snapshot = await getDoc(doc(state.db, MODERATOR_COLLECTION, email));
    return snapshot.exists() && snapshot.data().active === true;
  } catch (error) {
    return false;
  }
}

function updateAdminAuthUi() {
  const email = normalizeEmail(state.user?.email || "");
  const canManageNews = Boolean(state.user && (state.isOwnerAdmin || state.isModerator));
  nodes.login && (nodes.login.hidden = Boolean(state.user));
  nodes.logout && (nodes.logout.hidden = !state.user);
  nodes.workspace && (nodes.workspace.hidden = !canManageNews);
  nodes.moderatorPanel && (nodes.moderatorPanel.hidden = !state.isOwnerAdmin);
  setText(nodes.account, state.user ? `${state.user.displayName || "Conta Google"} - ${email}` : "Conta desconectada");
  setText(nodes.role, state.isOwnerAdmin ? "Administrador" : "Autor Google");

  if (!state.user) {
    setAdminStatus("Aguardando entrada com Google.");
  } else if (!canManageNews) {
    setAdminStatus(`A conta ${email} não tem permissão para alimentar notícias.`);
  } else if (canManageNews) {
    setAdminStatus(state.isOwnerAdmin
      ? "Administrador conectado. Voce pode ver metricas, publicar materias e gerenciar moderadores."
      : "Conta Google conectada. Voce pode ver metricas e publicar materias.");
  }
}

async function signInWithGoogle() {
  if (!state.auth || !state.provider) return;
  try {
    await state.modules.signInWithPopup(state.auth, state.provider);
  } catch (error) {
    setAdminStatus(getGoogleLoginMessage(error));
  }
}

function getGoogleLoginMessage(error) {
  const code = error?.code || "";
  if (code.includes("unauthorized-domain")) {
    return "Este domínio ainda não está autorizado no Firebase Authentication.";
  }
  if (code.includes("operation-not-allowed")) {
    return "Ative o provedor Google no Firebase Authentication.";
  }
  if (code.includes("popup-blocked")) {
    return "O navegador bloqueou a janela do Google. Libere pop-ups para este site.";
  }
  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) {
    return "Entrada com Google cancelada antes da conclusão.";
  }
  return "Não foi possível entrar com Google. Confira a configuração do Firebase.";
}

async function signOutGoogle() {
  if (!state.auth) return;
  await state.modules.signOut(state.auth);
}

function subscribeAdminPosts() {
  const { collection, onSnapshot, query, where } = state.modules;
  const email = normalizeEmail(state.user?.email || "");
  const postsRef = state.isOwnerAdmin
    ? collection(state.db, NEWS_COLLECTION)
    : query(collection(state.db, NEWS_COLLECTION), where("authorEmail", "==", email));
  state.unlistenAdmin?.();
  state.unlistenAdmin = onSnapshot(postsRef, (snapshot) => {
    state.adminPosts = snapshot.docs.map(docToPost).sort(sortByUpdatedAt);
    renderAdminPosts();
  }, () => {
    setAdminStatus("Sem permissão para ler as publicações desta conta.");
  });
}

function subscribeModerators() {
  const { collection, onSnapshot } = state.modules;
  state.unlistenModerators?.();
  state.unlistenModerators = onSnapshot(collection(state.db, MODERATOR_COLLECTION), (snapshot) => {
    state.moderators = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => normalizeEmail(a.email).localeCompare(normalizeEmail(b.email)));
    renderModerators();
  });
}

function docToPost(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title || "Sem título",
    slug: data.slug || snapshot.id,
    summary: data.summary || "",
    category: data.category || "Notícia",
    imageUrl: data.imageUrl || "",
    audioUrl: data.audioUrl || "",
    content: data.content || "",
    status: data.status || "rascunho",
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
    publishedAt: timestampToMillis(data.publishedAt),
    authorEmail: data.authorEmail || data.createdBy || "",
    updatedBy: data.updatedBy || ""
  };
}

function renderPublicPosts(posts) {
  if (!nodes.feature || !nodes.grid) return;
  if (!posts.length) {
    nodes.feature.innerHTML = `
      <div class="empty-gallery news-empty">
        <strong>Nenhuma notícia publicada ainda.</strong>
        <span>Assim que a primeira publicação for liberada, ela aparece aqui automaticamente.</span>
      </div>
    `;
    nodes.grid.innerHTML = "";
    nodes.toggle && (nodes.toggle.hidden = true);
    return;
  }

  const [featured, ...rest] = posts;
  nodes.feature.innerHTML = featureTemplate(featured);
  nodes.grid.classList.toggle("is-collapsed", !state.expanded);
  nodes.grid.innerHTML = rest.map(cardTemplate).join("");
  nodes.toggle && (nodes.toggle.hidden = rest.length <= 3);
  nodes.toggle && (nodes.toggle.textContent = state.expanded ? "Ver menos" : "Ver todas");
  bindReadButtons();
}

function featureTemplate(post) {
  return `
    <article class="news-feature-card">
      <div class="news-feature-media">${imageTemplate(post)}</div>
      <div class="news-feature-copy">
        ${metaTemplate(post)}
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.summary || shortText(post.content))}</p>
        <button class="primary-action" type="button" data-read-news="${escapeAttr(post.id)}">Ler matéria</button>
      </div>
    </article>
  `;
}

function cardTemplate(post) {
  return `
    <article class="news-card">
      <div class="news-card-media">${imageTemplate(post)}</div>
      <div class="news-card-copy">
        ${metaTemplate(post)}
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.summary || shortText(post.content))}</p>
        <button class="ghost-action" type="button" data-read-news="${escapeAttr(post.id)}">Ler matéria</button>
      </div>
    </article>
  `;
}

function imageTemplate(post) {
  if (!post.imageUrl) return "";
  return `<img src="${escapeAttr(post.imageUrl)}" alt="${escapeAttr(post.title)}" loading="lazy">`;
}

function metaTemplate(post) {
  return `
    <div class="news-meta">
      <span>${escapeHtml(post.category || "Notícia")}</span>
      <span>${formatDate(post.publishedAt || post.updatedAt || post.createdAt)}</span>
    </div>
  `;
}

function bindReadButtons() {
  document.querySelectorAll("[data-read-news]").forEach((button) => {
    button.addEventListener("click", () => openReader(button.dataset.readNews));
  });
}

function openReader(id) {
  const post = [...state.posts, ...state.adminPosts].find((item) => item.id === id);
  if (!post || !nodes.reader) return;
  setText(nodes.readerMeta, `${post.category || "Notícia"} - ${formatDate(post.publishedAt || post.updatedAt || post.createdAt)}`);
  setText(nodes.readerTitle, post.title);
  nodes.readerImage.hidden = !post.imageUrl;
  if (post.imageUrl) {
    nodes.readerImage.src = post.imageUrl;
    nodes.readerImage.alt = post.title;
  } else {
    nodes.readerImage.removeAttribute("src");
    nodes.readerImage.alt = "";
  }
  nodes.readerAudio.hidden = !post.audioUrl;
  if (post.audioUrl) {
    nodes.readerAudio.src = post.audioUrl;
  } else {
    nodes.readerAudio.removeAttribute("src");
  }
  nodes.readerBody.textContent = post.content || post.summary || "";

  if (typeof nodes.reader.showModal === "function") {
    nodes.reader.showModal();
  } else {
    nodes.reader.setAttribute("open", "");
  }
}

function closeReader() {
  if (!nodes.reader) return;
  if (typeof nodes.reader.close === "function") {
    nodes.reader.close();
  } else {
    nodes.reader.removeAttribute("open");
  }
  if (nodes.readerAudio) {
    nodes.readerAudio.pause();
    nodes.readerAudio.removeAttribute("src");
  }
}

function renderAdminPosts() {
  if (!nodes.adminList) return;
  setText(nodes.adminCount, `${state.adminPosts.length} registro${state.adminPosts.length === 1 ? "" : "s"}`);
  nodes.adminList.innerHTML = state.adminPosts.map((post) => `
    <button class="admin-news-item ${state.editingId === post.id ? "active" : ""}" type="button" data-edit-news="${escapeAttr(post.id)}">
      <strong>${escapeHtml(post.title)}</strong>
      <span class="status-chip ${post.status === "publicado" ? "published" : ""}">${escapeHtml(post.status)}</span>
      <span>${escapeHtml(post.category || "Notícia")} - ${formatDate(post.updatedAt || post.createdAt)}</span>
    </button>
  `).join("") || `<div class="empty-gallery"><strong>Nenhuma publicação.</strong><span>Crie a primeira notícia no editor.</span></div>`;

  document.querySelectorAll("[data-edit-news]").forEach((button) => {
    button.addEventListener("click", () => loadPostIntoEditor(button.dataset.editNews));
  });
}

function loadPostIntoEditor(id) {
  const post = state.adminPosts.find((item) => item.id === id);
  if (!post) return;
  state.editingId = id;
  nodes.title.value = post.title || "";
  nodes.slug.value = post.slug || "";
  nodes.summary.value = post.summary || "";
  nodes.category.value = post.category || "";
  nodes.imageUrl.value = post.imageUrl || "";
  nodes.audioUrl.value = post.audioUrl || "";
  nodes.content.value = post.content || "";
  nodes.statusSelect.value = post.status || "rascunho";
  nodes.delete.hidden = false;
  setText(nodes.editorTitle, "Editar publicação");
  setText(nodes.editorState, post.status === "publicado" ? "Publicado" : "Rascunho");
  renderImagePreview();
  renderAdminPosts();
}

function resetEditor() {
  state.editingId = "";
  ["title", "slug", "summary", "imageUrl", "audioUrl", "content"].forEach((key) => {
    if (nodes[key]) nodes[key].value = "";
  });
  if (nodes.category) nodes.category.value = "Opinião";
  if (nodes.statusSelect) nodes.statusSelect.value = "rascunho";
  if (nodes.imageFile) nodes.imageFile.value = "";
  if (nodes.delete) nodes.delete.hidden = true;
  setText(nodes.editorTitle, "Nova publicação");
  setText(nodes.editorState, "Rascunho");
  renderImagePreview();
  renderAdminPosts();
}

async function savePost(forcedStatus) {
  if (!state.user) {
    setAdminStatus("Entre com Google para salvar noticias.");
    return;
    setAdminStatus("Entre com uma conta autorizada para salvar notícias.");
    return;
  }

  const title = nodes.title.value.trim();
  if (!title) {
    nodes.title.focus();
    setAdminStatus("Informe o título da notícia.");
    return;
  }

  const status = forcedStatus || nodes.statusSelect.value || "rascunho";
  const email = normalizeEmail(state.user?.email || "");
  const existing = state.adminPosts.find((post) => post.id === state.editingId);
  const data = {
    title,
    slug: slugify(nodes.slug.value || title),
    summary: nodes.summary.value.trim(),
    category: nodes.category.value.trim() || "Notícia",
    imageUrl: nodes.imageUrl.value.trim(),
    audioUrl: nodes.audioUrl.value.trim(),
    content: nodes.content.value.trim(),
    status,
    updatedAt: state.modules.serverTimestamp(),
    updatedBy: email,
    authorEmail: existing?.authorEmail || email
  };

  if (!state.editingId) {
    data.createdAt = state.modules.serverTimestamp();
    data.createdBy = email;
  }

  data.publishedAt = status === "publicado"
    ? state.modules.serverTimestamp()
    : null;

  try {
    if (state.editingId) {
      await state.modules.setDoc(state.modules.doc(state.db, NEWS_COLLECTION, state.editingId), data, { merge: true });
    } else {
      const ref = await state.modules.addDoc(state.modules.collection(state.db, NEWS_COLLECTION), data);
      state.editingId = ref.id;
      nodes.delete.hidden = false;
    }
    nodes.statusSelect.value = status;
    setText(nodes.editorState, status === "publicado" ? "Publicado" : "Rascunho");
    setAdminStatus(status === "publicado" ? "Notícia publicada com sucesso." : "Rascunho salvo com sucesso.");
  } catch (error) {
    setAdminStatus("Não foi possível salvar. Confira sua sessão e tente novamente.");
  }
}

async function deleteCurrentPost() {
  if (!state.editingId || !state.user) return;
  const post = state.adminPosts.find((item) => item.id === state.editingId);
  if (!confirm(`Excluir "${post?.title || "esta publicação"}"?`)) return;
  try {
    await state.modules.deleteDoc(state.modules.doc(state.db, NEWS_COLLECTION, state.editingId));
    resetEditor();
    setAdminStatus("Publicação excluída.");
  } catch (error) {
    setAdminStatus("Não foi possível excluir a publicação.");
  }
}

async function uploadImageToProvider() {
  const file = nodes.imageFile?.files?.[0];
  const apiKey = config.imageUploadKey || "";
  if (!file) {
    setAdminStatus("Escolha uma imagem antes de enviar.");
    return;
  }
  if (!apiKey) {
    setAdminStatus("Envio de imagem ainda não está ativado. Use uma URL de imagem externa por enquanto.");
    return;
  }

  const form = new FormData();
  form.append("image", file);
  setAdminStatus("Enviando imagem...");

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      body: form
    });
    const result = await response.json();
    if (!response.ok || !result?.data?.url) throw new Error("upload-failed");
    nodes.imageUrl.value = result.data.display_url || result.data.url;
    renderImagePreview();
    setAdminStatus("Imagem enviada. O link foi aplicado na publicação.");
  } catch (error) {
    setAdminStatus("Não foi possível enviar a imagem. Use uma URL externa por enquanto.");
  }
}

function renderImagePreview() {
  if (!nodes.imagePreview) return;
  const url = nodes.imageUrl?.value?.trim();
  nodes.imagePreview.innerHTML = url
    ? `<img src="${escapeAttr(url)}" alt="Preview da imagem">`
    : "Preview da imagem";
}

async function addModerator() {
  if (!state.isOwnerAdmin) return;
  const email = normalizeEmail(nodes.moderatorEmail.value);
  if (!email || !email.includes("@")) {
    nodes.moderatorEmail.focus();
    return;
  }
  if (OWNER_ADMINS.has(email)) {
    setAdminStatus("Este e-mail já é administrador principal.");
    return;
  }
  try {
    await state.modules.setDoc(state.modules.doc(state.db, MODERATOR_COLLECTION, email), {
      email,
      role: "moderator",
      active: true,
      createdAt: state.modules.serverTimestamp(),
      createdBy: normalizeEmail(state.user.email)
    });
    nodes.moderatorEmail.value = "";
    setAdminStatus("Moderador adicionado.");
  } catch (error) {
    setAdminStatus("Não foi possível adicionar moderador.");
  }
}

function renderModerators() {
  if (!nodes.moderatorList) return;
  nodes.moderatorList.innerHTML = state.moderators.map((moderator) => `
    <span>
      <strong>${escapeHtml(moderator.email || moderator.id)}</strong>
      <button type="button" data-remove-moderator="${escapeAttr(moderator.id)}">Remover</button>
    </span>
  `).join("") || "<span>Nenhum moderador adicionado ainda.</span>";

  document.querySelectorAll("[data-remove-moderator]").forEach((button) => {
    button.addEventListener("click", () => removeModerator(button.dataset.removeModerator));
  });
}

async function removeModerator(id) {
  if (!state.isOwnerAdmin || !id) return;
  if (!confirm(`Remover moderador ${id}?`)) return;
  try {
    await state.modules.deleteDoc(state.modules.doc(state.db, MODERATOR_COLLECTION, id));
    setAdminStatus("Moderador removido.");
  } catch (error) {
    setAdminStatus("Não foi possível remover moderador.");
  }
}

function updateSlugFromTitle() {
  if (!nodes.slug.value.trim()) nodes.slug.value = slugify(nodes.title.value);
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || `noticia-${Date.now()}`;
}

function sortByPublishedAt(a, b) {
  return (b.publishedAt || b.updatedAt || b.createdAt || 0) - (a.publishedAt || a.updatedAt || a.createdAt || 0);
}

function sortByUpdatedAt(a, b) {
  return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  return 0;
}

function shortText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function formatDate(timestamp) {
  if (!timestamp) return "Agora";
  return new Date(timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function setAdminStatus(message) {
  setText(nodes.status, message);
}

function setText(node, text) {
  if (node) node.textContent = text;
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value ?? "";
  return span.innerHTML;
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
