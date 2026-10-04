const pool = require('../config/db');
const { paymentEventSchema } = require('../validations/webhook.validation');

const handlePaymentEvent = async (req, res) => {
  const { error, value } = paymentEventSchema.validate(req.body || {}, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((d) => d.message),
    });
  }

  const { event_id, order_id, event_type } = value;
  const newStatus = event_type === 'payment.success' ? 'paid' : 'failed';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO payment_events (event_id, order_id, event_type, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id`,
      [event_id, order_id, event_type, JSON.stringify(value)]
    );

    if (inserted.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({ message: 'Event already processed' });
    }

    await client.query('UPDATE orders SET status = $1 WHERE id = $2', [
      newStatus,
      order_id,
    ]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Event recorded', order_id, status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    client.release();
  }
};

module.exports = { handlePaymentEvent };