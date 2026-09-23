const app = require("./app");

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`assessment-service REST à l'écoute sur le port ${PORT}`);
});
