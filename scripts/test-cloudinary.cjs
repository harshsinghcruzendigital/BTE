require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function main() {
  console.log('Testing Cloudinary credentials for cloud:', process.env.CLOUDINARY_CLOUD_NAME);
  const result = await cloudinary.uploader.upload('public/assets/bio-trend-logo.png', {
    folder: 'bte-media',
    public_id: 'test-logo'
  });
  console.log('✓ Successfully uploaded image to Cloudinary!');
  console.log('Secure URL:', result.secure_url);
}

main().catch(console.error);
