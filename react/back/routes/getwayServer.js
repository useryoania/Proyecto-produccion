const express = require("express");
const { exec } = require("child_process");
const router = express.Router();

router.post("/restart-server", (req, res) => {
  console.log("🛠 Recibida solicitud para reiniciar el servidor...");

  // Responder al frontend antes de ejecutar el restart
  res.status(200).json({ message: "🌀 Reiniciando servidor..." });

  // Ejecutar el restart en un proceso independiente
  exec("pm2 restart server &", (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error al reiniciar el servidor: ${error.message}`);
      return;
    }
    console.log(`✅ Servidor reiniciado: ${stdout}`);
  });
});

module.exports = router;
