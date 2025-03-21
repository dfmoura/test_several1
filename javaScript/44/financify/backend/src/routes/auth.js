const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// Rota para registro de usuário
router.post('/register', authController.register);

// Rota para login de usuário
router.post('/login', authController.login);

module.exports = router;