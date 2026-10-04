const Joi = require('joi');

const paymentEventSchema = Joi.object({
  event_id: Joi.string().max(100).required(),
  order_id: Joi.number().integer().positive().required(),
  event_type: Joi.string().valid('payment.success', 'payment.failed').required(),
}).unknown(true);

module.exports = { paymentEventSchema };