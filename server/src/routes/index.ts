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
import { authenticateToken, requireWorkspace, requireManager, requireSuperAdmin } from '../middleware/auth.js';
import * as controlController from '../controllers/controlController.js';
import * as bibliotecaController from '../cdm/biblioteca/bibliotecaController.js';
import * as planningController from '../cdm/planning/planningController.js';
import * as aprobadoresController from '../comun/aprobadoresController.js';
import { porAprobar } from '../plataforma/porAprobar.js';
import { pedidos as pedidosDeCopy } from '../plataforma/pedidosDeCopy.js';

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
router.post('/auth/novedades/:id/vista', ...authed, authController.marcarNovedadVista);

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
router.post('/generate/texto', ...inWorkspace, generateController.regenerarTexto);
router.get('/generate/history', ...inWorkspace, generateController.listGenerationHistory);
router.post('/copy/refine', ...inWorkspace, refineController.refineVariations);

// ---------------------------------------------------------- marcas y briefs
router.get('/clients', ...inWorkspace, clientController.getClients);
router.post('/clients', ...asManager, clientController.createClient);
router.get('/clients/:id/adn', ...inWorkspace, clientController.getAdnResuelto);
router.get('/clients/:id/adn/revision', ...inWorkspace, clientController.getRevisionAdn);
// El ADN lo escribe quien tiene Estrategia en la marca, o un admin (F1, decisión 22): cada handler llama
// `exigirPaso(…, 'ADN', …)` después de la guarda de tenencia.
router.post('/clients/:id/adn/revision/:clave', ...inWorkspace, clientController.postRevisarSeccion);
router.post('/clients/:id/adn/confirmar', ...inWorkspace, clientController.postConfirmarAdn);
// ADN 2.0 (docs/plan-adn-2.md): una sección a la vez, lo propuesto por la IA y la lista de audiencias.
router.put('/clients/:id/adn/secciones/:clave', ...inWorkspace, clientController.putSeccionAdn);
router.post('/clients/:id/adn/secciones/:clave/revisada', ...inWorkspace, clientController.postSeccionRevisada);
router.post('/clients/:id/adn/secciones/:clave/propuesta/:accion', ...inWorkspace, clientController.postPropuestaAdn);
// El estado de cada paso del encabezado (F0): lo lee cualquier miembro, como el ADN.
router.get('/clients/:id/proceso', ...inWorkspace, clientController.getProceso);
router.get('/clients/:id/campanas/proceso', ...inWorkspace, clientController.getCampanasEnProceso);
// El Panorama (decisión 24): todas las marcas del workspace, solo para quien administra.
router.get('/panorama', ...asManager, clientController.getPanorama);
router.get('/clients/:id/audiencias', ...inWorkspace, clientController.getAudiencias);
router.post('/clients/:id/audiencias', ...inWorkspace, clientController.postAudiencia);
router.put('/clients/:id/audiencias/:audienciaId', ...inWorkspace, clientController.putAudiencia);
router.put('/clients/:id', ...asManager, clientController.updateClient);
router.delete('/clients/:id', ...asManager, clientController.deleteClient);
router.post('/clients/:id/unir', ...asManager, clientController.unirConOtra);
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
// Quién puede aprobar lo decide la campaña (su responsable), no el rol: va con
// inWorkspace y la regla vive en services/aprobacion.ts.
router.post('/saved/aprobacion', ...inWorkspace, savedController.decidirAprobacionHandler);
router.put('/saved/:id', ...inWorkspace, savedController.updateVariation);
router.delete('/saved/:id', ...inWorkspace, savedController.deleteVariation);
router.get('/projects', ...inWorkspace, savedController.getProjects);
// Decisión 30: quién aprueba la campaña (desde Equipo) y todo lo que espera tu aprobación.
router.get('/projects/:id/aprobadores', ...inWorkspace, aprobadoresController.listar);
router.get('/por-aprobar', ...inWorkspace, porAprobar);
// F4: los pedidos de copy que llegan de CDM, por campaña y estado.
router.get('/copywriting/pedidos', ...inWorkspace, pedidosDeCopy);
router.post('/projects', ...inWorkspace, savedController.createProject);
router.get('/projects/de-brief/:dnaProfileId', ...inWorkspace, savedController.getCampanaDeBrief);
router.patch('/projects/:id', ...inWorkspace, savedController.updateProject);
router.delete('/projects/:id', ...inWorkspace, savedController.deleteProject);
router.post('/feedback/negative', ...inWorkspace, savedController.saveNegativeFeedback);

