const express = require('express');
const { handlePaymentEvent } = require('../controllers/webhook.controller');

const router = express.Router();

router.post('/payment', handlePaymentEvent);

module.exports = router;