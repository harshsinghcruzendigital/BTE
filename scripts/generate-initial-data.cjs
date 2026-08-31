const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'api', 'data');
const content = JSON.parse(fs.readFileSync(path.join(dataDir, 'site-content.json'), 'utf8'));
const settings = JSON.parse(fs.readFileSync(path.join(dataDir, 'site-settings.json'), 'utf8'));
const blogs = JSON.parse(fs.readFileSync(path.join(dataDir, 'blog-posts.json'), 'utf8'));
const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
const projects = JSON.parse(fs.readFileSync(path.join(dataDir, 'project-submissions.json'), 'utf8'));
const contacts = JSON.parse(fs.readFileSync(path.join(dataDir, 'contact-submissions.json'), 'utf8'));

const out = `// Bundled initial dataset for zero-latency serverless fallback
module.exports = {
  content: ${JSON.stringify(content, null, 2)},
  settings: ${JSON.stringify(settings, null, 2)},
  blogs: ${JSON.stringify(blogs, null, 2)},
  users: ${JSON.stringify(users, null, 2)},
  projects: ${JSON.stringify(projects, null, 2)},
  contacts: ${JSON.stringify(contacts, null, 2)},
};
`;

fs.writeFileSync(path.join(dataDir, 'initial-data.cjs'), out, 'utf8');
console.log('Successfully generated api/data/initial-data.cjs');
