const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const auth = require("./middleware/authMiddleware");

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Connect to DB
connectDB();

// Routes
app.use("/api/auth", require("./routes/authRoutes"));

// Protected Test Route
app.get("/dashboard", auth, (req, res) => {
  res.json({ message: `Welcome ${req.user.role}` });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening at port ${PORT}`);
});
