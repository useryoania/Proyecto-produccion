import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Importar vistas
import Home from './views/Home';
import About from './views/About';
import Data from './views/Data';
import BaseDeposito from './views/BaseDeposito';
import Cargadedeposito from './views/carga_de_deposito';
import TiketDeEntrega from './views/tiket_de_entrega';
import Clientesespeciales from './views/clientes_especiales';
import Preciosdeproductos from './views/precios_de_productos';
import Descuentoyrecargos from './views/descuento_y_recargos';
import Facturaclientessemanales from './views/Factura_clientes_semanales';
import Ticketautogestion from './views/ticket_autogestion';
import Entregadepedido from './views/entrega_de_pedido';
import Login from './views/Login';
import RecepcionDeEntrega from './views/RecepcionDeEntrega';
import Aviso from './views/aviso';
import Caja from './views/caja';
import Pestock from './views/pedido_de_stock';
import Cliente from './views/cliente';
import ODR from './views/ordenes_de_retiro';
import PDR from './views/pantalla_de_recepcion';
import RegisterAdmin from './views/RegisterAdmin';
import ControlVentas from './views/ControlVentas';
import Entregacord from './views/entrega_coordinada';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register-admin" element={<RegisterAdmin />} />

        {/* Rutas protegidas para Publico */}
        <Route
          path="/ticket_autogestion"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'Publico', 'Cajero/a', 'Atención al Cliente']}><Ticketautogestion /></ProtectedRoute>}
        />
        <Route
          path="/RecepcionDeEntrega"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'OP Depósito']}><RecepcionDeEntrega /></ProtectedRoute>}
        />

        {/* Rutas protegidas para Administrativo/a y Operario */}
        <Route
          path="/"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'Cajero/a', 'Atención al Cliente', 'OP Depósito']}><Home /></ProtectedRoute>}
        />
        <Route
          path="/data"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a']}><Data /></ProtectedRoute>}
        />        
        <Route
          path="/ControlVentas"
          element={<ProtectedRoute allowedRoles={['Super Usuario']}><ControlVentas /></ProtectedRoute>}
        />                
        <Route
          path="/about"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'Cajero/a', 'Atención al Cliente', 'OP Depósito']}><About /></ProtectedRoute>}
        />
        <Route
          path="/BaseDeposito"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a','OP Depósito','Cajero/a','Atención al Cliente','Publico']}><BaseDeposito /></ProtectedRoute>}
        />
        <Route
          path="/carga_de_deposito"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'OP Depósito']}><Cargadedeposito /></ProtectedRoute>}
        />
        <Route
          path="/tiket_de_entrega"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'Cajero/a', 'Atención al Cliente']}><TiketDeEntrega /></ProtectedRoute>}
        />
        <Route
          path="/clientes_especiales"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a']}><Clientesespeciales /></ProtectedRoute>}
        />
        <Route
          path="/precios_de_productos"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a','Cajero/a']}><Preciosdeproductos /></ProtectedRoute>}
        />
        <Route
          path="/descuento_y_recargos"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a']}><Descuentoyrecargos /></ProtectedRoute>}
        />
        <Route
          path="/Factura_clientes_semanales"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a']}><Facturaclientessemanales /></ProtectedRoute>}
        />
        <Route
          path="/entrega_de_pedido"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'OP Depósito']}><Entregadepedido /></ProtectedRoute>}
        />
        <Route
          path="/aviso"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'Cajero/a', 'Atención al Cliente']}><Aviso /></ProtectedRoute>}
        />
        <Route
          path="/caja"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'Cajero/a']}><Caja /></ProtectedRoute>}
        />
        <Route
          path="/pedido_de_stock"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a']}><Pestock /></ProtectedRoute>}
        />
        <Route
          path="/cliente"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a','Cajero/a']}><Cliente /></ProtectedRoute>}
        />
        <Route
          path="/ordenes_de_retiro"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a','Cajero/a']}><ODR /></ProtectedRoute>}
        />
        <Route
          path="/pantalla_de_recepcion"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'Publico']}><PDR /></ProtectedRoute>}
        />
        <Route
          path="/entrega_coordinada"
          element={<ProtectedRoute allowedRoles={['Super Usuario', 'Administrativo/a', 'Publico']}><Entregacord /></ProtectedRoute>}
        />
      </Routes>
    </Router>
  );
}

export default App;
