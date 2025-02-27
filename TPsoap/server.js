const soap = require("soap");
const fs = require("node:fs");
const http = require("http");
const postgres = require("postgres");

const sql = postgres({ db: "mydb", user: "user", password: "pass" , port: 5433});

// Define the service implementation
const service = {
    ProductsService: {
        ProductsPort: {
            CreateProduct: async function ({ name, about, price }, callback) {
                if (!name || !about || !price) {
                    throw {
                        Fault: {
                            Code: {
                                Value: "soap:Sender",
                                Subcode: { value: "rpc:BadArguments" },
                            },
                            Reason: { Text: "Processing Error" },
                            statusCode: 400,
                        },
                    };
                }

                const product = await sql`
                    INSERT INTO products (name, about, price)
                    VALUES (${name}, ${about}, ${price})
                    RETURNING *;
                `;

                callback(null, product[0]);
            },

            GetProducts: async function (_, callback) {
                try {
                    const products = await sql`SELECT * FROM products`;
                       
                    callback(null, products.map(product => ({
                        id: product.id,
                        name: product.name,
                        about: product.about,
                        price: product.price
                    })));
                } catch (error) {
                    callback(error);
                }
            },
        },
    },
};


// http server example
const server = http.createServer(function (request, response) {
    response.end("404: Not Found: " + request.url);
});

server.listen(8000);

// Create the SOAP server
const xml = fs.readFileSync("productsService.wsdl", "utf8");
soap.listen(server, "/products", service, xml, function () {
    console.log("SOAP server running at http://localhost:8000/products?wsdl");
});