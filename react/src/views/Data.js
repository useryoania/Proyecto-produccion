import React, { useState } from "react";

const RestartServer = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRestart = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiserver/restart-server`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Servidor reiniciado correctamente.");
      } else {
        setMessage(`❌ Error: ${data.error || "No se pudo reiniciar el servidor."}`);
      }
    } catch (error) {
      setMessage("❌ Error al conectarse al servidor.");
    }

    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <button
        onClick={handleRestart}
        disabled={loading}
        style={{
          padding: "15px 30px",
          fontSize: "18px",
          backgroundColor: "#007BFF",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? "Reiniciando..." : "Reiniciar Servidor"}
      </button>
      
      {message && <p style={{ marginTop: "20px", fontSize: "16px", fontWeight: "bold" }}>{message}</p>}
    </div>
  );
};

export default RestartServer;
