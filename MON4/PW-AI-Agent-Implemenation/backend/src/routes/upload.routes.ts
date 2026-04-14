import { Router } from 'express';
import multer from 'multer';
import { uploadCsv } from '../controllers/upload.controller';

const router = Router();

// Multer config — store file in memory buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * POST /api/upload
 * Upload a CSV file containing test cases.
 */
router.post('/', upload.single('file'), uploadCsv);

export default router;
