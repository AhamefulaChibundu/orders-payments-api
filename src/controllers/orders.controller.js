const pool = require('../config/db');
const { createOrderSchema } = require('../validations/order.validation');

const getOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT orders.id, users.name, orders.amount, orders.status
       FROM orders
       JOIN users ON orders.user_id = users.id
       ORDER BY orders.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const createOrder = async (req, res) => {
  const { error, value } = createOrderSchema.validate(req.body || {}, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((d) => d.message),
    });
  }

  const { user_id, amount } = value;

  try {
    const result = await pool.query(
      'INSERT INTO orders (user_id, amount) VALUES ($1, $2) RETURNING *',
      [user_id, amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { 
  getOrders,
  createOrder
 };
