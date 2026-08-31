require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const { MongoClient } = require('mongodb');
const fs = require('fs/promises');
const path = require('path');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log('✓ Successfully connected to MongoDB Atlas!');
    const db = client.db('bte');

    // 1. Migrate site-content.json
    try {
      const contentRaw = await fs.readFile(path.join(__dirname, '..', 'data', 'site-content.json'), 'utf8');
      const content = JSON.parse(contentRaw);
      await db.collection('content').updateOne(
        { key: 'site_content' },
        { $set: { key: 'site_content', ...content, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log('✓ Site content migrated to MongoDB collection "content"');
    } catch (e) {
      console.error('Error migrating site-content:', e.message);
    }

    // 2. Migrate site-settings.json
    try {
      const settingsRaw = await fs.readFile(path.join(__dirname, '..', 'data', 'site-settings.json'), 'utf8');
      const settings = JSON.parse(settingsRaw);
      await db.collection('settings').updateOne(
        { key: 'site_settings' },
        { $set: { key: 'site_settings', ...settings, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log('✓ Site settings migrated to MongoDB collection "settings"');
    } catch (e) {
      console.error('Error migrating site-settings:', e.message);
    }

    // 3. Migrate blog-posts.json
    try {
      const blogsRaw = await fs.readFile(path.join(__dirname, '..', 'backend', 'data', 'blog-posts.json'), 'utf8');
      const blogs = JSON.parse(blogsRaw);
      if (Array.isArray(blogs)) {
        for (const blog of blogs) {
          const filter = blog.id ? { id: blog.id } : { slug: blog.slug };
          await db.collection('blogs').updateOne(
            filter,
            { $set: { ...blog, updatedAt: new Date() } },
            { upsert: true }
          );
        }
        console.log(`✓ Migrated ${blogs.length} blog posts to MongoDB collection "blogs"`);
      }
    } catch (e) {
      console.error('Error migrating blog posts:', e.message);
    }

    // 4. Migrate users.json
    try {
      const usersRaw = await fs.readFile(path.join(__dirname, '..', 'backend', 'data', 'users.json'), 'utf8');
      const users = JSON.parse(usersRaw);
      if (Array.isArray(users)) {
        for (const user of users) {
          await db.collection('users').updateOne(
            { username: user.username },
            { $set: { ...user, updatedAt: new Date() } },
            { upsert: true }
          );
        }
        console.log(`✓ Migrated ${users.length} admin user(s) to MongoDB collection "users"`);
      }
    } catch (e) {
      console.error('Error migrating users:', e.message);
    }

    // 5. Migrate form leads if they exist
    for (const [file, coll] of [
      ['contact-submissions.json', 'contacts'],
      ['project-submissions.json', 'projects'],
      ['newsletter-signups.json', 'newsletters'],
    ]) {
      try {
        const filePath = path.join(__dirname, '..', 'backend', 'data', file);
        const dataRaw = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(dataRaw);
        if (Array.isArray(data) && data.length > 0) {
          for (const item of data) {
            await db.collection(coll).updateOne(
              { id: item.id || item.email },
              { $set: { ...item } },
              { upsert: true }
            );
          }
          console.log(`✓ Migrated ${data.length} records into collection "${coll}"`);
        }
      } catch (e) {
        // file might be empty or not exist
      }
    }

    console.log('\nAll data migration to MongoDB Atlas completed successfully!');
  } finally {
    await client.close();
  }
}

main().catch(console.error);
