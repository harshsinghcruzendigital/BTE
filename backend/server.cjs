"use strict";

const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT_DIR = path.resolve(__dirname, "..");
const DASHBOARD_DIR = path.join(ROOT_DIR, "dashboard");
const SHARED_DATA_DIR = path.join(ROOT_DIR, "data");
const LOCAL_DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const PORT = Number(process.env.PORT || 8787);

// Allowed browser origins for CORS. Locked to local dev by default; override in
// production with a comma-separated ALLOWED_ORIGINS env var (use "*" to allow
// any origin — not recommended outside local development).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

// How long an issued session token stays valid before the user must sign in
// again. Sessions survive a backend restart (persisted to disk) but expire.
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_HOURS || 168) * 60 * 60 * 1000;

// A visitor counts as "live" if the site sent a view/heartbeat within this
// window. Powers the real-time traffic figure on the dashboard.
const LIVE_WINDOW_MS = 60 * 1000;

const DEFAULT_ADMIN = {
  username: process.env.ADMIN_USERNAME || "admin",
  displayName: process.env.ADMIN_DISPLAY_NAME || "Primary Admin",
  password: process.env.ADMIN_PASSWORD || "BioTrend@Admin2026",
};

const FILES = {
  content: path.join(SHARED_DATA_DIR, "site-content.json"),
  defaultContent: path.join(SHARED_DATA_DIR, "default-site-content.json"),
  settings: path.join(SHARED_DATA_DIR, "site-settings.json"),
  defaultSettings: path.join(SHARED_DATA_DIR, "default-site-settings.json"),
  analytics: path.join(LOCAL_DATA_DIR, "analytics.json"),
  contact: path.join(LOCAL_DATA_DIR, "contact-submissions.json"),
  project: path.join(LOCAL_DATA_DIR, "project-submissions.json"),
  newsletter: path.join(LOCAL_DATA_DIR, "newsletter-signups.json"),
  users: path.join(LOCAL_DATA_DIR, "users.json"),
  audit: path.join(LOCAL_DATA_DIR, "audit-log.json"),
  sessions: path.join(LOCAL_DATA_DIR, "sessions.json"),
  blog: path.join(LOCAL_DATA_DIR, "blog-posts.json"),
};

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const sessions = new Map();

// visitorId -> last-seen epoch ms. In-memory only; drives the live visitor
// count. Ephemeral by design — a restart simply resets "who is online now".
const activeVisitors = new Map();

// Cumulative public site page views. Loaded from the analytics file on boot and
// kept in memory so the frequently-polled live endpoint avoids disk reads.
let siteViewsTotal = 0;

function buildDashboardSchema(role) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "content", label: "Content" },
    { id: "theme", label: "Theme" },
    { id: "assets", label: "Media & Forms" },
    { id: "analytics", label: "Analytics" },
  ];

  if (role === "admin") {
    tabs.push({ id: "team", label: "Team" });
  }

  tabs.push({ id: "submissions", label: "Submissions" });

  return {
    tabs,
    formTypes: ["contact", "project", "newsletter"],
    editableDataFiles: ["site-content.json", "site-settings.json"],
    capabilities: {
      canManageStaff: role === "admin",
      canViewTeamInsights: role === "admin",
    },
  };
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function createPasswordRecord(password, salt = crypto.randomBytes(16).toString("hex")) {
  return {
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString("hex"),
  };
}

