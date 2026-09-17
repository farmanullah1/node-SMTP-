import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getImageKitClient, getImageKitConfigSummary } from '../config/imagekit.js';

const router = express.Router();

// 10MB memory upload limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * GET /api/media/health
 * Returns ImageKit configuration status.
 */
router.get('/health', (req, res) => {
  const config = getImageKitConfigSummary();
  res.status(200).json({
    success: config.configured,
    message: config.configured
      ? 'ImageKit is configured and ready.'
      : 'ImageKit credentials are not configured in .env',
    data: config,
  });
});

/**
 * POST /api/media/upload
 * Uploads an image or document to ImageKit CDN.
 * Accepts multipart/form-data with field: 'file' and optional 'folder'.
 */
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    const err = new Error("A file is required in multipart field 'file'.");
    err.status = 400;
    throw err;
  }

  const client = getImageKitClient();
  if (!client) {
    const err = new Error('ImageKit client is not configured. Please set IMAGEKIT keys in .env.');
    err.status = 500;
    throw err;
  }

  const folder = req.body.folder || '/lab-uploads';
  const fileName = req.body.fileName || `${Date.now()}_${req.file.originalname}`;

  const response = await client.upload({
    file: req.file.buffer.toString('base64'),
    fileName,
    folder,
    useUniqueFileName: true,
  });

  res.status(200).json({
    success: true,
    message: 'File uploaded to ImageKit CDN successfully.',
    data: {
      fileId: response.fileId,
      name: response.name,
      url: response.url,
      thumbnailUrl: response.thumbnailUrl,
      size: response.size,
      filePath: response.filePath,
    },
  });
}));

export default router;
