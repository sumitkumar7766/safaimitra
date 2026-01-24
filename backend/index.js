const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();
const bodyParser = require("body-parser");

const JWT_SECRET = "safaimitra-secret";

// Models
const Citizen = require("./model/CitizenModel.js");
const Vehicle = require("./model/VehicleModel.js");
const Admin = require("./model/AdminModel.js");

// Routes
const CitizenRegister = require("./routes/citizenRegister.js");
const VehicleRegister = require("./routes/vehicleRegister.js");
const CitizenLogin = require("./routes/loginCitizen.js");
const VehicleLogin = require("./routes/loginVehicle.js");
const AdminLogin = require("./routes/loginAdmin.js");

// DB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/safaimitra")
  .then(() => console.log("DB Connection successful"))
  .catch((err) => console.log(err));

// Session Store
const store = MongoStore.create({
  mongoUrl: "mongodb://127.0.0.1:27017/safaimitra",
  crypto: { secret: process.env.SECRET_KEY || JWT_SECRET },
  touchAfter: 24 * 3600,
});
store.on("error", (err) => {
  console.log("Error in Mongo Session Store", err);
});

// Middlewares
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(bodyParser.json());

// Sessions
app.use(
  session({
    store,
    secret: process.env.SECRET_KEY || JWT_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport Strategies
passport.use("citizen-local", new LocalStrategy(Citizen.authenticate()));
passport.use("vehicle-local", new LocalStrategy(Vehicle.authenticate()));
passport.use("admin-local", new LocalStrategy(Admin.authenticate()));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  Citizen.findById(id)
    .then((user) => {
      if (user) return done(null, user);
      return Vehicle.findById(id);
    })
    .then((user) => {
      if (user) return done(null, user);
      return Admin.findById(id);
    })
    .then((user) => done(null, user))
    .catch((err) => done(err));
});

// Routes
app.use("/citizen", CitizenRegister);
app.use("/vehicle", VehicleRegister);
app.use("/loginc", CitizenLogin);
app.use("/loginv", VehicleLogin);
app.use("/logina", AdminLogin);

// Root
app.get("/", (_req, res) => {
  res.send("Welcome to SafaiMitra backend!");
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
