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
import * as piezaController from '../controllers/piezaController.js';
import * as notificacionController from '../controllers/notificacionController.js';
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

/** D6: 10 MB por pieza, y solo lo que la auditoría puede leer. */
const piezaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Sin PDF: sharp precompilado no lo rasteriza, y una pieza sin snapshot se
    // queda sin previa y sin auditoría. Ver services/piezaArchivo.ts.
    const aceptados = ['image/png', 'image/jpeg', 'image/webp'];
    if (aceptados.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Se aceptan PNG, JPG y WEBP'));
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
/**
 * Las funciones las administra quien administra el workspace, igual que los
 * roles. Pero a diferencia del rol, la función no da ni quita permisos: dice
 * qué hace cada uno, y con eso se decide a quién avisarle (H3.D).
 */
router.post('/workspace/members/:userId/funciones', ...asManager, workspaceController.addMemberFuncion);
router.delete('/workspace/members/:userId/funciones/:funcionId', ...asManager, workspaceController.removeMemberFuncion);
/**
 * La lista de dominios a los que este workspace invita. Va con `asManager`
 * porque cambia quién puede entrar a ver todas las marcas.
 */
router.get('/workspace/dominios', ...asManager, workspaceController.getDominios);
router.put('/workspace/dominios', ...asManager, workspaceController.updateDominios);
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
// -------------------------------------------------------------- producción
/**
 * El tablero del H2. Va con `inWorkspace` y NO con `asManager`: un diseñador
 * es MEMBER, y esta es la primera pantalla de trabajo que no administra nada.
 * Las transiciones son acciones con nombre —no un PUT de `estado`— porque cada
 * columna tiene una acción que la vacía (D5) y varias exigen un motivo escrito.
 */
router.get('/piezas', ...inWorkspace, piezaController.listarPorMarca);
router.get('/piezas/mias', ...inWorkspace, piezaController.listarMias);
router.post('/piezas/propuesta', ...inWorkspace, piezaController.proponer);
router.post('/piezas', ...inWorkspace, piezaController.crear);
router.get('/piezas/:id', ...inWorkspace, piezaController.detalle);
router.patch('/piezas/:id', ...inWorkspace, piezaController.renombrar);
/**
 * La subida va antes que `/:accion` porque comparte la forma de la URL, y
 * Express resuelve por orden. El tope de 10 MB es el de D6 y lo aplica multer
 * antes de que el archivo entre en memoria.
 */
router.post('/piezas/:id/archivo', ...inWorkspace, piezaUpload.single('archivo'), piezaController.subirArchivo);
router.post('/piezas/hallazgos/:hallazgoId/decision', ...inWorkspace, piezaController.decidirHallazgo);
router.post('/piezas/:id/reauditar', ...inWorkspace, piezaController.reauditar);
router.post('/piezas/:id/:accion', ...inWorkspace, piezaController.ejecutarAccion);

// ---------------------------------------------------------------- bandeja
/**
 * Los avisos de quien pregunta. Ninguna ruta lleva un `userId`: la bandeja
 * siempre es la propia, y eso es lo que hace que no exista la de otro.
 */
router.get('/notificaciones', ...inWorkspace, notificacionController.listar);
router.post('/notificaciones/leidas', ...inWorkspace, notificacionController.marcarTodasLeidas);
router.post('/notificaciones/:id/leida', ...inWorkspace, notificacionController.marcarLeida);

router.get('/review-sessions', ...inWorkspace, reviewController.listReviewSessions);
router.post('/review-sessions', ...inWorkspace, reviewController.createReviewSession);
router.get('/review-sessions/:id', ...inWorkspace, reviewController.getReviewSessionDetail);
router.delete('/review-sessions/:id', ...asManager, reviewController.deleteReviewSession);

// Portal público del cliente final: sin auth, protegido por el token de sesión.
router.get('/review/public/:token', reviewController.getReviewByToken);
router.post('/review/public/:token/submit', reviewController.submitReview);

export default router;
