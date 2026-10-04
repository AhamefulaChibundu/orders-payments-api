# Orders API

A small backend API built with Node.js, Express and PostgreSQL. It manages users and orders, and it has a webhook endpoint that receives payment events, saves them safely, and updates the order status.

I built this to practise working with relational databases, database migrations and webhook handling.

## Tech stack

- Node.js and Express 5
- PostgreSQL, accessed with the `pg` library
- Joi for request validation
- node-pg-migrate for database migrations
- dotenv for configuration

## What it does

- Lists users and orders (orders are joined with the user's name).
- Creates orders after validating the request.
- Receives payment webhooks (`payment.success` or `payment.failed`), stores each event once, and updates the matching order to `paid` or `failed`.
- Handles duplicate webhook deliveries safely, so a retried event is not processed twice.

## Project structure

```
orders-payments-api/
  migrations/          Database structure, one change per file
  src/
    config/db.js       PostgreSQL connection pool
    controllers/       What happens when a route is hit
    routes/            Which URL goes to which controller
    validators/        Joi schemas for incoming data
    app.js             Builds the Express app
  server.js            Starts the server
  .env.example         Example settings (copy to .env)
```

## Database design

Three tables, created by the migrations:

- **users**: `id`, `name`, `email` (unique), `created_at`
- **orders**: `id`, `user_id` (foreign key to users), `amount` (NUMERIC(10,2)), `status` (default `pending`), `created_at`
- **payment_events**: `id`, `event_id` (unique), `order_id` (foreign key to orders), `event_type`, `payload` (JSONB, the full webhook body), `received_at`

There is also an index on `orders.user_id`, so looking up all orders for one user does not need to read the whole table.

## Getting started

### Requirements

- Node.js 18 or newer
- PostgreSQL installed and running

### 1. Install

```bash
git clone https://github.com/AhamefulaChibundu/orders-payments-api.git
cd orders-payments-api
npm install
```

### 2. Create a database

In psql (or any Postgres tool):

```sql
CREATE DATABASE orders_api;
```

### 3. Add your settings

Copy `.env.example` to a new file named `.env`, or create `.env` in the project root with:

```
DATABASE_URL=postgres://postgres:your_password_here@localhost:5432/orders_api
```

This single connection string is used by both the app and the migration tool. Replace `your_password_here` with your own Postgres password. If your password has special characters, encode them (for example, `$` becomes `%24`).

### 4. Build the tables

```bash
npm run migrate up
```

This applies every migration that has not been applied yet and records each one in a `pgmigrations` table. Running it again does nothing.

Other useful commands:

```bash
npm run migrate down                    # undo the most recent migration
npm run migrate redo                    # undo and re-apply the most recent migration
npm run migrate create my-change-name   # create a new migration file
```

Note: `down` drops tables and their data, so use it on development databases only.

### 5. Start the server

```bash
node server.js
```

The server runs on `http://localhost:3000` by default. Set a `PORT` value in `.env` to change it.

### 6. Add a test user

There is no endpoint for creating users yet, so add one with SQL:

```sql
INSERT INTO users (name, email) VALUES ('Ada Obi', 'ada@example.com');
```

## API reference

### GET /users

Returns all users.

### GET /orders

Returns all orders with the name of the user who made each one.

```json
[
  { "id": 1, "name": "Ada Obi", "amount": "15000.50", "status": "pending" }
]
```

Amounts are returned as strings on purpose. PostgreSQL's `NUMERIC` type stores exact values, and the `pg` library keeps them as strings to avoid floating point rounding errors.

### POST /orders

Creates an order for an existing user.

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "amount": 2500.75}'
```

Responses:

- `201` with the created order
- `400` with a list of validation errors (for example, a missing or non-numeric field)
- `404` if the user does not exist

### POST /webhooks/payment

Receives a payment event.

```bash
curl -X POST http://localhost:3000/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{"event_id": "evt_100", "order_id": 1, "event_type": "payment.success", "amount": 2500.75, "currency": "NGN"}'
```

Required fields: `event_id`, `order_id`, and `event_type` (`payment.success` or `payment.failed`). Extra fields are allowed and are stored in the `payload` column.

Responses:

- `201` when the event is new: it is recorded and the order becomes `paid` (or `failed`)
- `200` with "Event already processed" when the same `event_id` was seen before
- `400` for invalid input
- `404` if the order does not exist

## How the webhook handles problems

- **Duplicate events:** `event_id` has a UNIQUE constraint, and the insert uses `ON CONFLICT DO NOTHING`. A retried event is ignored and gets a `200`, which tells the sender to stop retrying.
- **Partial failures:** saving the event and updating the order happen inside one database transaction. Either both changes are saved or neither is.
- **Bad input:** requests are validated with Joi before they reach the database, and the database constraints act as a second layer of protection.
- **SQL injection:** every query uses parameterized values (`$1`, `$2`), never string concatenation.

## Limitations and ideas for next steps

- Webhook signature verification, so only the real payment provider can send events
- Authentication and user-scoped access
- A `POST /users` endpoint and `GET /orders/:id`
- Pagination on list endpoints
- Automated tests
- Deployment with a hosted PostgreSQL database

## Author

Ahamefula Chibundu.