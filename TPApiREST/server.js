const express = require("express");
const postgres = require("postgres");
const z = require("zod");
const crypto = require("crypto");
//const fetch = require("node-fetch");

const app = express();
const port = 8000;
const sql = postgres({ db: "mydb", user: "user", password: "pass", port: 5433 });

app.use(express.json());

// Fonction pour hacher le mot de passe
const hashPassword = (password) => {
  return crypto.createHash("sha512").update(password).digest("hex");
};

// Schéma de validation avec Zod
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});

const ProductCreateSchema = ProductSchema.omit({ id: true });

const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const UserCreateSchema = UserSchema.omit({ id: true });
const UserUpdateSchema = UserSchema.omit({ id: true, password: true }).partial();

const OrderSchema = z.object({
    id: z.string(),
    userId: z.string(),
    productIds: z.array(z.string()),
    total: z.number().positive(),
    payment: z.boolean().default(false),
    createdAt: z.string(),
    updatedAt: z.string(),
  });
  
const OrderCreateSchema = OrderSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Récupérer tous les produits avec pagination et filtres
app.get("/products", async (req, res) => {
  try {
    const { name, about, price, limit = 10, offset = 0 } = req.query;
    let query = sql`SELECT * FROM products WHERE 1=1`;
    
    if (name) {
      query = sql`${query} AND name ILIKE ${'%' + name + '%'}`;
    }
    if (about) {
      query = sql`${query} AND about ILIKE ${'%' + about + '%'}`;
    }
    if (price) {
      query = sql`${query} AND price <= ${parseFloat(price)}`;
    }
    
    query = sql`${query} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const products = await query;
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer un produit par ID
app.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await sql`SELECT * FROM products WHERE id = ${id}`;
    if (product.length === 0) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }
    res.json(product[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un produit
app.post("/products", async (req, res) => {
    try {
      const parsedData = ProductSchema.omit({ id: true }).parse(req.body);
      const { name, about, price } = parsedData;
      const result = await sql`
        INSERT INTO products (name, about, price)
        VALUES (${name}, ${about}, ${price})
        RETURNING *`
      ;
      res.status(201).json(result[0]);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

// Supprimer un produit
app.delete("/products/:id", async (req, res) => {
try {
    const { id } = req.params;
    const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING *`;
    if (result.length === 0) {
    return res.status(404).json({ error: "Produit non trouvé" });
    }
    res.json({ message: "Produit supprimé" });
} catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
}
});

// Récupérer un utilisateur par ID
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await sql`SELECT id, username, email FROM users WHERE id = ${id}`;
    if (user.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    res.json(user[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un utilisateur
app.post("/users", async (req, res) => {
  try {
    const parsedData = UserCreateSchema.parse(req.body);
    const { username, email, password } = parsedData;
    const hashedPassword = hashPassword(password);
    const result = await sql`
      INSERT INTO users (username, email, password)
      VALUES (${username}, ${email}, ${hashedPassword})
      RETURNING id, username, email
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Données invalides", details: error.errors });
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer tous les jeux Free-to-Play
app.get("/f2p-games", async (req, res) => {
    try {
      const response = await fetch("https://www.freetogame.com/api/games");
      const games = await response.json();
      res.json(games);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erreur lors de la récupération des jeux Free-to-Play" });
    }
  });
  
  // Récupérer un jeu Free-to-Play par ID
  app.get("/f2p-games/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`https://www.freetogame.com/api/game?id=${id}`);
      if (!response.ok) {
        return res.status(404).json({ error: "Jeu non trouvé" });
      }
      const game = await response.json();
      res.json(game);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erreur lors de la récupération du jeu" });
    }
  });

// Créer une commande
app.post("/orders", async (req, res) => {
try {
    const parsedData = OrderCreateSchema.parse(req.body);
    const { userId, productIds, payment } = parsedData;
    const products = await sql`SELECT * FROM products WHERE id IN (${sql(productIds)})`;
    if (products.length === 0) {
    return res.status(400).json({ error: "Produits non trouvés" });
    }
    const total = products.reduce((sum, p) => sum + p.price, 0) * 1.2;
    const result = await sql`
    INSERT INTO orders (userId, productIds, total, payment, createdAt, updatedAt)
    VALUES (${userId}, ${sql(productIds)}, ${total}, ${payment}, NOW(), NOW())
    RETURNING *`;
    res.status(201).json(result[0]);
} catch (error) {
    res.status(400).json({ error: "Données invalides", details: error.errors });
}
});
  
  
// Récupérer toutes les commandes
app.get("/orders", async (req, res) => {
try {
    const orders = await sql`SELECT * FROM orders`;
    res.json(orders);
} catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
}
});

// Récupérer une commande par ID avec détails utilisateur et produits
app.get("/orders/:id", async (req, res) => {
try {
    const { id } = req.params;
    const order = await sql`SELECT * FROM orders WHERE id = ${id}`;
    if (order.length === 0) {
    return res.status(404).json({ error: "Commande non trouvée" });
    }
    const user = await sql`SELECT id, username, email FROM users WHERE id = ${order[0].userId}`;
    const products = await sql`SELECT * FROM products WHERE id IN (${sql(order[0].productIds)})`;
    res.json({ ...order[0], user: user[0], products });
} catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
}
});

// Mettre à jour une commande
app.put("/orders/:id", async (req, res) => {
try {
    const { id } = req.params;
    const parsedData = OrderCreateSchema.parse(req.body);
    const { userId, productIds, payment } = parsedData;
    const products = await sql`SELECT * FROM products WHERE id IN (${sql(productIds)})`;
    if (products.length === 0) {
    return res.status(400).json({ error: "Produits non trouvés" });
    }
    const total = products.reduce((sum, p) => sum + p.price, 0) * 1.2;
    const result = await sql`
    UPDATE orders SET userId = ${userId}, productIds = ${sql(productIds)}, total = ${total}, payment = ${payment}, updatedAt = NOW()
    WHERE id = ${id} RETURNING *`;
    if (result.length === 0) {
    return res.status(404).json({ error: "Commande non trouvée" });
    }
    res.json(result[0]);
} catch (error) {
    res.status(400).json({ error: "Données invalides" });
}
});

// Supprimer une commande
app.delete("/orders/:id", async (req, res) => {
try {
    const { id } = req.params;
    const result = await sql`DELETE FROM orders WHERE id = ${id} RETURNING *`;
    if (result.length === 0) {
    return res.status(404).json({ error: "Commande non trouvée" });
    }
    res.json({ message: "Commande supprimée" });
} catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
}
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});