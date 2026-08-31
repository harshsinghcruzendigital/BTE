const db = require('../backend/db.cjs');

async function test() {
  const blogs = await db.getBlogs();
  console.log('Total blogs:', blogs.length);
  for (const b of blogs) {
    console.log(`- Title: ${b.title}, Status: "${b.status}", PublishedAt: ${b.publishedAt}`);
  }
}

test().catch(console.error);
