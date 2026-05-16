const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/uploadMiddleware');
const { uploadFile } = require('../controllers/uploadController');

// POST /api/upload — multer processes the 'file' field, then controller responds
router.post('/', upload.single('file'), uploadFile);

module.exports = router;
