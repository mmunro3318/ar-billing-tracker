const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "ar-billing-tracker-server" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
