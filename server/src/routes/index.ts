import { Router } from 'express';
import multer from 'multer';
import * as authController from '../controllers/authController.js';
import * as generateController from '../controllers/generateController.js';
import * as clientController from '../controllers/clientController.js';
import * as savedController from '../controllers/savedController.js';
import * as workspaceController from '../controllers/workspaceController.js';
import * as reviewController from '../controllers/reviewController.js';
import * as analyticsController from '../controllers/analyticsController.js';
import * as presetController from '../controllers/presetController.js';
import * as refineController from '../controllers/refineController.js';
import { authenticateToken, requireWorkspace, requireManager } from '../middleware/auth.js';

const router = Router();
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Solo se aceptan archivos PDF'));
  },
});

/**
 * Tres niveles de acceso, y toda ruta autenticada usa al menos el segundo:
 *
 *   authenticateToken  — hay un usuario válido detrás del token.
 *   requireWorkspace   — ese usuario tiene membresía en el workspace activo.
 *                        Deja `req.tenant` verificado contra la base.
 *   requireManager     — además es OWNER o ADMIN de ese workspace.
 *
 * Una ruta con `authenticateToken` a secas solo puede tocar datos del propio
 * usuario (sesión, lista de sus workspaces). Todo lo que toque datos de negocio
 * pasa por requireWorkspace.
 */
const authed = [authenticateToken] as const;
const inWorkspace = [authenticateToken, requireWorkspace] as const;
const asManager = [authenticateToken, requireWorkspace, requireManager] as const;

// ------------------------------------------------------------------- sesión
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleLogin);
router.get('/auth/me', ...authed, authController.me);
router.post('/auth/switch-workspace', ...authed, authController.switchWorkspace);

// --------------------------------------------------------------- workspaces
router.get('/workspaces', ...authed, workspaceController.listMyWorkspaces);
router.post('/workspaces', ...authed, workspaceController.createWorkspace);
router.get('/workspace/ai-config', ...asManager, workspaceController.getWorkspaceAIConfig);
router.put('/workspace/ai-config', ...asManager, workspaceController.updateWorkspaceAIConfig);

// ------------------------------------------------------- miembros e invitaciones
// `/users` se mantiene como alias del listado de miembros para no romper el
// frontend; opera siempre sobre el workspace activo.
router.get('/users', ...inWorkspace, workspaceController.listMembers);
router.get('/workspace/members', ...inWorkspace, workspaceController.listMembers);
router.put('/workspace/members/:userId', ...asManager, workspaceController.updateMemberRole);
router.delete('/workspace/members/:userId', ...asManager, workspaceController.removeMember);
router.get('/workspace/invites', ...asManager, workspaceController.listInvites);
router.post('/workspace/invites', ...asManager, workspaceController.createInvite);
router.delete('/workspace/invites/:id', ...asManager, workspaceController.revokeInvite);

// ------------------------------------------------------------------ generación
router.post('/generate', ...inWorkspace, generateController.generateCopy);
router.post('/generate/stream', ...inWorkspace, generateController.generateCopyStream);
router.post('/generate/channel', ...inWorkspace, generateController.regenerateChannel);
router.get('/generate/history', ...inWorkspace, generateController.listGenerationHistory);
router.post('/copy/refine', ...inWorkspace, refineController.refineVariations);

// ---------------------------------------------------------- marcas y briefs
router.get('/clients', ...inWorkspace, clientController.getClients);
router.post('/clients', ...asManager, clientController.createClient);
router.put('/clients/:id', ...asManager, clientController.updateClient);
router.delete('/clients/:id', ...asManager, clientController.deleteClient);
router.post('/clients/:id/brand-guideline', ...asManager, pdfUpload.single('pdf'), clientController.uploadBrandGuideline);
router.delete('/clients/:id/brand-guideline', ...asManager, clientController.deleteBrandGuideline);
router.post('/clients/:id/fingerprint', ...asManager, clientController.computeFingerprint);
router.post('/dna-profiles', ...asManager, clientController.saveDNAProfile);
router.post('/dna-profiles/:id/duplicate', ...asManager, clientController.duplicateDNAProfile);
router.put('/dna-profiles/:id', ...asManager, clientController.updateDNAProfile);
router.delete('/dna-profiles/:id', ...asManager, clientController.deleteDNAProfile);
router.get('/dna-profiles/:id/insights', ...inWorkspace, clientController.getDNAInsights);

// -------------------------------------------------------------------- presets
router.get('/presets', ...inWorkspace, presetController.listPresets);
router.post('/presets', ...inWorkspace, presetController.createPreset);
router.delete('/presets/:id', ...asManager, presetController.deletePreset);

// ---------------------------------------------------------------- biblioteca
router.get('/saved', ...inWorkspace, savedController.getSavedVariations);
router.post('/saved', ...inWorkspace, savedController.saveVariation);
// POST /saved/bulk-delete va antes que DELETE /saved/:id para evitar el choque de rutas.
router.post('/saved/bulk-delete', ...inWorkspace, savedController.bulkDeleteSaved);
router.put('/saved/:id', ...inWorkspace, savedController.updateVariation);
router.delete('/saved/:id', ...inWorkspace, savedController.deleteVariation);
router.get('/projects', ...inWorkspace, savedController.getProjects);
router.post('/projects', ...inWorkspace, savedController.createProject);
router.delete('/projects/:id', ...inWorkspace, savedController.deleteProject);
router.post('/feedback/negative', ...inWorkspace, savedController.saveNegativeFeedback);

// ------------------------------------------------------------------ analytics
router.get('/analytics', ...inWorkspace, analyticsController.getAnalytics);
// Dato financiero del workspace: va con asManager, no con inWorkspace. La
// pestaña Analytics del frontend ya está marcada adminOnly.
router.get('/analytics/usage', ...asManager, analyticsController.getUsageAnalytics);

// -------------------------------------------------------------- revisiones
router.get('/review-sessions', ...inWorkspace, reviewController.listReviewSessions);
router.post('/review-sessions', ...inWorkspace, reviewController.createReviewSession);
router.get('/review-sessions/:id', ...inWorkspace, reviewController.getReviewSessionDetail);
router.delete('/review-sessions/:id', ...asManager, reviewController.deleteReviewSession);

// Portal público del cliente final: sin auth, protegido por el token de sesión.
router.get('/review/public/:token', reviewController.getReviewByToken);
router.post('/review/public/:token/submit', reviewController.submitReview);

export default router;
