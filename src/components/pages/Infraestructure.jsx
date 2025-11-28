import React from 'react';

const Infraestructure = () => {
  return (
    <div style={{ padding: '20px', flex: 1 }}>
      <h1>🏗️ Infraestructura</h1>
      <p>Gestión de infraestructura y recursos del sistema</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '15px',
        marginTop: '20px'
      }}>
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3>🖥️ Servidores</h3>
          <p>Estado: Activo</p>
        </div>
        
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3>📊 Base de Datos</h3>
          <p>Estado: Activo</p>
        </div>
        
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3>🌐 Red</h3>
          <p>Estado: Estable</p>
        </div>
      </div>
    </div>
  );
};

export default Infraestructure;