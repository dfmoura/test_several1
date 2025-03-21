const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactions');

// Rotas para transações
router.get('/', transactionsController.getAll);
router.post('/', transactionsController.create);
router.put('/:id', transactionsController.update);
router.delete('/:id', transactionsController.delete);

module.exports = router;