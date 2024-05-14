const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middle ware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://pro-assignment-eleven.web.app",
      "https://pro-assignment-eleven.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// source code

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5e8b5ac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// logger middleware
const logger = (req, res, next) => {
  console.log("log info:", req.method, req.url);
  next();
};

// verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized user" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
    next();
  });
};
const cookieOption = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const allServiceCollections = client
      .db("allManagementServices")
      .collection("allServices");

    const allBookingCollections = client
      .db("allManagementServices")
      .collection("allBookings");

    // Auth Api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, cookieOption).send({ success: true });
    });

    // Auth clear cookies
    app.post("/logOut", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });

    // Get service
    app.get("/allServices", async (req, res) => {
      const cursor = allServiceCollections.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // Get booking
    app.get("/allBookings", logger, async (req, res) => {
      const cursor = allBookingCollections.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // get service with id
    app.get("/allServices/:id", logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allServiceCollections.findOne(query);
      res.send(result);
    });
    // get service with email
    app.get("/myService/:email", logger, verifyToken, async (req, res) => {
      if (req.params.email !== req.user.email) {
        return res.status(403).send({ message: "Forbidden" });
      }
      const query = { providerEmail: req.params.email };
      const result = await allServiceCollections.find(query).toArray();
      res.send(result);
    });
    // get booking with email
    app.get("/myBooking/:email", logger, verifyToken, async (req, res) => {
      if (req.params.email !== req.user.email) {
        return res.status(403).send({ message: "Forbidden" });
      }
      const query = { userEmail: req.params.email };
      const result = await allBookingCollections.find(query).toArray();
      res.send(result);
    });
    // Update service
    app.put("/allServices/:id", logger, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedService = req.body;
      const updateService = {
        $set: {
          photo: updatedService.photo,
          price: updatedService.price,
          serviceName: updatedService.serviceName,
          serviceArea: updatedService.serviceArea,
          description: updatedService.description,
        },
      };
      const result = await allServiceCollections.updateOne(
        filter,
        updateService,
        options
      );
      res.send(result);
    });
    // Update Booking
    app.patch("/allBookings/:id", logger, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      const updateBooking = {
        $set: {
          status: updatedBooking.status,
        },
      };
      const result = await allBookingCollections.updateOne(
        filter,
        updateBooking
      );
      res.send(result);
    });

    // Delete Service
    app.delete("/allServices/:id", logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allServiceCollections.deleteOne(query);
      res.send(result);
    });

    // post service
    app.post("/allServices", logger, async (req, res) => {
      const newData = req.body;
      const result = await allServiceCollections.insertOne(newData);
      res.send(result);
    });
    // post booking
    app.post("/allBookings", logger, async (req, res) => {
      const newData = req.body;
      const result = await allBookingCollections.insertOne(newData);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("project is running");
});

app.listen(port, () => {
  console.log(`project is running at: ${port}`);
});