function verifyPassword(password, user) {
  const hash = crypto.scryptSync(password, user.passwordSalt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function sanitizeUser(user) {
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

function createUserRecord({ username, displayName, password, role = "staff", createdBy = "system" }) {
  const passwordRecord = createPasswordRecord(password);
  return {
    id: randomId("usr"),
    username: normalizeUsername(username),
    displayName: String(displayName || username).trim(),
    role,
    passwordSalt: passwordRecord.salt,
    passwordHash: passwordRecord.hash,
    active: true,
    createdAt: nowIso(),
    createdBy,
    lastLoginAt: null,
  };
}

function baseAnalytics() {
  return {
    dashboardViews: 0,
    siteViews: 0,
    contentSaves: 0,
    settingsSaves: 0,
    formSubmissions: 0,
    teamChanges: 0,
    authLogins: 0,
    events: [],
    updatedAt: null,
  };
}

const MEDIA_EXTENSIONS = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-m4v": ".m4v",
};

function normalizeAnalytics(analytics) {
  return {
    ...baseAnalytics(),
    ...(analytics || {}),
    events: Array.isArray(analytics?.events) ? analytics.events : [],
  };
}

// --- Sessions: persisted to disk so a backend restart doesn't sign everyone
// out, with a TTL so tokens don't live forever. ------------------------------

function isSessionExpired(session) {
  const created = Date.parse(session?.createdAt || "");
  if (!Number.isFinite(created)) return true;
  return Date.now() - created > SESSION_TTL_MS;
}

async function persistSessions() {
  const serialized = [...sessions.entries()].map(([token, session]) => ({ token, ...session }));
  try {
    await writeJson(FILES.sessions, serialized);
  } catch {
    // Non-fatal: a missing sessions file just means logins reset on restart.
  }
}

async function loadSessions() {
  try {
    const stored = await readJson(FILES.sessions);
    if (Array.isArray(stored)) {
      for (const entry of stored) {
        if (entry?.token && !isSessionExpired(entry)) {
          const { token, ...session } = entry;
          sessions.set(token, session);
        }
      }
    }
  } catch {
    // No sessions file yet — start empty.
  }
  await persistSessions();
}

// --- Live traffic: real-time visitor + page-view figures. --------------------

function liveSnapshot() {
  const cutoff = Date.now() - LIVE_WINDOW_MS;
  let liveVisitors = 0;
  for (const [visitorId, lastSeen] of activeVisitors.entries()) {
    if (lastSeen >= cutoff) {
      liveVisitors += 1;
    } else {
      activeVisitors.delete(visitorId);
    }
  }
  return { siteViews: siteViewsTotal, liveVisitors, updatedAt: nowIso() };
}

async function recordSiteView() {
  siteViewsTotal += 1;
  try {
    const analytics = normalizeAnalytics(await readJson(FILES.analytics));
    analytics.siteViews = siteViewsTotal;
    analytics.updatedAt = nowIso();
    await writeJson(FILES.analytics, analytics);
  } catch {
    // Best-effort; the in-memory counter is still authoritative for /live.
  }
}

// --- Blog -------------------------------------------------------------------

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `post-${Date.now()}`;
}

function normalizeBlogPost(input, existing = {}) {
  const title = String(input.title ?? existing.title ?? "Untitled post").trim();
  const status = input.status === "published" ? "published" : "draft";
  const now = nowIso();
  const wasPublished = existing.status === "published";
  return {
    id: existing.id || randomId("post"),
    slug: slugify(input.slug || title || existing.slug),
    title,
    excerpt: String(input.excerpt ?? existing.excerpt ?? "").trim(),
    content: String(input.content ?? existing.content ?? "").trim(),
    coverImage: String(input.coverImage ?? existing.coverImage ?? "").trim(),
    author: String(input.author ?? existing.author ?? "Bio Trend Energy").trim(),
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => String(t).trim()).filter(Boolean)
      : Array.isArray(existing.tags)
      ? existing.tags
      : [],
    status,
    createdAt: existing.createdAt || now,
    updatedAt: now,
    publishedAt:
      status === "published"
        ? wasPublished
          ? existing.publishedAt || now
          : now
        : null,
  };
}

function publicBlogPost(post) {
  const { status, ...rest } = post;
  return rest;
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function validatePassword(value) {
  return typeof value === "string" && value.trim().length >= 8;
}

function resolveCorsOrigin(request) {
  const origin = request.headers.origin;
  if (ALLOWED_ORIGINS.includes("*")) return "*";
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return null;
}

function withCors(response) {
  // The per-request allowed origin is stamped onto the response in
  // requestHandler; only echo it back when the origin is on the allow list.
  const origin = response.__corsOrigin;
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
}

function sendJson(response, statusCode, payload) {
  withCors(response);
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(response, statusCode, text) {
  withCors(response);
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

async function ensureFile(filePath, fallback) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2));
  }
}

