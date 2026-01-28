const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
require("dotenv").config();
const bodyParser = require("body-parser");
const MONGO_URL = "mongodb://127.0.0.1:27017/safaimitra";

// Models
const Citizen = require("./model/CitizenModel.js");
const Vehicle = require("./model/VehicleModel.js");
const Admin = require("./model/AdminModel.js");
const Office = require("./model/OfficeModel.js");

// Routes
const CitizenRegister = require("./routes/citizenRegister.js");
const VehicleRegister = require("./routes/vehicle.js");
const OfficeRegister = require("./routes/office.js");
const CitizenLogin = require("./routes/loginCitizen.js");
const VehicleLogin = require("./routes/loginVehicle.js");
const AdminLogin = require("./routes/loginAdmin.js");
const OfficeLogin = require("./routes/loginOffice.js");
const AdminRegister = require("./routes/admin.js");
const StaffRegister = require("./routes/staff.js");
const RouteRegister = require("./routes/route.js");
const dustbinRoutes = require("./routes/dustbin.js");



// DB Connection
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("DB Connection successful"))
  .catch((err) => console.log("Mongo Error:", err));

// Session Store (OLD API compatible)
const MongoStore = require("connect-mongo");

const store = MongoStore.create({
  mongoUrl: MONGO_URL,
  touchAfter: 24 * 3600,
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Sessions
app.use(
  session({
    store,
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport Strategies
// passport.use("citizen-local", new LocalStrategy(Citizen.authenticate()));
// passport.use("vehicle-local", new LocalStrategy(Vehicle.authenticate()));
passport.use("admin-local", new LocalStrategy(Admin.authenticate()));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    // Check in all roles (example)
    const admin = await Admin.findById(id);
    if (admin) return done(null, admin);

    const citizen = await Citizen.findById(id);
    if (citizen) return done(null, citizen);

    const vehicle = await Vehicle.findById(id);
    if (vehicle) return done(null, vehicle);

    const office = await Office.findById(id);
    if (office) return done(null, office);

    done(null, false);
  } catch (err) {
    done(err);
  }
});

// Routes
app.use("/admin", AdminRegister);
app.use("/admin", AdminLogin);
// app.use("/citizen", CitizenRegister);
app.use("/vehicle", VehicleRegister);
app.use("/office", OfficeRegister);
// app.use("/loginc", CitizenLogin);
// app.use("/loginv", VehicleLogin);
// app.use("/logina", AdminLogin);
app.use("/office", OfficeLogin);
app.use("/staff", StaffRegister);
app.use("/route", RouteRegister);
app.use("/dustbin", dustbinRoutes);

// Root
app.get("/", (_req, res) => {
  res.send("Welcome to SafaiMitra backend!");
});

// Start server
app.listen(5001, "0.0.0.0", () => {
  console.log("Server running on port 5001");
});
