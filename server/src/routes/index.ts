
import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as generateController from '../controllers/generateController';
import * as clientController from '../controllers/clientController';
import * as savedController from '../controllers/savedController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Generation Routes
router.post('/generate', authenticateToken, generateController.generateCopy);

// Client/Brand Routes
router.get('/clients', authenticateToken, clientController.getClients);
router.post('/clients', authenticateToken, authorizeRole(['ADMIN']), clientController.createClient);
router.post('/dna-profiles', authenticateToken, authorizeRole(['ADMIN']), clientController.saveDNAProfile);
router.put('/dna-profiles/:id', authenticateToken, authorizeRole(['ADMIN']), clientController.updateDNAProfile);

// Saved Variations & Projects
router.get('/saved', authenticateToken, savedController.getSavedVariations);
router.post('/saved', authenticateToken, savedController.saveVariation);
router.get('/projects', authenticateToken, savedController.getProjects);
router.post('/projects', authenticateToken, savedController.createProject);

export default router;
