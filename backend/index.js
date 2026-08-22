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

const MONGO_URL =
  process.env.MONGO_URL ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/safaimitra";

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
const StaffLogin = require("./routes/loginStaff.js");
const predictRoutes = require("./routes/predict.routes");
const ComplaintRoutes = require("./routes/complaint");
const citizenSystemRoutes = require("./routes/citizenSystem");
const eventDustbinRoutes = require("./routes/eventDustbin");

// Database Connection with Caching for Serverless
let isDbConnected = false;
const connectDB = async () => {
  if (isDbConnected && mongoose.connection.readyState === 1) {
    return;
  }
  try {
    const conn = await mongoose.connect(MONGO_URL);
    isDbConnected = conn.connections[0].readyState === 1;
    console.log("✅ MongoDB Connection successful");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
};

// Initial connection
connectDB();

// Middleware to ensure DB connection on serverless requests
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
  next();
});

// Session Store (Compatible with MongoDB)
const MongoStore = require("connect-mongo");

const store = MongoStore.create({
  mongoUrl: MONGO_URL,
  touchAfter: 24 * 3600,
});

const allowedOrigins = [
  "https://safaimitra.online",
  "http://safaimitra.online",
  "https://www.safaimitra.online",
  "http://www.safaimitra.online",
  "https://api.safaimitra.online",
  "http://api.safaimitra.online",
  "https://admin.safaimitra.online",
  "http://localhost:3000",
  "http://localhost:5001",
  "http://127.0.0.1:3000",
];

// CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /\.safaimitra\.online$/.test(origin) ||
        /\.vercel\.app$/.test(origin) ||
        /\.northflank\.app$/.test(origin) ||
        /\.code\.run$/.test(origin) ||
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
        /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json());
app.use(bodyParser.json());

const server = http.createServer(app);

// Socket.IO Setup with Native WebSocket support
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
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
  }),
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
app.use("/citizen-system", citizenSystemRoutes);
app.use("/api", eventDustbinRoutes);
app.use("/", eventDustbinRoutes);

// Root
app.get("/", (_req, res) => {
  res.send("Welcome to SafaiMitra backend!");
});

// ---------------- Cron Job Implementations ----------------
const resetDailyDustbins = async () => {
  console.log("🌌 4:00 AM: Making all dustbins IDEAL for the new day...");
  try {
    const result = await Dustbin.updateMany(
      { active: true },
      {
        $set: {
          status: "ideal",
          imageUrl: "",
        },
      },
    );
    console.log(
      `✅ System Reset: ${result.modifiedCount} dustbins are now Ideal & Ready.`,
    );
    return { success: true, modifiedCount: result.modifiedCount };
  } catch (err) {
    console.error("❌ Error in Daily Reset Job:", err);
    return { success: false, error: err.message };
  }
};

const checkInactiveVehicles = async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  try {
    const result = await Vehicle.updateMany(
      {
        isOnline: true,
        lastSeen: { $lt: fiveMinutesAgo },
      },
      {
        $set: {
          isOnline: false,
          status: "Inactive",
        },
      },
    );
    if (result.modifiedCount > 0) {
      console.log(
        `💤 Auto-offlined ${result.modifiedCount} inactive vehicles.`,
      );
    }
    return { success: true, modifiedCount: result.modifiedCount };
  } catch (err) {
    console.error("❌ Error in Auto-Offline Job:", err);
    return { success: false, error: err.message };
  }
};

