const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const dotenv = require("dotenv");
dotenv.config();
const bodyParser = require("body-parser");
const cron = require("node-cron");
const http = require("http");
const { Server } = require("socket.io");
const MONGO_URL = "mongodb://127.0.0.1:27017/safaimitra";
const app = express();

// Models
const Citizen = require("./model/CitizenModel.js");
const Vehicle = require("./model/VehicleModel.js");
const Admin = require("./model/AdminModel.js");
const Office = require("./model/OfficeModel.js");
const Staff = require("./model/StaffModel.js");
const Dustbin = require("./model/DustbinModel.js");
const Complaint = require("./model/ComplaintModel.js");

// Routes
const CitizenRegister = require("./routes/citizen.js");
const VehicleRegister = require("./routes/vehicle.js");
const OfficeRegister = require("./routes/office.js");
const CitizenLogin = require("./routes/loginCitizen.js");
const VehicleLogin = require("./routes/loginStaff.js");
const AdminLogin = require("./routes/loginAdmin.js");
const OfficeLogin = require("./routes/loginOffice.js");
const AdminRegister = require("./routes/admin.js");
const StaffRegister = require("./routes/staff.js");
const RouteRegister = require("./routes/route.js");
const dustbinRoutes = require("./routes/dustbin.js");
const StaffLogin = require("./routes/loginStaff.js")
const predictRoutes = require("./routes/predict.routes");
const ComplaintRoutes = require("./routes/complaint");

// 👇 2. ADD THIS DEBUG BLOCK (Delete later)
// console.log("--- DEBUGGING ENV VARS ---");
// console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "✅ Loaded" : "❌ MISSING");
// console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "✅ Loaded" : "❌ MISSING");
// console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "✅ Loaded" : "❌ MISSING");
// console.log("--------------------------");

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

const allowedOrigins = [
  "http://localhost:3000",
  "http://10.242.244.129:5001"
];
// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(bodyParser.json());

const server = http.createServer(app);

// 2. 🔥 SOCKET.IO SETUP WITH CORS (Ye Important Hai) 🔥
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://10.242.244.129:5001"], // Dono URLs allow kar diye
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket']
});

app.set("io", io);

// ... Baaki code (DB connection, Routes) ...

// Socket Connection Log
io.on("connection", (socket) => {
  console.log(`✅ User Connected: ${socket.id}`);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`👤 Joined Room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected");
  });
});

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
passport.use("citizen-local", new LocalStrategy(Citizen.authenticate()));
passport.use("vehicle-local", new LocalStrategy(Staff.authenticate()));
passport.use("admin-local", new LocalStrategy(Admin.authenticate()));
passport.use("staff-local", new LocalStrategy(Staff.authenticate()));
passport.use("office-local", new LocalStrategy(Office.authenticate()));

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

    const staff = await Staff.findById(id);
    if (staff) return done(null, staff);

    done(null, false);
  } catch (err) {
    done(err);
  }
});

// Routes
app.use("/admin", AdminRegister);
app.use("/admin", AdminLogin);
app.use("/citizen", CitizenRegister);
app.use("/vehicle", VehicleRegister);
app.use("/office", OfficeRegister);
app.use("/citizen", CitizenLogin);
// app.use("/loginv", VehicleLogin);
// app.use("/logina", AdminLogin);
app.use("/office", OfficeLogin);
app.use("/staff", StaffRegister);
app.use("/staff", StaffLogin);
app.use("/route", RouteRegister);
app.use("/dustbin", dustbinRoutes);
app.use("/api", predictRoutes);
app.use("/complaint", ComplaintRoutes);

// Root
app.get("/", (_req, res) => {
  res.send("Welcome to SafaiMitra backend!");
});

/* ============================================================ */
/* 👇 4:00 AM DAILY CLEANING SCHEDULE (IDEAL DUSTBIN) 👇        */
/* ============================================================ */

// '0 4 * * *' ka matlab hai: Minute 0, Hour 4 (Subah 4 Baje)
cron.schedule("20 1 * * *", async () => {
  console.log("🌌 4:00 AM: Making all dustbins IDEAL for the new day...");

  try {
    const result = await Dustbin.updateMany(
      { active: true },
      {
        $set: {
          status: "ideal",           // Status wapas 'ideal' set
          imageUrl: ""               // Purani photo hata di
        }
      }
    );
    console.log(`✅ System Reset: ${result.modifiedCount} dustbins are now Ideal & Ready.`);
  } catch (err) {
    console.error("❌ Error in Daily Reset Job:", err);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" // India Time ke hisaab se 4 AM
});

/* ============================================================ */
/* 👇 AUTO OFFLINE VEHICLE CHECKER (Har 2 Minute mein) 👇       */
/* ============================================================ */

cron.schedule("*/2 * * * *", async () => {
  // console.log("🕵️ Checking for inactive vehicles...");

  // 5 Minute se purana time
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  try {
    // Aise VEHICLES dhoondo jo 'Online' hain par 5 min se inactive hain
    const result = await Vehicle.updateMany(
      {
        isOnline: true,
        lastSeen: { $lt: fiveMinutesAgo } // lastSeen < 5 min pehle
      },
      {
        $set: {
          isOnline: false,
          status: "Inactive" // Status bhi inactive kar do
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`💤 Auto-offlined ${result.modifiedCount} inactive vehicles.`);
    }
  } catch (err) {
    console.error("❌ Error in Auto-Offline Job:", err);
  }
});

// GET /public-offices
// Isme koi adminAuth nahi lagayenge taaki registration page par load ho sake
app.get("/public-list", async (req, res) => {
  try {
    // Humein sirf _id aur cityName chahiye
    const offices = await Office.find({}, "cityName _id");

    res.json({
      success: true,
      cities: offices.map(o => ({
        id: o._id,       // Ye backend par save hoga
        name: o.cityName // Ye dropdown me dikhega
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start server
// Humein uss 'server' ko start karna hai jisme humne 'io' attach kiya tha (Line 68)
server.listen(5001, "0.0.0.0", () => {
  console.log("🚀 Server running on 0.0.0.0:5001 (Socket.io Enabled)");
});