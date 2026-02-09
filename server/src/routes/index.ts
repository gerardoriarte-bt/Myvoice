
import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as generateController from '../controllers/generateController.js';
import * as clientController from '../controllers/clientController.js';
import * as savedController from '../controllers/savedController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = Router();

// Auth & User Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/users', authenticateToken, authorizeRole(['ADMIN']), authController.getUsers);
router.delete('/users/:id', authenticateToken, authorizeRole(['ADMIN']), authController.deleteUser);

// Generation Routes
router.post('/generate', authenticateToken, generateController.generateCopy);

// Client/Brand Routes
router.get('/clients', authenticateToken, clientController.getClients);
router.post('/clients', authenticateToken, authorizeRole(['ADMIN']), clientController.createClient);
router.put('/clients/:id', authenticateToken, authorizeRole(['ADMIN']), clientController.updateClient);
router.delete('/clients/:id', authenticateToken, authorizeRole(['ADMIN']), clientController.deleteClient);
router.post('/dna-profiles', authenticateToken, authorizeRole(['ADMIN']), clientController.saveDNAProfile);
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

export default router;