const escalateComplaints = async () => {
  const io = app.get("io");
  const now = new Date();

  try {
    const unresolvedComplaints = await Complaint.find({
      status: { $nin: ["resolved", "closed", "rejected"] },
    });

    const authorityNames = {
      1: "Driver",
      2: "Area Supervisor",
      3: "Zone Officer",
      4: "Municipal Officer",
      5: "City Commissioner",
    };

    const roles = {
      2: "supervisor",
      3: "zone_officer",
      4: "municipal_officer",
      5: "commissioner",
    };

    let escalatedCount = 0;

    for (const comp of unresolvedComplaints) {
      const createdTime = comp.reportedAt || comp.createdAt;
      const elapsedMs = now - createdTime;
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      const pendingDays = Math.floor(elapsedHours / 24);

      comp.pendingDays = pendingDays;

      let updated = false;

      if (!comp.nextEscalationAt && comp.currentEscalationLevel < 5) {
        comp.nextEscalationAt = new Date(
          createdTime.getTime() + 24 * 60 * 60 * 1000,
        );
        updated = true;
      }

      if (comp.nextEscalationAt && now >= comp.nextEscalationAt) {
        const oldLevel = comp.currentEscalationLevel;

        if (oldLevel < 5) {
          const targetLevel = oldLevel + 1;
          comp.currentEscalationLevel = targetLevel;
          comp.escalatedAt = now;
          comp.nextEscalationAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

          const role = roles[targetLevel];
          let targetStaffId = null;
          if (role) {
            const fieldName = `${role === "supervisor" ? "supervisor" : role}Id`;
            if (!comp[fieldName]) {
              const staff = await Staff.findOne({
                officeId: comp.officeId,
                role: role,
              });
              if (staff) {
                comp[fieldName] = staff._id;
                targetStaffId = staff._id;
              }
            } else {
              targetStaffId = comp[fieldName];
            }
          }

          const prevAuthName = authorityNames[oldLevel];
          const newAuthName = authorityNames[targetLevel];

          comp.escalationHistory.push({
            escalationTime: now,
            prevLevel: oldLevel,
            newLevel: targetLevel,
            prevAuthority: prevAuthName,
            newAuthority: newAuthName,
            statusChange: `Escalated to Level ${targetLevel} (${newAuthName})`,
            resolutionTime: null,
          });

          updated = true;
          escalatedCount++;

          if (io) {
            if (comp.citizenId) {
              io.to(`citizen_${comp.citizenId}`).emit(
                "complaint_notification",
                {
                  type: "ESCALATED",
                  message: `Your complaint has been automatically escalated to ${newAuthName}!`,
                  complaintId: comp._id,
                },
              );
            }

            if (targetStaffId) {
              io.to(`driver_${targetStaffId}`).emit("new_job_alert", {
                title: "🚨 JAES Escalated Complaint!",
                message: `Complaint #${comp._id.toString().slice(-6)} has been escalated to you: ${comp.description}`,
                newStop: {
                  id: comp.dustbinId || comp._id,
                  name: `🚨 Escalated: ${comp.area}`,
                  coordinates: [comp.latitude, comp.longitude],
                  status: "overflow",
                  type: "complaint",
                  isNew: true,
                  complaintId: comp._id,
                },
                imageUrl: comp.ComimageUrl,
              });
            }

            io.emit("complaint_status_update", {
              type: "ESCALATED",
              complaintId: comp._id,
              level: targetLevel,
              authority: newAuthName,
            });
          }
        } else if (oldLevel === 5) {
          if (!comp.publicEscalationEligible) {
            comp.publicEscalationEligible = true;
            comp.nextEscalationAt = null;
            updated = true;

            if (io && comp.citizenId) {
              io.to(`citizen_${comp.citizenId}`).emit(
                "complaint_notification",
                {
                  type: "PUBLIC_ELIGIBLE",
                  message:
                    "Your complaint is now eligible for public sharing on social media!",
                  complaintId: comp._id,
                },
              );
            }
          }
        }
      }

      if (updated || comp.isModified("pendingDays")) {
        await comp.save();
      }
    }
    return { success: true, escalatedCount };
  } catch (error) {
    console.error("❌ JAES Escalation Cron Error:", error);
    return { success: false, error: error.message };
  }
};

// ---------------- Vercel Cron Endpoints ----------------
app.get("/api/cron/reset-dustbins", async (req, res) => {
  const result = await resetDailyDustbins();
  res.json(result);
});

app.get("/api/cron/check-offline-vehicles", async (req, res) => {
  const result = await checkInactiveVehicles();
  res.json(result);
});

app.get("/api/cron/escalate-complaints", async (req, res) => {
  const result = await escalateComplaints();
  res.json(result);
});

// ---------------- Continuous Cron Jobs ----------------
cron.schedule("0 4 * * *", resetDailyDustbins, {
  scheduled: true,
  timezone: "Asia/Kolkata",
});

cron.schedule("*/2 * * * *", checkInactiveVehicles);

cron.schedule("*/1 * * * *", escalateComplaints);

// GET /public-list
app.get("/public-list", async (req, res) => {
  try {
    const offices = await Office.find({}, "cityName _id");
    res.json({
      success: true,
      cities: offices.map((o) => ({
        id: o._id,
        name: o.cityName,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check endpoint (Used by Northflank readiness/liveness probes)
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    domain: "safaimitra.online",
  });
});

// Start HTTP & Socket.IO server
const PORT = process.env.PORT || 5001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SafaiMitra Backend running on 0.0.0.0:${PORT} (Socket.io Enabled)`);
});

// Graceful Shutdown for Northflank / Container orchestrators
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log("🔒 HTTP & WebSocket server closed.");
    try {
      await mongoose.connection.close(false);
      console.log("🍃 MongoDB connection closed.");
    } catch (e) {
      console.error("Error closing MongoDB:", e);
    }
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
