// CajaRegistradoraComponent.js
import React, { useState, useEffect } from 'react';
import '../aspecto/CajaRegistradora.css';

class CajaRegistradora {
  constructor() {
    this.historial = {};
    this.movimientosDiarios = [];
    this.monedaActual = "$";
    this.cajaAbierta = false;
    this.montoInicial = 0;
    this.montoFinal = 0;
  }

  iniciarCaja(montoInicial) {
    if (this.cajaAbierta) {
      console.log("La caja ya está abierta.");
      return;
    }
    this.cajaAbierta = true;
    this.montoInicial = montoInicial;
    this.movimientosDiarios = [];
    this.historial[new Date().toLocaleDateString()] = [];
    console.log("Caja iniciada correctamente con monto inicial: " + montoInicial);
  }

  cerrarCaja(montoFinal) {
    if (!this.cajaAbierta) {
      console.log("La caja ya está cerrada.");
      return;
    }
    this.cajaAbierta = false;
    this.montoFinal = montoFinal;
    const fecha = new Date().toLocaleDateString();
    this.historial[fecha] = this.movimientosDiarios;
    console.log("Caja cerrada correctamente con monto final: " + montoFinal);
  }

  cambiarMoneda(moneda) {
    if (moneda === "USD" || moneda === "$") {
      this.monedaActual = moneda;
      console.log(`Moneda cambiada a ${moneda}`);
    } else {
      console.log("Moneda no válida. Elija 'USD' o '$'");
    }
  }

  ingresarDinero(cantidad) {
    if (!this.cajaAbierta) {
      console.log("Debe abrir la caja primero.");
      return;
    }
    if (cantidad <= 0) {
      console.log("Ingrese una cantidad válida.");
      return;
    }
    const movimiento = {
      tipo: "Ingreso",
      cantidad,
      moneda: this.monedaActual,
      fecha: new Date().toLocaleTimeString(),
    };
    this.movimientosDiarios.push(movimiento);
    console.log("Ingreso registrado correctamente.");
  }

  egresarDinero(cantidad) {
    if (!this.cajaAbierta) {
      console.log("Debe abrir la caja primero.");
      return;
    }
    if (cantidad <= 0) {
      console.log("Ingrese una cantidad válida.");
      return;
    }
    const movimiento = {
      tipo: "Egreso",
      cantidad,
      moneda: this.monedaActual,
      fecha: new Date().toLocaleTimeString(),
    };
    this.movimientosDiarios.push(movimiento);
    console.log("Egreso registrado correctamente.");
  }
}

const CajaRegistradoraComponent = () => {
  const [caja] = useState(new CajaRegistradora());
  const [movimientos, setMovimientos] = useState([]);
  const [historial, setHistorial] = useState({});
  const [montoInicial, setMontoInicial] = useState(0);
  const [montoFinal, setMontoFinal] = useState(0);
  const [cantidad, setCantidad] = useState(0);
  const [moneda, setMoneda] = useState('$');
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  useEffect(() => {
    actualizarMovimientos();
  }, []);

  const iniciarCaja = () => {
    caja.iniciarCaja(montoInicial);
    actualizarMovimientos();
  };

  const cerrarCaja = () => {
    caja.cerrarCaja(montoFinal);
    actualizarHistorial();
  };

  const cambiarMoneda = (event) => {
    const nuevaMoneda = event.target.value;
    caja.cambiarMoneda(nuevaMoneda);
    setMoneda(nuevaMoneda);
    actualizarMovimientos();
  };

  const ingresarDinero = () => {
    caja.ingresarDinero(cantidad);
    actualizarMovimientos();
  };

  const egresarDinero = () => {
    caja.egresarDinero(cantidad);
    actualizarMovimientos();
  };

  const actualizarMovimientos = () => {
    setMovimientos([...caja.movimientosDiarios]);
  };

  const actualizarHistorial = () => {
    setHistorial({ ...caja.historial });
  };

  const abrirHistorial = () => {
    setMostrarHistorial(true);
  };

  const cerrarHistorial = () => {
    setMostrarHistorial(false);
  };

  return (
    <div className="container">
      <h1>Control de Caja Registradora</h1>
      <div>
        <label>Monto Inicial: </label>
        <input type="number" value={montoInicial} onChange={(e) => setMontoInicial(Number(e.target.value))} />
        <button onClick={iniciarCaja}>Iniciar Caja</button>
      </div>
      <div>
        <label>Monto Final: </label>
        <input type="number" value={montoFinal} onChange={(e) => setMontoFinal(Number(e.target.value))} />
        <button onClick={cerrarCaja}>Cerrar Caja</button>
      </div>
      <div>
        <label>Moneda: </label>
        <select value={moneda} onChange={cambiarMoneda}>
          <option value="$">$</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div>
        <label>Cantidad: </label>
        <input type="number" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} />
        <button onClick={ingresarDinero}>Ingresar Dinero</button>
        <button onClick={egresarDinero}>Egresar Dinero</button>
      </div>

      <h2>Movimientos del Día</h2>
      <ul className="movimientos-list">
        {movimientos.map((movimiento, index) => (
          <li key={index}>
            {movimiento.tipo} de {movimiento.cantidad} {movimiento.moneda} a las {movimiento.fecha}
          </li>
        ))}
      </ul>

      <button onClick={abrirHistorial}>Ver Historial</button>

      {mostrarHistorial && (
        <div className="overlay">
          <div className="historial-popup">
            <h3>Historial</h3>
            {Object.keys(historial).map((fecha) => (
              <div key={fecha}>
                <h4>{fecha}</h4>
                <ul>
                  {historial[fecha].map((movimiento, index) => (
                    <li key={index}>
                      {movimiento.tipo} de {movimiento.cantidad} {movimiento.moneda} a las {movimiento.fecha}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button className="close-button" onClick={cerrarHistorial}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CajaRegistradoraComponent;
