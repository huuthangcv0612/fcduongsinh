const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'transfleet',
  api_key: process.env.CLOUDINARY_API_KEY || '442949286875372',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'XIMARFfRMytzRjQhd2JaxNq7Zhg'
});

async function uploadImage(fileData, folder = 'fc_nhatre_avatars') {
  try {
    const result = await cloudinary.uploader.upload(fileData, {
      folder,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });
    return result.secure_url;
  } catch (err) {
    console.error('❌ Cloudinary Upload Error:', err.message);
    throw err;
  }
}

async function uploadMedia(fileData, folder = 'fc_nhatre_media') {
  try {
    const result = await cloudinary.uploader.upload(fileData, {
      folder,
      resource_type: 'auto', // supports image or video
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });
    return result.secure_url;
  } catch (err) {
    console.error('❌ Cloudinary Media Upload Error:', err.message);
    throw err;
  }
}

async function uploadProofImage(fileData, folder = 'fc_nhatre_bills') {
  try {
    const result = await cloudinary.uploader.upload(fileData, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });
    return result.secure_url;
  } catch (err) {
    console.error('❌ Cloudinary Proof Upload Error:', err.message);
    throw err;
  }
}

module.exports = {
  uploadImage,
  uploadMedia,
  uploadProofImage
};
