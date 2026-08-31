"use strict";

require("dotenv").config();

const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const { MongoClient } = require("mongodb");
const cloudinary = require("cloudinary").v2;
const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

const FILES = {
  content: path.join(DATA_DIR, "site-content.json"),
  defaultContent: path.join(DATA_DIR, "default-site-content.json"),
  settings: path.join(DATA_DIR, "site-settings.json"),
  defaultSettings: path.join(DATA_DIR, "default-site-settings.json"),
  analytics: path.join(DATA_DIR, "analytics.json"),
  contact: path.join(DATA_DIR, "contact-submissions.json"),
  project: path.join(DATA_DIR, "project-submissions.json"),
  newsletter: path.join(DATA_DIR, "newsletter-signups.json"),
  users: path.join(DATA_DIR, "users.json"),
  audit: path.join(DATA_DIR, "audit-log.json"),
  sessions: path.join(DATA_DIR, "sessions.json"),
  blog: path.join(DATA_DIR, "blog-posts.json"),
};

const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").replace(/^["']|["']$/g, "").trim();
const cloudApiKey = (process.env.CLOUDINARY_API_KEY || "").replace(/^["']|["']$/g, "").trim();
const cloudApiSecret = (process.env.CLOUDINARY_API_SECRET || "").replace(/^["']|["']$/g, "").trim();
const mongoUri = (process.env.MONGODB_URI || "").replace(/^["']|["']$/g, "").trim();

// Configure Cloudinary
if (cloudName && cloudApiKey && cloudApiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: cloudApiKey,
    api_secret: cloudApiSecret,
    secure: true,
  });
}
let client = null;
let db = null;
let isConnected = false;

async function getDb() {
  if (db && isConnected) return db;
  if (!mongoUri) {
    console.log("getDb: mongoUri is empty!");
    return null;
  }
  try {
    if (!client) {
      console.log("getDb: creating MongoClient with uri:", mongoUri ? mongoUri.replace(/:([^:@]+)@/, ":****@") : "none");
      client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 8000 });
    }
    await client.connect();
    db = client.db("bte");
    isConnected = true;
    console.log("getDb: connected successfully to bte!");
    return db;
  } catch (err) {
    console.warn("MongoDB connection warning:", err.message);
    isConnected = false;
    return null;
  }
}

let initialData = {};
try {
  initialData = require("./initial-data.cjs");
} catch (e) {
  console.warn("Could not load initial-data.cjs:", e.message);
}

function getFallback(key) {
  if (key === "content") return initialData.content ? JSON.parse(JSON.stringify(initialData.content)) : null;
  if (key === "settings") return initialData.settings ? JSON.parse(JSON.stringify(initialData.settings)) : null;
  if (key === "blog") return initialData.blogs ? JSON.parse(JSON.stringify(initialData.blogs)) : [];
  if (key === "users") return initialData.users ? JSON.parse(JSON.stringify(initialData.users)) : [];
  if (key === "project") return initialData.projects ? JSON.parse(JSON.stringify(initialData.projects)) : [];
  if (key === "contact") return initialData.contacts ? JSON.parse(JSON.stringify(initialData.contacts)) : [];
  return null;
}

// Local file helpers for fallback
async function readFallbackJson(filePath) {
  try {
    const base = path.basename(filePath);
    if (base === "site-content.json") return getFallback("content") || getFallback("defaultContent");
    if (base === "site-settings.json") return getFallback("settings") || getFallback("defaultSettings");
    if (base === "blog-posts.json") return getFallback("blog") || [];
    if (base === "users.json") return getFallback("users") || [];
    if (base === "contact-submissions.json") return getFallback("contact") || [];
    if (base === "project-submissions.json") return getFallback("project") || [];
    if (base === "newsletter-signups.json") return getFallback("newsletter") || [];
    if (base === "analytics.json") return getFallback("analytics");
    if (base === "audit-log.json") return getFallback("audit") || [];

    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function writeFallbackJson(filePath, value) {
  try {
    await fs.writeFile(filePath, JSON.stringify(value, null, 2));
  } catch (e) {
    // Ignore fallback disk write errors in serverless environments
  }
}

// --- Content ---
async function getContent() {
  const database = await getDb();
  if (database) {
    const doc = await database.collection("content").findOne({ key: "site_content" });
    if (doc) {
      const { _id, key, ...rest } = doc;
      return rest;
    }
  }
  return getFallback("content") || getFallback("defaultContent");
}

async function saveContent(data) {
  const database = await getDb();
  if (database) {
    await database.collection("content").updateOne(
      { key: "site_content" },
      { $set: { key: "site_content", ...data, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }
  await writeFallbackJson(FILES.content, data);
  return data;
}

// --- Settings ---
async function getSettings() {
  const database = await getDb();
  if (database) {
    const doc = await database.collection("settings").findOne({ key: "site_settings" });
    if (doc) {
      const { _id, key, ...rest } = doc;
      return rest;
    }
  }
  return getFallback("settings") || getFallback("defaultSettings");
}

async function saveSettings(data) {
  const database = await getDb();
  if (database) {
    await database.collection("settings").updateOne(
      { key: "site_settings" },
      { $set: { key: "site_settings", ...data, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }
  await writeFallbackJson(FILES.settings, data);
  return data;
}

// --- Blog Posts ---
async function getBlogs() {
  const database = await getDb();
  if (database) {
    const list = await database.collection("blogs").find({}).toArray();
    console.log("getBlogs: found", list.length, "blogs in MongoDB");
    if (list.length > 0) return list.map(({ _id, ...rest }) => rest);
  }
  console.log("getBlogs: no database/empty, falling back to static fallback");
  return getFallback("blog") || [];
}

async function saveBlogList(list) {
  const database = await getDb();
  if (database && Array.isArray(list)) {
    const currentIds = list.map((p) => p.id).filter(Boolean);
    if (currentIds.length > 0) {
      await database.collection("blogs").deleteMany({ id: { $nin: currentIds } });
    } else {
      await database.collection("blogs").deleteMany({});
    }
    for (const post of list) {
      await database.collection("blogs").updateOne(
        { id: post.id },
        { $set: { ...post, updatedAt: post.updatedAt || new Date().toISOString() } },
        { upsert: true }
      );
    }
  }
  await writeFallbackJson(FILES.blog, list);
}

async function deleteBlogPost(id) {
  const database = await getDb();
  if (database) {
    await database.collection("blogs").deleteOne({ id });
  }
  const current = (await readFallbackJson(FILES.blog)) || [];
  const next = current.filter((p) => p.id !== id);
  await writeFallbackJson(FILES.blog, next);
}

// --- Users ---
async function getUsers() {
  const database = await getDb();
  if (database) {
    const list = await database.collection("users").find({}).toArray();
    if (list.length > 0) return list.map(({ _id, ...rest }) => rest);
  }
  return getFallback("users") || [];
}

async function saveUsers(users) {
  const database = await getDb();
  if (database && Array.isArray(users)) {
    await database.collection("users").deleteMany({});
    if (users.length > 0) {
      await database.collection("users").insertMany(users);
    }
  }
  await writeFallbackJson(FILES.users, users);
}

// --- Submissions (Contacts, Projects, Newsletters) ---
async function getSubmissions(type) {
  const collName = type === "contact" ? "contacts" : type === "project" ? "projects" : "newsletters";
  const database = await getDb();
  if (database) {
    const list = await database.collection(collName).find({}).sort({ createdAt: -1 }).toArray();
    if (list.length > 0) return list.map(({ _id, ...rest }) => rest);
  }
  return getFallback(type) || [];
}

async function saveSubmissions(type, list) {
  const collName = type === "contact" ? "contacts" : type === "project" ? "projects" : "newsletters";
  const filePath = FILES[type] || FILES.contact;
  const database = await getDb();
  if (database && Array.isArray(list)) {
    for (const item of list) {
      const filter = item.id ? { id: item.id } : { email: item.email };
      await database.collection(collName).updateOne(filter, { $set: item }, { upsert: true });
    }
  }
  await writeFallbackJson(filePath, list);
}

// --- Analytics & Audit ---
async function getAnalytics() {
  const database = await getDb();
  if (database) {
    const doc = await database.collection("analytics").findOne({ key: "analytics" });
    if (doc) {
      const { _id, key, ...rest } = doc;
      return rest;
    }
  }
  return await readFallbackJson(FILES.analytics);
}

async function saveAnalytics(data) {
  const database = await getDb();
  if (database) {
    await database.collection("analytics").updateOne(
      { key: "analytics" },
      { $set: { key: "analytics", ...data } },
      { upsert: true }
    );
  }
  await writeFallbackJson(FILES.analytics, data);
}

async function getAudit() {
  const database = await getDb();
  if (database) {
    const list = await database.collection("audit").find({}).sort({ createdAt: -1 }).limit(500).toArray();
    if (list.length > 0) return list.map(({ _id, ...rest }) => rest);
  }
  return (await readFallbackJson(FILES.audit)) || [];
}

async function saveAudit(auditList) {
  const database = await getDb();
  if (database && Array.isArray(auditList)) {
    if (auditList.length > 0) {
      const latest = auditList[0];
      if (latest && latest.id) {
        await database.collection("audit").updateOne({ id: latest.id }, { $set: latest }, { upsert: true });
      }
    }
  }
  await writeFallbackJson(FILES.audit, auditList);
}

// --- Cloudinary Upload & Delete Helpers ---
async function uploadToCloudinary(dataUri, fileName) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary credentials are not configured");
  }
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "bte-media",
    public_id: `${Date.now()}-${String(fileName || "asset").replace(/[^a-zA-Z0-9_-]/g, "_")}`,
    resource_type: "auto",
  });
  return result.secure_url;
}

async function deleteFromCloudinary(urlOrPublicId) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return false;
  try {
    let publicId = urlOrPublicId;
    if (urlOrPublicId.includes("cloudinary.com")) {
      const match = urlOrPublicId.match(/\/bte-media\/([^.]+)/);
      if (match) publicId = `bte-media/${match[1]}`;
    }
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getContent,
  saveContent,
  getSettings,
  saveSettings,
  getBlogs,
  saveBlogList,
  deleteBlogPost,
  getUsers,
  saveUsers,
  getSubmissions,
  saveSubmissions,
  getAnalytics,
  saveAnalytics,
  getAudit,
  saveAudit,
  uploadToCloudinary,
  deleteFromCloudinary,
};