async function ensureStorage() {
  await ensureFile(FILES.analytics, baseAnalytics());
  await ensureFile(FILES.contact, []);
  await ensureFile(FILES.project, []);
  await ensureFile(FILES.newsletter, []);
  await ensureFile(FILES.audit, []);
  await ensureFile(FILES.users, [
    createUserRecord({
      username: DEFAULT_ADMIN.username,
      displayName: DEFAULT_ADMIN.displayName,
      password: DEFAULT_ADMIN.password,
      role: "admin",
    }),
  ]);
  await ensureFile(FILES.sessions, []);
  await ensureFile(FILES.blog, seedBlogPosts());
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  // Prime the in-memory live-view counter from whatever is on disk.
  try {
    const analytics = normalizeAnalytics(await readJson(FILES.analytics));
    siteViewsTotal = Number(analytics.siteViews) || 0;
  } catch {
    siteViewsTotal = 0;
  }
}

function seedBlogPosts() {
  const now = nowIso();
  return [
    {
      id: randomId("post"),
      slug: "turning-agricultural-waste-into-clean-power",
      title: "Turning Agricultural Waste Into Clean Power",
      excerpt:
        "How Bio Trend Energy converts crop residue that would otherwise be burned into dependable, low-carbon industrial fuel.",
      content:
        "Every harvest season, millions of tons of agricultural residue are burned in the open — releasing carbon and choking the air. At Bio Trend Energy we see that residue differently: as feedstock.\n\nOur biomass systems collect, dry and densify crop waste into high-calorific briquettes and pellets that replace imported coal in industrial boilers. The result is cheaper heat for our partners, cleaner air for surrounding communities, and a measurable cut in net emissions.\n\nThis is the circular economy in action: waste becomes fuel, fuel becomes power, and the by-products become biochar that enriches the soil for the next crop.",
      coverImage: "/assets/biomass-process.jpg",
      author: "Primary Admin",
      tags: ["Biomass", "Sustainability"],
      status: "published",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    },
    {
      id: randomId("post"),
      slug: "why-biogas-is-the-quiet-workhorse-of-renewables",
      title: "Why Biogas Is the Quiet Workhorse of Renewables",
      excerpt:
        "Solar and wind get the headlines, but biogas delivers round-the-clock renewable energy from waste streams communities already produce.",
      content:
        "Biogas rarely makes the front page, yet it solves a problem the flashier renewables can't: it runs day and night, regardless of weather.\n\nBy capturing methane from organic waste in sealed digesters, we turn a potent greenhouse gas into reliable baseload power and clean cooking fuel. For farms, food processors and municipalities, that means energy independence and a tidy answer to their waste-disposal costs.\n\nIn this post we walk through how a community-scale biogas plant is sized, built and maintained — and the returns partners can expect.",
      coverImage: "/assets/project-biogas.jpg",
      author: "Primary Admin",
      tags: ["Biogas", "Community"],
      status: "published",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    },
  ];
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function parseBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function actorFromUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

async function recordActivity(type, label, meta = {}, actor = null) {
  const [analyticsRaw, auditRaw] = await Promise.all([readJson(FILES.analytics), readJson(FILES.audit)]);
  const analytics = normalizeAnalytics(analyticsRaw);
  const audit = Array.isArray(auditRaw) ? auditRaw : [];

  const entry = {
    id: randomId("evt"),
    type,
    label,
    meta,
    actor: actorFromUser(actor),
    createdAt: nowIso(),
  };

  analytics.events = [entry, ...analytics.events].slice(0, 80);
  analytics.updatedAt = entry.createdAt;

  if (type === "dashboard-view") analytics.dashboardViews += 1;
  if (type === "content-save") analytics.contentSaves += 1;
  if (type === "settings-save") analytics.settingsSaves += 1;
  if (type === "form-submit") analytics.formSubmissions += 1;
  if (type === "auth-login") analytics.authLogins += 1;
  if (type === "team-user-create" || type === "team-user-update" || type === "team-user-remove") analytics.teamChanges += 1;

  const nextAudit = [entry, ...audit].slice(0, 500);

  await Promise.all([writeJson(FILES.analytics, analytics), writeJson(FILES.audit, nextAudit)]);
  return entry;
}

function getBearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function getSessionContext(request) {
  const token = getBearerToken(request);
  if (!token || !sessions.has(token)) return null;

  const session = sessions.get(token);

  if (isSessionExpired(session)) {
    sessions.delete(token);
    await persistSessions();
    return null;
  }

  const users = await readJson(FILES.users);
  const user = users.find((item) => item.id === session.userId && item.active);

  if (!user) {
    sessions.delete(token);
    await persistSessions();
    return null;
  }

  session.lastSeenAt = nowIso();
  return { token, session, user, users };
}

async function requireAuth(request, response) {
  const context = await getSessionContext(request);
  if (!context) {
    sendJson(response, 401, { error: "Unauthorized" });
    return null;
  }
  return context;
}

async function requireAdmin(request, response) {
  const context = await requireAuth(request, response);
  if (!context) return null;

  if (context.user.role !== "admin") {
    sendJson(response, 403, { error: "Admin access required" });
    return null;
  }

  return context;
}

async function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[extension] || "application/octet-stream";
  const file = await fs.readFile(filePath);
  response.writeHead(200, { "Content-Type": mimeType });
  response.end(file);
}

