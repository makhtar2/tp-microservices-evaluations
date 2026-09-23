const express = require("express");
const routes = require("./routes");

const app = express();
app.use(express.json());
app.get("/health", (req, res) => res.json({ status: "ok", service: "assessment-service" }));
app.use(routes);

module.exports = app;
