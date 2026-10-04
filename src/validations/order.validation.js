const Joi = require('joi');

const createOrderSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().max(99999999.99).required(),
});

module.exports = { createOrderSchema };