async function serveDashboard(requestPath, response) {
  const targetPath =
    requestPath === "/dashboard" || requestPath === "/dashboard/"
      ? path.join(DASHBOARD_DIR, "index.html")
      : path.join(DASHBOARD_DIR, requestPath.replace(/^\/dashboard\//, ""));

  const normalizedPath = path.normalize(targetPath);
  if (!normalizedPath.startsWith(DASHBOARD_DIR)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    await sendFile(response, normalizedPath);
  } catch {
    sendText(response, 404, "Dashboard asset not found");
  }
}

async function saveSubmission(type, payload, request) {
  const filePath = FILES[type];
  if (!filePath) {
    throw new Error(`Unsupported form type: ${type}`);
  }

  const submissions = await readJson(filePath);
  const record = {
    id: `${type}_${Date.now()}`,
    type,
    payload,
    ip: request.socket.remoteAddress,
    userAgent: request.headers["user-agent"] || "",
    createdAt: nowIso(),
  };

  submissions.unshift(record);
  await writeJson(filePath, submissions);
  await recordActivity("form-submit", `${type} form submitted`, { id: record.id, type }, null);
  return record;
}

function countEntries(entries, type) {
  return entries.filter((entry) => entry.type === type).length;
}

function sanitizeFileStem(name) {
  return String(name || "asset")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "asset";
}

function extensionFromUpload(fileName, mimeType) {
  const explicit = path.extname(String(fileName || "")).toLowerCase();
  if (/^\.(png|jpe?g|webp|gif|svg|mp4|mov|webm|m4v)$/.test(explicit)) {
    return explicit === ".jpeg" ? ".jpg" : explicit;
  }
  return MEDIA_EXTENSIONS[String(mimeType || "").toLowerCase()] || "";
}

async function saveUploadedMedia(body) {
  const fileName = String(body.fileName || "").trim();
  const mimeType = String(body.mimeType || "").trim().toLowerCase();
  const data = String(body.data || "");
  const match = data.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid media payload");
  }

  const extension = extensionFromUpload(fileName, mimeType || match[1]);
  if (!extension) {
    throw new Error("Unsupported media type");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) {
    throw new Error("Uploaded media is empty");
  }
  if (buffer.length > 80 * 1024 * 1024) {
    throw new Error("Uploaded media exceeds 80 MB");
  }

  const targetName = `${Date.now()}-${sanitizeFileStem(fileName)}${extension}`;
  const targetPath = path.join(UPLOADS_DIR, targetName);
  await fs.writeFile(targetPath, buffer);
  return `/uploads/${targetName}`;
}

function buildUsageSummary(users, audit) {
  return users
    .map((user) => {
      const entries = audit.filter((entry) => entry.actor?.id === user.id);
      return {
        user: sanitizeUser(user),
        metrics: {
          logins: countEntries(entries, "auth-login"),
          dashboardViews: countEntries(entries, "dashboard-view"),
          contentSaves: countEntries(entries, "content-save"),
          themeSaves: countEntries(entries, "settings-save"),
          teamChanges:
            countEntries(entries, "team-user-create") +
            countEntries(entries, "team-user-update") +
            countEntries(entries, "team-user-remove"),
          totalActions: entries.length,
        },
        lastActionAt: entries[0]?.createdAt ?? null,
      };
    })
    .sort((left, right) => String(right.lastActionAt || "").localeCompare(String(left.lastActionAt || "")));
}

async function buildAnalyticsSnapshot(currentUser) {
  const [content, settings, analyticsRaw, contact, project, newsletter, auditRaw, users] = await Promise.all([
    readJson(FILES.content),
    readJson(FILES.settings),
    readJson(FILES.analytics),
    readJson(FILES.contact),
    readJson(FILES.project),
    readJson(FILES.newsletter),
    readJson(FILES.audit),
    readJson(FILES.users),
  ]);

  const analytics = normalizeAnalytics(analyticsRaw);
  const audit = Array.isArray(auditRaw) ? auditRaw : [];
  const allSubmissions = [...contact, ...project, ...newsletter].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt))
  );

  const snapshot = {
    metrics: {
      dashboardViews: analytics.dashboardViews,
      siteViews: siteViewsTotal || analytics.siteViews || 0,
      liveVisitors: liveSnapshot().liveVisitors,
      contentSaves: analytics.contentSaves,
      settingsSaves: analytics.settingsSaves,
      formSubmissions: analytics.formSubmissions,
      teamChanges: analytics.teamChanges,
      navigationLinks: content.site.navigation.length,
      projectCards: content.pages.projects.items.length,
      heroMessages: content.hero.messages.length,
      themeTokenGroups: Object.keys(settings.themeTokens).length,
    },
    activity: analytics.events || [],
    submissions: {
      contactCount: contact.length,
      projectCount: project.length,
      newsletterCount: newsletter.length,
      latestSubmissionAt: allSubmissions[0]?.createdAt ?? null,
    },
    contentUpdatedAt: analytics.updatedAt,
  };

  if (currentUser.role === "admin") {
    snapshot.teamUsage = buildUsageSummary(users, audit);
    snapshot.changeHistory = audit.filter((entry) => entry.actor).slice(0, 120);
  } else {
    snapshot.personalUsage = buildUsageSummary([currentUser], audit)[0];
  }

  return snapshot;
}