// ------------------------------------------------------------------ analytics
router.get('/analytics', ...inWorkspace, analyticsController.getAnalytics);
// El gasto de IA ya no está acá: es del super admin, en `/control/gasto` (decisión 27).

// ------------------------------------------------------------------ CDM
// La biblioteca de medios de la agencia (F2b): la lee cualquier miembro; editarla es de Planning.
router.get('/cdm/biblioteca', ...inWorkspace, bibliotecaController.listarMedios);
router.get('/cdm/biblioteca/medios/:id', ...inWorkspace, bibliotecaController.detalleDeMedio);
// Editarla es de Planning o de un admin (`exigirPlanning`, decisión 25).
router.post('/cdm/biblioteca/cargas', ...inWorkspace, bibliotecaController.cargarPlanilla);
router.put('/cdm/biblioteca/medios/:id/estado', ...inWorkspace, bibliotecaController.cambiarEstadoDeMedio);
router.put('/cdm/biblioteca/medios/:id/clase', ...inWorkspace, bibliotecaController.cambiarClaseDeMedio);
// El planning de una campaña (F3): lo arma Planning; lo aprueba el responsable de la campaña.
router.get('/cdm/plannings', ...inWorkspace, planningController.listar);
router.post('/cdm/plannings', ...inWorkspace, planningController.crear);
router.get('/cdm/plannings/:id', ...inWorkspace, planningController.detalle);
router.put('/cdm/plannings/:id', ...inWorkspace, planningController.actualizar);
router.put('/cdm/plannings/:id/lineas', ...inWorkspace, planningController.lineas);
router.put('/cdm/plannings/:id/lineas/:lineaId/ubicaciones', ...inWorkspace, planningController.ubicaciones);
router.post('/cdm/plannings/:id/enviar', ...inWorkspace, planningController.enviar);
router.post('/cdm/plannings/:id/aprobar', ...inWorkspace, planningController.aprobar);
router.post('/cdm/plannings/:id/devolver', ...inWorkspace, planningController.devolver);
router.post('/cdm/plannings/:id/reabrir', ...inWorkspace, planningController.reabrir);
router.post('/cdm/plannings/:id/enlace', ...inWorkspace, planningController.enlace);

// ------------------------------------------------------------------ control
/**
 * El super admin (decisión 27): por encima de los workspaces, sin `requireWorkspace`. Es el único que ve
 * costos; `/analytics/usage` dejó de existir para OWNER y ADMIN.
 */
const asSuperAdmin = [authenticateToken, requireSuperAdmin] as const;
router.get('/control/workspaces', ...asSuperAdmin, controlController.listarWorkspaces);
router.put('/control/workspaces/:id/plataforma', ...asSuperAdmin, controlController.cambiarPlataforma);
router.get('/control/usuarios', ...asSuperAdmin, controlController.listarUsuarios);
router.put('/control/membresias', ...asSuperAdmin, controlController.guardarMembresia);
router.delete('/control/membresias/:userId/:workspaceId', ...asSuperAdmin, controlController.quitarMembresia);
router.get('/control/gasto', ...asSuperAdmin, analyticsController.getUsageAnalytics);
router.get('/control/marcas', ...asSuperAdmin, controlController.listarMarcas);
router.put('/control/marcas/:id/modulos', ...asSuperAdmin, controlController.cambiarModulo);

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
// Mandar copy a producción es de quien administra: la pantalla ya lo ofrecía
// solo a ellos, y el servidor lo aceptaba de cualquiera.
router.post('/piezas/propuesta', ...asManager, piezaController.proponer);
router.post('/piezas', ...asManager, piezaController.crear);
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
router.post('/piezas/:id/corregir-copy', ...inWorkspace, piezaController.corregirCopy);
router.post('/piezas/:id/cancelar', ...inWorkspace, piezaController.cancelar);
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
