const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = 8000;
const client = new MongoClient("mongodb://localhost:27017");
let db;

app.use(express.json());

// Create a product
app.post("/products", async (req, res) => {
  const { name, about, price, categoryIds } = req.body;
  if (!name || !about || typeof price !== "number" || price <= 0 || !Array.isArray(categoryIds)) {
    return res.status(400).send({ error: "Invalid product data" });
  }
  
  const ack = await db.collection("products").insertOne({
    name,
    about,
    price,
    categoryIds: categoryIds.map((id) => new ObjectId(id)),
  });
  res.status(201).send({ _id: ack.insertedId, name, about, price, categoryIds });
});

// Read all products
app.get("/products", async (req, res) => {
  const result = await db
    .collection("products")
    .aggregate([
      { $match: {} },
      {
        $lookup: {
          from: "categories",
          localField: "categoryIds",
          foreignField: "_id",
          as: "categories",
        },
      },
    ])
    .toArray();
  res.send(result);
});

// Read a single product by ID
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid product ID" });
  
  const product = await db.collection("products").findOne({ _id: new ObjectId(id) });
  if (!product) return res.status(404).send({ error: "Product not found" });
  
  res.send(product);
});

// Update a product by ID
app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, about, price, categoryIds } = req.body;
  if (!ObjectId.isValid(id) || !name || !about || typeof price !== "number" || price <= 0 || !Array.isArray(categoryIds)) {
    return res.status(400).send({ error: "Invalid product data" });
  }
  
  const ack = await db.collection("products").updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, about, price, categoryIds: categoryIds.map((id) => new ObjectId(id)) } }
  );
  if (ack.matchedCount === 0) return res.status(404).send({ error: "Product not found" });
  
  res.send({ message: "Product updated successfully" });
});

// Delete a product by ID
app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid product ID" });
  
  const ack = await db.collection("products").deleteOne({ _id: new ObjectId(id) });
  if (ack.deletedCount === 0) return res.status(404).send({ error: "Product not found" });
  
  res.send({ message: "Product deleted successfully" });
});

// Create a category
app.post("/categories", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).send({ error: "Invalid category data" });
  }
  
  const ack = await db.collection("categories").insertOne({ name });
  res.status(201).send({ _id: ack.insertedId, name });
});

// Init MongoDB client connection
client.connect().then(() => {
  db = client.db("myDB");
  app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });
});