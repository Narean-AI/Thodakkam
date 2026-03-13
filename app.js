const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const analyzeRoute = require("./routes/analyzeRoute");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/", analyzeRoute);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Placement agent system running on port ${PORT}`);
});
