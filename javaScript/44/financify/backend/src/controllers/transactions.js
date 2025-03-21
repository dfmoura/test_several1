const db = require('../models');

const getAll = async (req, res) => {
  try {
    const transactions = await db.Transaction.findAll();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const create = async (req, res) => {
  try {
    const { type, category, amount, date, description } = req.body;
    const transaction = await db.Transaction.create({
      type,
      category,
      amount,
      date,
      description,
      user_id: req.user.id, // Assumindo que o usuário está autenticado
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, category, amount, date, description } = req.body;
    const transaction = await db.Transaction.update(
      { type, category, amount, date, description },
      { where: { id } }
    );
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const delete = async (req, res) => {
  try {
    const { id } = req.params;
    await db.Transaction.destroy({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAll, create, update, delete };