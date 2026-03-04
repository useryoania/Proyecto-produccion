import React, { useEffect, useState } from 'react';
import '../aspecto/ControlVentas.css';
import { initializeSocket } from "../utils/socket";
import { TextField, Button, Box, Modal, Typography } from '@mui/material';
import Select from 'react-select';

function ControlVentas() {
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [columns] = useState([
    { key: 'CodigoOrden', label: 'CÓDIGO ORDEN' },
    { key: 'SubMarca', label: 'SUB MARCA' },
    { key: 'Producto', label: 'PRODUCTO' },
    { key: 'Estado', label: 'ESTADO' },
    { key: 'Cantidad', label: 'CANTIDAD' },
    { key: 'CostoFinal', label: 'COSTO FINAL' },
    { key: 'DescuentoAplicado', label: 'DESCUENTO APLICADO' },
    { key: 'Modo', label: 'MODO' },
    { key: 'FechaIngresoOrden', label: 'FECHA INGRESO ORDEN' }
  ]);

  const [totalPesos, setTotalPesos] = useState(0);
  const [totalDolares, setTotalDolares] = useState(0);
  
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [commissionAmount, setCommissionAmount] = useState({ pesos: 0, dolares: 0 });
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [estadosOrden, setEstadosOrden] = useState([]);
  const [subMarcas, setSubMarcas] = useState([]);
  const [filters, setFilters] = useState({
    codigoCliente: '',
    estados: [],
    fechaDesde: '',
    fechaHasta: '',
    codigoOrden: '',
    subMarcas: []  // 🔹 Ahora subMarcas es un array para permitir selección múltiple
  });

  useEffect(() => {
    fetchEstadosOrdenes();
    fetchSubMarcas();

    const socket = initializeSocket();

    socket.on("actualizado", () => {
      console.log("Evento recibido: actualizando órdenes");
      fetchAllOrders(filters);
      fetchEstadosOrdenes();
      fetchSubMarcas();
    });

    return () => {
      socket.off("actualizado");
      socket.disconnect();
    };
  }, []);

  const fetchEstadosOrdenes = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/estados/list`);
      if (!response.ok) throw new Error("Error al obtener los estados de órdenes");
      const data = await response.json();
      setEstadosOrden(data);
    } catch (error) {
      console.error("Error al obtener estados de órdenes:", error);
    }
  };

  const fetchSubMarcas = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiproducto/categories`);
      if (!response.ok) throw new Error("Error al obtener las sub marcas");
      const data = await response.json();
      setSubMarcas(data);
    } catch (error) {
      console.error("Error al obtener las sub marcas:", error);
    }
  };

  const fetchAllOrders = async (filters = {}) => {
    const queryParams = new URLSearchParams();
  
    if (filters.codigoCliente) queryParams.append("codigoCliente", filters.codigoCliente);
    if (filters.codigoOrden) queryParams.append("codigoOrden", filters.codigoOrden);
    if (filters.fechaDesde) queryParams.append("fechaDesde", filters.fechaDesde);
    if (filters.fechaHasta) queryParams.append("fechaHasta", filters.fechaHasta);
    
    if (filters.estados.length > 0) filters.estados.forEach(estado => queryParams.append("estado", estado.value));
    if (filters.subMarcas.length > 0) filters.subMarcas.forEach(subMarca => queryParams.append("subMarca", subMarca.value));
  
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/datafilter?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Error al obtener órdenes");
      const data = await response.json();
      
      if (Array.isArray(data)) {
        console.log("Órdenes filtradas recibidas:", data);
        setOrders(data);
  
        // 🔹 Calcular totales en pesos y dólares
        let totalPesos = 0;
        let totalDolares = 0;
  
        data.forEach(order => {
          const cost = parseFloat(order.CostoFinal) || 0;
          if (order.MonSimbolo === "$") {
            totalPesos += cost;
          } else if (order.MonSimbolo === "USD") {
            totalDolares += cost;
          }
        });
  
        setTotalPesos(totalPesos);
        setTotalDolares(totalDolares);
      } else {
        console.error("La respuesta no es un array de órdenes", data);
      }
    } catch (error) {
      console.error("Error al obtener órdenes:", error);
    }
  };  

  const resetFilters = () => {
    setFilters({
      codigoCliente: '',
      estados: [],
      fechaDesde: '',
      fechaHasta: '',
      codigoOrden: '',
      subMarcas: []
    });
    setOrders([]);
    setTotalPesos(0);
    setTotalDolares(0);
    setCommissionPercentage('');
    setCommissionAmount({ pesos: 0, dolares: 0 }); 
     
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({ ...prevFilters, [name]: value }));
  };

  const handleEstadoChange = (selectedOptions) => {
    setFilters(prevFilters => ({ ...prevFilters, estados: selectedOptions || [] }));
  };

  const handleSubMarcaChange = (selectedOptions) => {
    setFilters(prevFilters => ({ ...prevFilters, subMarcas: selectedOptions || [] }));
  };

  const handleCommissionChange = (e) => {
    const percentage = parseFloat(e.target.value);
    setCommissionPercentage(e.target.value);
  
    if (!isNaN(percentage)) {
      setCommissionAmount({
        pesos: (totalPesos * percentage) / 100,
        dolares: (totalDolares * percentage) / 100
      });
    } else {
      setCommissionAmount({ pesos: 0, dolares: 0 });
    }
  };
  
  
  return (
    <div className="CONTBDDPRINCIP">
      <h1 className="CONTBDDEP1">Control de ventas</h1>
      <div className="filters-container">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* 🔹 Primera fila: Filtros de fecha */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Fecha Desde"
            type="date"
            name="fechaDesde"
            value={filters.fechaDesde}
            onChange={handleFilterChange}
            variant="outlined"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Fecha Hasta"
            type="date"
            name="fechaHasta"
            value={filters.fechaHasta}
            onChange={handleFilterChange}
            variant="outlined"
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* 🔹 Segunda fila: Filtros de estados y submarcas */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Select
            isMulti
            options={estadosOrden.map(estado => ({
              value: estado.EOrNombreEstado,
              label: estado.EOrNombreEstado
            }))}
            value={filters.estados}
            onChange={handleEstadoChange}
            placeholder="Seleccione estados..."
          />
          <Select
            isMulti
            options={subMarcas.map(subMarca => ({
              value: subMarca.SMaIdSubMarca,
              label: subMarca.SMaNombreSubMarca
            }))}
            value={filters.subMarcas}
            onChange={handleSubMarcaChange}
            placeholder="Seleccione SubMarcas..."
          />
        </Box>
      </Box>
        <Box sx={{ marginTop: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="contained" color="primary" onClick={() => fetchAllOrders(filters)}>Filtrar</Button>
          <Button variant="outlined" color="secondary" onClick={resetFilters}>Restablecer</Button>
        </Box>
      </div>

      <Box 
        sx={{ 
          marginTop: 2, 
          padding: 2, 
          border: '1px solid #1976d2', 
          borderRadius: '8px', 
          boxShadow: 2, 
          textAlign: 'center',
          backgroundColor: '#f9f9f9'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333', marginBottom: 1 }}>
          Resumen de Órdenes
        </Typography>

        {/* 🔹 Total de órdenes en una fila más pequeña */}
        <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 1 }}>
          <Box sx={{ textAlign: 'center', minWidth: 120 }}>
            <Typography variant="subtitle1">Total Órdenes</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              {orders.length}
            </Typography>
          </Box>
        </Box>

        {/* 🔹 Totales en Pesos y Dólares compactados */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', marginTop: 1 }}>
          <Box sx={{ textAlign: 'center', minWidth: 120 }}>
            <Typography variant="subtitle1">Total Pesos</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
              ${totalPesos.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', minWidth: 120 }}>
            <Typography variant="subtitle1">Total Dólares</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
              USD {totalDolares.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* 🔹 Comisión en una sola línea compacta */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginTop: 1 }}>
          <Box sx={{ textAlign: 'center', minWidth: 120 }}>
            <Typography variant="subtitle1">Comisión (%)</Typography>
            <TextField 
              type="number" 
              value={commissionPercentage} 
              onChange={handleCommissionChange} 
              variant="outlined" 
              size="small"
              sx={{ width: '80px', marginTop: '4px' }}
            />
          </Box>
          <Box sx={{ textAlign: 'center', minWidth: 120 }}>
            <Typography variant="subtitle1">Comisión Calculada</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
              ${commissionAmount.pesos.toFixed(2)}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
              USD {commissionAmount.dolares.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <h2 className="CONTBDDEP8">Órdenes</h2>
      {orders.length === 0 ? <p className="CONTBDDEP9">No hay órdenes disponibles.</p> : (
        <div className="CONTBDDEP10">
          <table className="CONTBDDEP11">
            <thead>
              <tr>
                {columns.map(column => <th key={column.key}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={index} onClick={() => handleSelectOrder(order)}>
                  {columns.map(column => <td key={column.key}>{order[column.key] || ''}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>  
      )}
    </div>
  );
}

export default ControlVentas;
