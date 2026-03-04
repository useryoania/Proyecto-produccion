import React, { useEffect, useState } from 'react';
import '../aspecto/BaseDeposito.css';
import { initializeSocket } from "../utils/socket"; // Importa el socket
import { utils, writeFile } from 'xlsx';
import Select from 'react-select';
import { TextField, Button, Box, MenuItem, Modal, Typography } from '@mui/material'; // Material-UI imports

function BaseDeposito() {
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [columns, setColumns] = useState([
    { key: 'CodigoOrden', label: 'CÓDIGO ORDEN' },
    { key: 'SubMarca', label: 'SUB MARCA' },
    { key: 'IdCliente', label: 'ID CLIENTE' },
    { key: 'NombreTrabajo', label: 'NOMBRE TRABAJO' },
    { key: 'Producto', label: 'PRODUCTO' },
    { key: 'Estado', label: 'ESTADO' },
    { key: 'Cantidad', label: 'CANTIDAD' },
    { key: 'PrecioUnitario', label: 'PRECIO UNITARIO' },
    { key: 'CostoFinal', label: 'COSTO FINAL' },
    { key: 'DescuentoAplicado', label: 'DESCUENTO APLICADO' },
    { key: 'Modo', label: 'MODO' },
    { key: 'LugarRetiro', label: 'LUGAR RETIRO' },
    { key: 'FechaIngresoOrden', label: 'FECHA INGRESO ORDEN' },
    { key: 'OrdNotaCliente', label: 'NOTA CLIENTE' }
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [estadosOrden, setEstadosOrden] = useState([]);
  const [filters, setFilters] = useState({
    codigoCliente: '',
    estados: [],
    fechaDesde: '',
    fechaHasta: '',
    codigoOrden: ''
  });

  useEffect(() => {
    fetchEstadosOrdenes(); // Cargar los estados

    // Inicializar socket
    const socket = initializeSocket();

    // Suscribirse al evento "actualizado"
    socket.on("actualizado", () => {
      console.log("Evento recibido: actualizando órdenes");
      fetchAllOrders();
      fetchEstadosOrdenes(); // Cargar los estados
    });

    // Cleanup: desconectar socket al desmontar el componente
    return () => {
      socket.off("actualizado"); // Desuscribirse del evento
    };
  }, []); // Solo se ejecuta una vez al montar

  const fetchEstadosOrdenes = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/estados/list`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al obtener los estados de órdenes');
        }
        return response.json();
      })
      .then((data) => {
        setEstadosOrden(data);
      })
      .catch((error) => console.error('Error al obtener estados de órdenes:', error));
  };

  const fetchAllOrders = (filters = {}) => {
    const hasFilters =
      filters.codigoCliente ||
      filters.codigoOrden ||
      filters.fechaDesde ||
      filters.fechaHasta ||
      (filters.estados && filters.estados.length > 0);
  
    if (!hasFilters) {
      return;
    }
  
    const queryParams = new URLSearchParams();
  
    if (filters.codigoCliente) queryParams.append("codigoCliente", filters.codigoCliente);
    if (filters.codigoOrden) queryParams.append("codigoOrden", filters.codigoOrden);
    if (filters.fechaDesde) queryParams.append("fechaDesde", filters.fechaDesde);
    if (filters.fechaHasta) queryParams.append("fechaHasta", filters.fechaHasta);
    if (filters.estados && filters.estados.length > 0) {
      filters.estados.forEach((estado) => queryParams.append("estado", estado.value));
    }
  
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/datafilter?${queryParams.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error("Error al obtener órdenes");
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          console.log("Órdenes filtradas recibidas:", data);
          setOrders(data);
        } else {
          console.error("La respuesta no es un array de órdenes", data);
        }
      })
      .catch((error) => console.error("Error al obtener órdenes:", error));
  };  

  const resetFilters = () => {
    setFilters({
      codigoCliente: '',
      estados: [],
      fechaDesde: '',
      fechaHasta: '',
      codigoOrden: ''
    });
    setOrders([]); // Limpia las órdenes en el estado
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
    setFilters((prevFilters) => ({ ...prevFilters, [name]: value }));
  };

  const handleEstadoChange = (selectedOptions) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      estados: selectedOptions || [],
    }));
  };

  const handleDownloadExcel = () => {
    const filteredOrders = orders
    .filter((order) => order.ExportadoOdoo === false) // Filtrar órdenes donde ExportaOdoo es false
    .map((order) => ({
      'Líneas del pedido/Producto': order.CodigoOdoo + (order.Modo === 'Normal' ? 'N' : order.Modo === 'Urgente' ? 'U' : ''),
      'Referencia del pedido': order.CodigoOrden,
      'Líneas del pedido/Cantidad': order.Cantidad ? parseFloat(order.Cantidad) : 0,
      'Cliente': order.IdCliente,
      'Referencia cliente': order.NombreTrabajo,
      'Modo': order.Modo,
    }));

    if (filteredOrders.length > 0) {
      const worksheet = utils.json_to_sheet(filteredOrders);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Órdenes');
      writeFile(workbook, 'Ordenes.xlsx');  
      
      // Llamar a la API para actualizar el estado de las órdenes exportadas
      try {
        const orderIds = orders
          .filter((order) => order.ExportadoOdoo === false)
          .map((order) => order.IdOrden);
      
        const token = localStorage.getItem('token');
        if (!token) {
          alert('No se encontró un token de autorización. Por favor, inicie sesión nuevamente.');
          return;
        }
      
        fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/actualizarExportacion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderIds }),
        })
          .then((response) => {
            if (!response.ok) {
              return response.json().then((error) => {
                console.error('Error al actualizar las órdenes:', error);
                alert(error.message || 'No se pudo actualizar el estado de las órdenes.');
              });
            } else {
              alert('Órdenes exportadas y actualizadas correctamente.');
            }
          })
          .catch((error) => {
            console.error('Error al actualizar las órdenes:', error);
            alert('Hubo un problema al intentar actualizar las órdenes.');
          });
      } catch (error) {
        console.error('Error en el bloque try-catch:', error);
        alert('Error inesperado al intentar actualizar las órdenes.');
      }
    } else {
      alert('No existen ordenes a exportar');
    }   
  };

  const handleDeleteOrders = () => {
    const selectedOrderIds = selectedOrders.map((index) => orders[index].IdOrden);
    const token = localStorage.getItem("token");
  
    if (selectedOrderIds.length === 0) {
      alert("No hay órdenes seleccionadas para eliminar.");
      return;
    }
  
    if (!window.confirm("¿Estás seguro de que deseas eliminar las órdenes seleccionadas?")) {
      return;
    }
  
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/eliminar`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderIds: selectedOrderIds }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error al eliminar órdenes");
        }
        return response.json();
      })
      .then((data) => {
        alert(data.message || "Órdenes eliminadas correctamente");
      
        // Limpia la selección antes de actualizar la tabla
        setSelectedOrders([]);

        // Usa el estado actual de los filtros para recargar las órdenes
        setFilters((prevFilters) => {
          fetchAllOrders(prevFilters);
          return prevFilters; // Mantener los filtros sin cambios
        });
      })
      .catch((error) => {
        console.error("Error al eliminar órdenes:", error);
        alert("Hubo un problema al eliminar las órdenes.");
      });
  };  

  const handleUpdateEstado = () => {
    const selectedOrderIds = selectedOrders.map((index) => orders[index].IdOrden);
    const token = localStorage.getItem('token');

    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/actualizarEstado`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderIds: selectedOrderIds,
        nuevoEstado: nuevoEstado,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al actualizar el estado de las órdenes');
        }
        return response.json();
      })
      .then((data) => {
        alert(data.message || 'Estados actualizados correctamente');
        fetchAllOrders(); // Recargar las órdenes después de actualizar
      })
      .catch((error) => {
        console.error('Error al actualizar estados:', error);
        alert('Hubo un problema al actualizar los estados.');
      });
  };

  return (
    <div className="CONTBDDPRINCIP">
      <h1 className="CONTBDDEP1">Base de Datos de Órdenes</h1>
      <div className="filters-container">
      <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          label="Código Cliente"
          name="codigoCliente"
          value={filters.codigoCliente}
          onChange={handleFilterChange}
          variant="outlined"
          sx={{ flex: 1 }}
        />
        <TextField
          label="Código Orden"
          name="codigoOrden"
          value={filters.codigoOrden}
          onChange={handleFilterChange}
          variant="outlined"
          sx={{ flex: 1 }}
        />
        <TextField
          label="Fecha Desde"
          type="date"
          name="fechaDesde"
          value={filters.fechaDesde}
          onChange={handleFilterChange}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Fecha Hasta"
          type="date"
          name="fechaHasta"
          value={filters.fechaHasta}
          onChange={handleFilterChange}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1 }}
        />
      </Box>

      {/* 🔹 Segunda fila - Botones de acción principal */}
      <Box sx={{ marginTop: 2, display: 'flex', flexWrap: 'nowrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Select
          isMulti
          options={estadosOrden.map((estado) => ({
            value: estado.EOrNombreEstado,
            label: estado.EOrNombreEstado,
          }))}
          value={filters.estados}
          onChange={handleEstadoChange}
          placeholder="Seleccione estados..."
          styles={{ container: (base) => ({ ...base, flex: 1 }) }}
        />
      </Box>

      {/* 🔹 Tercera fila - Botones de filtrar */}
      <Box sx={{ marginTop: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="contained" color="primary" onClick={() => fetchAllOrders(filters)}>
          Filtrar
        </Button>
        <Button variant="outlined" color="secondary" onClick={resetFilters}>
          Restablecer
        </Button>
        <Button variant="contained" color="success" onClick={handleDownloadExcel}>
          Descargar Excel
        </Button>
      </Box>

      {/* 🔹 Cuarta fila - Acciones de orden */}
      <Box sx={{ marginTop: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Select
          placeholder="Nuevo estado"
          options={estadosOrden.map((estado) => ({
            value: estado.EOrNombreEstado,
            label: estado.EOrNombreEstado,
          }))}
          onChange={(selectedOption) => setNuevoEstado(selectedOption.value)}
          styles={{ container: (base) => ({ ...base, width: 200 }) }}
        />
        <Button
          variant="contained"
          color="success"
          onClick={handleUpdateEstado}
          disabled={selectedOrders.length === 0 || !nuevoEstado}
        >
          Actualizar Estado
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteOrders}
          disabled={selectedOrders.length === 0}
        >
          Eliminar Órdenes
        </Button>
      </Box>

      </div>

      <h2 className="CONTBDDEP8">Órdenes</h2>
      {orders.length === 0 ? (
        <p className="CONTBDDEP9">No hay órdenes disponibles.</p>
      ) : (
        <div className="CONTBDDEP10">
          <table className="CONTBDDEP11">
          <thead>
          <tr>
            <th className="CONTBDDEP12"> 
              <input
                type="checkbox"
                className="CONTBDDEP14"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedOrders(orders.map((_, index) => index)); // Selecciona todas las filas
                  } else {
                    setSelectedOrders([]); // Deselecciona todas las filas
                  }
                }}
                checked={selectedOrders.length === orders.length && orders.length > 0} // Marca el checkbox si todas las filas están seleccionadas
              /> SELECCIONAR
            </th>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
          <tbody>
            {orders.map((order, rowIndex) => (
              <tr key={rowIndex}>
                <td className="CONTBDDEP13">
                  <input
                    type="checkbox"
                    className="CONTBDDEP14"
                    checked={selectedOrders.includes(rowIndex)}
                    onChange={(e) => {
                      e.stopPropagation(); // Evita que el modal se abra
                      const updatedSelection = e.target.checked
                        ? [...selectedOrders, rowIndex]
                        : selectedOrders.filter((i) => i !== rowIndex);
                      setSelectedOrders(updatedSelection);
                    }}
                  />
                </td>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    onClick={() => handleSelectOrder(order)} // Ahora el modal solo se abre al hacer clic en otras celdas
                  >
                    {order[column.key] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <Modal open={modalVisible} onClose={handleCloseModal}>
        <Box
          sx={{
            padding: 4,
            backgroundColor: 'white',
            margin: 'auto',
            marginTop: '5%',
            width: '80%', // Define un ancho del 80% de la pantalla
            maxWidth: '1000px', // Establece un máximo para el ancho
            borderRadius: '10px', // Bordes redondeados
            boxShadow: 24, // Sombra para dar profundidad
            overflowY: 'auto', // Habilita el scroll vertical si el contenido es muy alto
          }}
        >
          {selectedOrder && (
            <>
              <Typography variant="h6" sx={{ marginBottom: 2 }}>
                Detalles de la Orden
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {columns.map((column) => (
                  <Box
                    key={column.key}
                    sx={{
                      flex: '1 1 30%', // Ocupa aproximadamente el 30% del ancho disponible
                      minWidth: '200px', // Asegura un ancho mínimo
                    }}
                  >
                    <Typography variant="subtitle2">
                      <strong>{column.label}:</strong>
                    </Typography>
                    <Typography variant="body1">{selectedOrder[column.key]}</Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </div>
  );
}

export default BaseDeposito;
