require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('bte');
  const collections = await db.listCollections().toArray();
  console.log('Collections in database "bte":');
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`- ${c.name}: ${count} document(s)`);
  }
  const blogs = await db.collection('blogs').find({}).toArray();
  console.log('Sample blog post:', blogs[0]?.title, 'status:', blogs[0]?.status);
  await client.close();
}

main().catch(console.error);
