/**
 * uploadMiddleware.js — File Upload Configuration using Multer
 *
 * Multer is an Express middleware that handles multipart/form-data,
 * which is the encoding type used when uploading files via HTML forms
 * or the Fetch API with FormData.
 *
 * HOW FILE UPLOAD WORKS IN THIS APP:
 * ────────────────────────────────────
 * 1. Client selects a file (image, audio, document)
 * 2. Client sends POST /api/upload with FormData containing the file
 * 3. Multer intercepts the request, saves the file to disk
 * 4. The controller responds with the public URL of the saved file
 * 5. Client emits a socket event 'message:file' with that URL
 * 6. Server stores the message and broadcasts it to the room
 *
 * Keeping the upload on HTTP (not WebSocket) is deliberate:
 * - HTTP supports streaming & progress events natively
 * - Socket.IO payloads have a 10MB limit; large files would break it
 * - HTTP upload is resumable with the right client implementation
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ─── STORAGE CONFIGURATION ────────────────────────────────────────────────

/**
 * diskStorage lets us control WHERE and HOW files are named.
 * We sort files into subdirectories by type for easy management.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'files';

    if (file.mimetype.startsWith('image/'))  subDir = 'images';
    if (file.mimetype.startsWith('audio/'))  subDir = 'audio';

    const dir = path.join(__dirname, '..', 'uploads', subDir);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // uuid ensures unique filenames; we preserve the original extension
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// ─── FILE FILTER ──────────────────────────────────────────────────────────

const allowedTypes = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  // Audio (browser MediaRecorder produces webm/ogg/mp4)
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/mp4',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// ─── EXPORT MULTER INSTANCE ───────────────────────────────────────────────

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max per file
  },
});

module.exports = { upload };
