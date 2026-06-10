const fs = require('fs');

const rawMovs = [
  {
      "MovIdMovimiento": 6,
      "MovTipo": "ORDEN",
      "MovConcepto": "ECOUV-13594 11",
      "MovImporte": -8.0156,
      "MovAnulado": false,
      "visualIsVisible": false
  }
];

const movs = rawMovs.filter(m => m.visualIsVisible !== false);

const ordenesPendientes = rawMovs.filter(m => 
  (m.MovTipo === 'ORDEN' || m.MovTipo === 'ORDEN_ANTICIPO') && 
  !m.MovAnulado && 
  Number(m.MovImporte) < 0
);

console.log("movs length:", movs.length);
console.log("ordenesPendientes length:", ordenesPendientes.length);

if (movs.length === 0) {
  console.log("Sin movimientos en el período seleccionado.");
} else {
  console.log("Drawing main table...");
}

if (ordenesPendientes.length > 0) {
  console.log("Drawing ordenes pendientes table...");
}
