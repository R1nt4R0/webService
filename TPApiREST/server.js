const express = require("express");
const postgres = require("postgres");
const z = require("zod");
const crypto = require("crypto");

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

// Récupérer tous les produits avec pagination
app.get("/products", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const products = await sql`SELECT * FROM products LIMIT ${limit} OFFSET ${offset}`;
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un produit
app.post("/products", async (req, res) => {
  try {
    const parsedData = ProductCreateSchema.parse(req.body);
    const { name, about, price } = parsedData;
    const result = await sql`
      INSERT INTO products (name, about, price)
      VALUES (${name}, ${about}, ${price})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Données invalides", details: error.errors });
    }
    res.status(500).json({ error: "Erreur serveur" });
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
    const user = await sql`SELECT id, username, email, password FROM users WHERE id = ${id}`;
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

// Route d'accueil
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
