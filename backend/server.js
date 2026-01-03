const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World!");
});

const PORT = process.env.PORT;

mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("Mongo DB Connected Successfully"))
        .catch((err) => console.log("Failed to connect to MongoDB:", err));

app.listen(PORT, () => {
    console.log(`Server listening at port ${PORT}`);
});