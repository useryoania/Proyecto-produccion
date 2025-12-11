import React from 'react';
// IMPORTANTE: Verifica que esta ruta apunte a donde guardaste AreaView.jsx
// Según tus archivos anteriores, está en pages:
import AreaView from '../areas/AreaView'; 
import { areaConfigs } from '../../utils/configs/areaConfigs';

const ECOUVArea = (props) => {
    // Verificación de seguridad
    if (!areaConfigs.ECOUV) {
        return <div style={{padding: 20, color: 'red'}}>Error: Falta configurar ECOUV en areaConfigs.js</div>;
    }

    // Este componente ahora solo sirve para llamar a la Vista Maestra
    return (
        <AreaView 
            areaKey="ECOUV" 
            areaConfig={areaConfigs.ECOUV} 
            {...props} 
        />
    );
};

export default ECOUVArea;