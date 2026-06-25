
import { Router } from 'express';
import multer from 'multer';
import * as authController from '../controllers/authController.js';
import * as generateController from '../controllers/generateController.js';
import * as clientController from '../controllers/clientController.js';
import * as savedController from '../controllers/savedController.js';
import * as workspaceController from '../controllers/workspaceController.js';
import * as reviewController from '../controllers/reviewController.js';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = Router();
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Solo se aceptan archivos PDF'));
  },
});

// Auth & User Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleLogin);
router.get('/users', authenticateToken, authorizeRole(['ADMIN']), authController.getUsers);
router.delete('/users/:id', authenticateToken, authorizeRole(['ADMIN']), authController.deleteUser);

// Generation Routes
router.post('/generate', authenticateToken, generateController.generateCopy);
router.post('/generate/stream', authenticateToken, generateController.generateCopyStream);
router.post('/generate/channel', authenticateToken, generateController.regenerateChannel);
router.get('/generate/history', authenticateToken, generateController.listGenerationHistory);

// Client/Brand Routes
router.get('/clients', authenticateToken, clientController.getClients);
router.post('/clients', authenticateToken, authorizeRole(['ADMIN']), clientController.createClient);
router.put('/clients/:id', authenticateToken, authorizeRole(['ADMIN']), clientController.updateClient);
router.delete('/clients/:id', authenticateToken, authorizeRole(['ADMIN']), clientController.deleteClient);
router.post('/clients/:id/brand-guideline', authenticateToken, authorizeRole(['ADMIN']), pdfUpload.single('pdf'), clientController.uploadBrandGuideline);
router.post('/clients/:id/fingerprint', authenticateToken, authorizeRole(['ADMIN']), clientController.computeFingerprint);
router.post('/dna-profiles', authenticateToken, authorizeRole(['ADMIN']), clientController.saveDNAProfile);
router.post('/dna-profiles/:id/duplicate', authenticateToken, authorizeRole(['ADMIN']), clientController.duplicateDNAProfile);
router.put('/dna-profiles/:id', authenticateToken, authorizeRole(['ADMIN']), clientController.updateDNAProfile);
router.delete('/dna-profiles/:id', authenticateToken, authorizeRole(['ADMIN']), clientController.deleteDNAProfile);

// Saved Variations & Projects
router.get('/saved', authenticateToken, savedController.getSavedVariations);
router.post('/saved', authenticateToken, savedController.saveVariation);
router.put('/saved/:id', authenticateToken, savedController.updateVariation);
router.delete('/saved/:id', authenticateToken, savedController.deleteVariation);
router.get('/projects', authenticateToken, savedController.getProjects);
router.post('/projects', authenticateToken, savedController.createProject);
router.delete('/projects/:id', authenticateToken, savedController.deleteProject);
router.post('/feedback/negative', authenticateToken, savedController.saveNegativeFeedback);

// Workspace AI Config (admin only)
router.get('/workspace/ai-config', authenticateToken, authorizeRole(['ADMIN']), workspaceController.getWorkspaceAIConfig);
router.put('/workspace/ai-config', authenticateToken, authorizeRole(['ADMIN']), workspaceController.updateWorkspaceAIConfig);

// Analytics (ADMIN)
router.get('/analytics', authenticateToken, authorizeRole(['ADMIN']), analyticsController.getAnalytics);

// Review Sessions (ADMIN — protegidas)
router.get('/review-sessions', authenticateToken, authorizeRole(['ADMIN']), reviewController.listReviewSessions);
router.post('/review-sessions', authenticateToken, authorizeRole(['ADMIN']), reviewController.createReviewSession);
router.delete('/review-sessions/:id', authenticateToken, authorizeRole(['ADMIN']), reviewController.deleteReviewSession);

// Review Public (sin auth — acceso por token UUID)
router.get('/review/public/:token', reviewController.getReviewByToken);
router.post('/review/public/:token/submit', reviewController.submitReview);

export default router;
