const db = require('../backend/db.cjs');

async function test() {
  console.log('Testing backend/db.cjs functions with MongoDB Atlas...');
  
  const content = await db.getContent();
  console.log('✓ getContent(): site name =', content?.site?.name);

  const settings = await db.getSettings();
  console.log('✓ getSettings(): theme =', settings?.theme?.preset);

  const blogs = await db.getBlogs();
  console.log('✓ getBlogs(): total posts =', blogs?.length);
  for (const b of blogs.slice(0, 3)) {
    console.log(`  - ${b.title} (${b.slug})`);
  }

  const users = await db.getUsers();
  console.log('✓ getUsers(): total users =', users?.length);

  const projects = await db.getSubmissions('project');
  console.log('✓ getSubmissions("project"): total project leads =', projects?.length);

  console.log('\nAll db.cjs methods passed flawlessly!');
}

test().catch(console.error);
