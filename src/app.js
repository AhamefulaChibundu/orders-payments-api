const express = require('express');
const userRoutes = require('./routes/user.route');
const orderRoutes = require('./routes/order.route');
const webhookRoutes = require('./routes/webhook.route');

const app = express();

app.use(express.json());

app.use('/users', userRoutes);
app.use('/orders', orderRoutes);
app.use('/webhooks', webhookRoutes);

module.exports = app;
