const express = require("express");
const routes = require("./routes");
const { UPLOAD_DIR } = require("./upload");

const app = express();
app.use(express.json());
app.get("/health", (req, res) => res.json({ status: "ok", service: "submission-service" }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(routes);

module.exports = app;
