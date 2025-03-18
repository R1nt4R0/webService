CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  about VARCHAR(500),
  price FLOAT
);

INSERT INTO products (name, about, price) VALUES
  ('My first game', 'This is an awesome game', '60');

CREATE Table users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(200),
  email VARCHAR (200),
  password TEXT NOT NULL
);

INSERT INTO users (username, email, password) VALUES
  ('john_doe', 'john.doe@example.com', '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8');

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  productIds TEXT[] NOT NULL,
  total NUMERIC(10,2) NOT NULL CHECK (total > 0),
  payment BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

INSERT INTO orders (userId, productIds, total, payment, createdAt, updatedAt)
VALUES ('1', ARRAY['1', '2'], 120.00, false, NOW(), NOW());

