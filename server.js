const express = require("express");
const path = require("path");

const app = express();

// supaya css, js, models, assets, stickers bisa diakses browser
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});