async function buildTeamOverview() {
  const [users, auditRaw] = await Promise.all([readJson(FILES.users), readJson(FILES.audit)]);
  const audit = Array.isArray(auditRaw) ? auditRaw : [];

  return {
    users: buildUsageSummary(users, audit),
    changeHistory: audit.filter((entry) => entry.actor).slice(0, 140),
  };
}

function findUserByUsername(users, username) {
  const normalized = normalizeUsername(username);
  return users.find((user) => user.username === normalized);
}

function assertValidStaffPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }

  if (!normalizeUsername(payload.username)) {
    throw new Error("Username is required");
  }

  if (!String(payload.displayName || "").trim()) {
    throw new Error("Display name is required");
  }

  if (!validatePassword(payload.password)) {
    throw new Error("Password must be at least 8 characters");
  }
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, service: "bio-trend-backend", port: PORT });
    return;
  }

  // --- Real-time traffic (public, no auth) ---------------------------------
  if (request.method === "POST" && url.pathname === "/api/track/view") {
    const body = await parseBody(request).catch(() => ({}));
    const visitorId = String(body.visitorId || "").trim();
    if (visitorId) activeVisitors.set(visitorId, Date.now());
    await recordSiteView();
    sendJson(response, 200, { ok: true, ...liveSnapshot() });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/track/heartbeat") {
    const body = await parseBody(request).catch(() => ({}));
    const visitorId = String(body.visitorId || "").trim();
    if (visitorId) activeVisitors.set(visitorId, Date.now());
    sendJson(response, 200, { ok: true, ...liveSnapshot() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/analytics/live") {
    sendJson(response, 200, { ok: true, ...liveSnapshot() });
    return;
  }

  // --- Blog: public reads --------------------------------------------------
  if (request.method === "GET" && url.pathname === "/api/blog") {
    const posts = await readJson(FILES.blog);
    const published = (Array.isArray(posts) ? posts : [])
      .filter((post) => post.status === "published")
      .sort((a, b) => String(b.publishedAt || b.createdAt).localeCompare(String(a.publishedAt || a.createdAt)))
      .map(publicBlogPost);
    sendJson(response, 200, { posts: published });
    return;
  }

  // Admin listing (all statuses) — must be matched before the :slug route.
  if (request.method === "GET" && url.pathname === "/api/blog/all") {
    const context = await requireAuth(request, response);
    if (!context) return;
    const posts = await readJson(FILES.blog);
    const sorted = (Array.isArray(posts) ? posts : []).sort((a, b) =>
      String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt))
    );
    sendJson(response, 200, { posts: sorted });
    return;
  }

  if (request.method === "GET" && /^\/api\/blog\/[^/]+$/.test(url.pathname)) {
    const slug = decodeURIComponent(url.pathname.split("/").pop());
    const posts = await readJson(FILES.blog);
    const post = (Array.isArray(posts) ? posts : []).find(
      (item) => item.status === "published" && (item.slug === slug || item.id === slug)
    );
    if (!post) {
      sendJson(response, 404, { error: "Post not found" });
      return;
    }
    sendJson(response, 200, { post: publicBlogPost(post) });
    return;
  }

  // --- Blog: authenticated writes ------------------------------------------
  if (request.method === "POST" && url.pathname === "/api/blog") {
    const context = await requireAuth(request, response);
    if (!context) return;
    const body = await parseBody(request);
    if (!String(body.title || "").trim()) {
      sendJson(response, 400, { error: "Title is required" });
      return;
    }
    const posts = await readJson(FILES.blog);
    const list = Array.isArray(posts) ? posts : [];
    const post = normalizeBlogPost(body);
    if (list.some((item) => item.slug === post.slug)) {
      post.slug = `${post.slug}-${crypto.randomBytes(2).toString("hex")}`;
    }
    list.unshift(post);
    await writeJson(FILES.blog, list);
    await recordActivity("blog-create", `Blog post created: ${post.title}`, { id: post.id, status: post.status }, context.user);
    sendJson(response, 201, { ok: true, post });
    return;
  }

  if (request.method === "PUT" && /^\/api\/blog\/[^/]+$/.test(url.pathname)) {
    const context = await requireAuth(request, response);
    if (!context) return;
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const body = await parseBody(request);
    const posts = await readJson(FILES.blog);
    const list = Array.isArray(posts) ? posts : [];
    const index = list.findIndex((item) => item.id === id || item.slug === id);
    if (index === -1) {
      sendJson(response, 404, { error: "Post not found" });
      return;
    }
    const updated = normalizeBlogPost(body, list[index]);
    if (list.some((item, i) => i !== index && item.slug === updated.slug)) {
      updated.slug = `${updated.slug}-${crypto.randomBytes(2).toString("hex")}`;
    }
    list[index] = updated;
    await writeJson(FILES.blog, list);
    await recordActivity("blog-update", `Blog post updated: ${updated.title}`, { id: updated.id, status: updated.status }, context.user);
    sendJson(response, 200, { ok: true, post: updated });
    return;
  }

  if (request.method === "DELETE" && /^\/api\/blog\/[^/]+$/.test(url.pathname)) {
    const context = await requireAuth(request, response);
    if (!context) return;
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const posts = await readJson(FILES.blog);
    const list = Array.isArray(posts) ? posts : [];
    const target = list.find((item) => item.id === id || item.slug === id);
    if (!target) {
      sendJson(response, 404, { error: "Post not found" });
      return;
    }
    await writeJson(FILES.blog, list.filter((item) => item !== target));
    await recordActivity("blog-delete", `Blog post removed: ${target.title}`, { id: target.id }, context.user);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await parseBody(request);
    const users = await readJson(FILES.users);
    const user = findUserByUsername(users, body.username);

    if (!user || !user.active || !verifyPassword(String(body.password || ""), user)) {
      sendJson(response, 401, { error: "Invalid username or password" });
      return;
    }

    user.lastLoginAt = nowIso();
    await writeJson(FILES.users, users);

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, {
      userId: user.id,
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
    });
    await persistSessions();

    await recordActivity("auth-login", `${user.displayName} signed in`, {}, user);
    sendJson(response, 200, { ok: true, token, user: sanitizeUser(user) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    const context = await requireAuth(request, response);
    if (!context) return;

    sendJson(response, 200, { ok: true, user: sanitizeUser(context.user) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const context = await requireAuth(request, response);
    if (!context) return;

    sessions.delete(context.token);
    await persistSessions();
    await recordActivity("auth-logout", `${context.user.displayName} signed out`, {}, context.user);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/forms/")) {
    const type = url.pathname.split("/").pop();
    const body = await parseBody(request);
    const record = await saveSubmission(type, body, request);
    sendJson(response, 201, { ok: true, submission: record });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/dashboard/schema") {
    const context = await requireAuth(request, response);
    if (!context) return;

    sendJson(response, 200, {
      ...buildDashboardSchema(context.user.role),
      currentUser: sanitizeUser(context.user),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/content") {
    sendJson(response, 200, await readJson(FILES.content));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/content/defaults") {
    const context = await requireAuth(request, response);
    if (!context) return;

    sendJson(response, 200, await readJson(FILES.defaultContent));
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/content") {
    const context = await requireAuth(request, response);
    if (!context) return;

    const body = await parseBody(request);
    const nextContent = body.content ?? body;
    const meta = body.meta || {};

    await writeJson(FILES.content, nextContent);
    await recordActivity(
      "content-save",
      meta.reason === "reset-defaults" ? "Website content reset to defaults" : "Website content saved",
      meta,
      context.user
    );
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/settings") {
    sendJson(response, 200, await readJson(FILES.settings));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/settings/defaults") {
    const context = await requireAuth(request, response);
    if (!context) return;

    sendJson(response, 200, await readJson(FILES.defaultSettings));
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/settings") {
    const context = await requireAuth(request, response);
    if (!context) return;

    const body = await parseBody(request);
    const nextSettings = body.settings ?? body;
    const meta = body.meta || {};

    await writeJson(FILES.settings, nextSettings);
    await recordActivity(
      "settings-save",
      meta.reason === "reset-defaults" ? "Theme settings reset to defaults" : "Theme settings saved",
      meta,
      context.user
    );
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/analytics") {
    const context = await requireAuth(request, response);
    if (!context) return;

    sendJson(response, 200, await buildAnalyticsSnapshot(context.user));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/media/upload") {
    const context = await requireAuth(request, response);
    if (!context) return;

    const body = await parseBody(request);
    const assetPath = await saveUploadedMedia(body);
    await recordActivity(
      "media-upload",
      `Media uploaded: ${body.fileName || "asset"}`,
      { path: assetPath, mimeType: body.mimeType || null },
      context.user
    );
    sendJson(response, 201, { ok: true, path: assetPath });
    return;
  }

  if (request.method === "DELETE" && url.pathname === "/api/media") {
    const context = await requireAuth(request, response);
    if (!context) return;

    const body = await parseBody(request);
    const assetPath = String(body.path || "");

    // Only allow deleting files we actually saved to /uploads — never the
    // bundled /assets/* defaults shipped with the site.
    if (!assetPath.startsWith("/uploads/") || assetPath.includes("..")) {
      sendJson(response, 400, { error: "Only uploaded assets can be deleted" });
      return;
    }

    const targetPath = path.join(PUBLIC_DIR, assetPath);
    try {
      await fs.unlink(targetPath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        sendJson(response, 500, { error: "Could not delete file" });
        return;
      }
    }

    await recordActivity(
      "media-delete",
      `Media deleted: ${assetPath}`,
      { path: assetPath },
      context.user
    );
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/analytics/event") {
    const context = await requireAuth(request, response);
    if (!context) return;

    const body = await parseBody(request);
    await recordActivity(body.type || "custom", body.label || "Custom event", body.meta || {}, context.user);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/forms/submissions") {
    const context = await requireAuth(request, response);
    if (!context) return;

    const [contact, project, newsletter] = await Promise.all([
      readJson(FILES.contact),
      readJson(FILES.project),
      readJson(FILES.newsletter),
    ]);
    sendJson(response, 200, { contact, project, newsletter });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/team/overview") {
    const context = await requireAdmin(request, response);
    if (!context) return;

    sendJson(response, 200, await buildTeamOverview());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/team/users") {
    const context = await requireAdmin(request, response);
    if (!context) return;

    const body = await parseBody(request);
    assertValidStaffPayload(body);

    const users = await readJson(FILES.users);
    if (findUserByUsername(users, body.username)) {
      sendJson(response, 409, { error: "Username already exists" });
      return;
    }

    const user = createUserRecord({
      username: body.username,
      displayName: body.displayName,
      password: body.password,
      role: "staff",
      createdBy: context.user.username,
    });

    users.push(user);
    await writeJson(FILES.users, users);
    await recordActivity(
      "team-user-create",
      `Staff account created for ${user.displayName}`,
      { targetUserId: user.id, targetUsername: user.username },
      context.user
    );
    sendJson(response, 201, { ok: true, user: sanitizeUser(user) });
    return;
  }

  if (request.method === "PUT" && /^\/api\/team\/users\/[^/]+$/.test(url.pathname)) {
    const context = await requireAdmin(request, response);
    if (!context) return;

    const targetId = url.pathname.split("/").pop();
    const body = await parseBody(request);
    const users = await readJson(FILES.users);
    const target = users.find((user) => user.id === targetId);

    if (!target) {
      sendJson(response, 404, { error: "User not found" });
      return;
    }

    const nextUsername = normalizeUsername(body.username ?? target.username);
    if (!nextUsername) {
      sendJson(response, 400, { error: "Username is required" });
      return;
    }

    const existingUser = users.find((user) => user.id !== target.id && user.username === nextUsername);
    if (existingUser) {
      sendJson(response, 409, { error: "Username already exists" });
      return;
    }

    if (body.active === false && context.user.id === target.id) {
      sendJson(response, 400, { error: "You cannot disable your own account" });
      return;
    }

    target.username = nextUsername;
    target.displayName = String(body.displayName || target.displayName).trim() || target.displayName;
    if (typeof body.active === "boolean") {
      target.active = body.active;
    }

    const meta = {
      targetUserId: target.id,
      targetUsername: target.username,
      changedFields: [],
    };

    if (body.username != null) meta.changedFields.push("username");
    if (body.displayName != null) meta.changedFields.push("displayName");
    if (body.active != null) meta.changedFields.push("active");

    if (typeof body.password === "string" && body.password.trim()) {
      if (!validatePassword(body.password)) {
        sendJson(response, 400, { error: "Password must be at least 8 characters" });
        return;
      }

      const passwordRecord = createPasswordRecord(body.password.trim());
      target.passwordSalt = passwordRecord.salt;
      target.passwordHash = passwordRecord.hash;
      meta.changedFields.push("password");
    }

    await writeJson(FILES.users, users);
    await recordActivity(
      "team-user-update",
      `Credentials updated for ${target.displayName}`,
      meta,
      context.user
    );
    sendJson(response, 200, { ok: true, user: sanitizeUser(target) });
    return;
  }

  if (request.method === "DELETE" && /^\/api\/team\/users\/[^/]+$/.test(url.pathname)) {
    const context = await requireAdmin(request, response);
    if (!context) return;

    const targetId = url.pathname.split("/").pop();
    const users = await readJson(FILES.users);
    const target = users.find((user) => user.id === targetId);

    if (!target) {
      sendJson(response, 404, { error: "User not found" });
      return;
    }

    if (target.id === context.user.id) {
      sendJson(response, 400, { error: "You cannot remove your own account" });
      return;
    }

    if (target.role === "admin") {
      sendJson(response, 400, { error: "Admin accounts cannot be removed here" });
      return;
    }

    const nextUsers = users.filter((user) => user.id !== target.id);
    await writeJson(FILES.users, nextUsers);

    for (const [token, session] of sessions.entries()) {
      if (session.userId === target.id) {
        sessions.delete(token);
      }
    }
    await persistSessions();

    await recordActivity(
      "team-user-remove",
      `Staff account removed for ${target.displayName}`,
      { targetUserId: target.id, targetUsername: target.username },
      context.user
    );
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function requestHandler(request, response) {
  response.__corsOrigin = resolveCorsOrigin(request);
  withCors(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    if (url.pathname === "/dashboard" || url.pathname === "/dashboard/" || url.pathname.startsWith("/dashboard/")) {
      await serveDashboard(url.pathname, response);
      return;
    }

    if (url.pathname === "/") {
      sendJson(response, 200, {
        ok: true,
        message: "Backend online",
        dashboard: `http://127.0.0.1:${PORT}/dashboard`,
      });
      return;
    }

    sendText(response, 404, "Not found");
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Invalid JSON body" });
      return;
    }

    console.error(error);
    sendJson(response, 500, { error: error.message || "Internal server error" });
  }
}

async function start() {
  await ensureStorage();
  await loadSessions();
  const server = http.createServer(requestHandler);
  // Bind to 0.0.0.0 so hosting platforms (Render, Railway, Fly) can route
  // external traffic to the server. Override with HOST if needed.
  const HOST = process.env.HOST || "0.0.0.0";
  server.listen(PORT, HOST, () => {
    console.log(`Backend running on http://${HOST}:${PORT}`);
    console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(", ") || "(none)"}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
