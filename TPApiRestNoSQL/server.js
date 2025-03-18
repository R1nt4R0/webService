const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = 8000;
const client = new MongoClient("mongodb://localhost:27017");
let db;

app.use(express.json());

// Routes
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
  res.send({ _id: ack.insertedId, name, about, price, categoryIds });
});

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

app.post("/categories", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).send({ error: "Invalid category data" });
  }
  
  const ack = await db.collection("categories").insertOne({ name });
  res.send({ _id: ack.insertedId, name });
});

// Init MongoDB client connection
client.connect().then(() => {
  db = client.db("myDB");
  app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });
});
