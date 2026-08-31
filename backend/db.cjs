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

const ROOT_DIR = path.resolve(__dirname, "..");
const SHARED_DATA_DIR = path.join(ROOT_DIR, "data");
const LOCAL_DATA_DIR = path.join(__dirname, "data");

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

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const mongoUri = process.env.MONGODB_URI;
let client = null;
let db = null;
let isConnected = false;

async function getDb() {
  if (db && isConnected) return db;
  if (!mongoUri) return null;
  try {
    if (!client) {
      client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 8000 });
    }
    await client.connect();
    db = client.db("bte");
    isConnected = true;
    return db;
  } catch (err) {
    console.warn("MongoDB connection warning:", err.message);
    isConnected = false;
    return null;
  }
}

// Local file helpers for fallback
async function readFallbackJson(filePath) {
  try {
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
  return (await readFallbackJson(FILES.content)) || (await readFallbackJson(FILES.defaultContent));
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
  return (await readFallbackJson(FILES.settings)) || (await readFallbackJson(FILES.defaultSettings));
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
    return list.map(({ _id, ...rest }) => rest);
  }
  return (await readFallbackJson(FILES.blog)) || [];
}

async function saveBlogList(list) {
  const database = await getDb();
  if (database && Array.isArray(list)) {
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
  return (await readFallbackJson(FILES.users)) || [];
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
  const filePath = FILES[type] || FILES.contact;
  const database = await getDb();
  if (database) {
    const list = await database.collection(collName).find({}).sort({ createdAt: -1 }).toArray();
    return list.map(({ _id, ...rest }) => rest);
  }
  return (await readFallbackJson(filePath)) || [];
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
