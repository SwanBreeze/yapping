/**
 * uploadController.js — Handles file upload HTTP requests
 */

const path = require('path');

/**
 * POST /api/upload
 * Body: multipart/form-data with field "file"
 * Returns: { url, name, size, mimeType }
 */
const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const { file } = req;

  // Determine subdirectory from mimetype
  let subDir = 'files';
  if (file.mimetype.startsWith('image/')) subDir = 'images';
  if (file.mimetype.startsWith('audio/')) subDir = 'audio';

  // Build the public URL that the static file server will serve
  const publicUrl = `${process.env.SERVER_URL || 'http://localhost:3001'}/uploads/${subDir}/${file.filename}`;

  res.json({
    url: publicUrl,
    name: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  });
};

module.exports = { uploadFile };
