import React from 'react';
// Importamos la vista maestra compartida
import AreaView from '../areas/AreaView';
import { areaConfigs } from '../../common/configs/areaConfigs';

const DTFArea = (props) => {
    // Verificación de configuración
    if (!areaConfigs.DTF) {
        return <div className="p-4 text-red-500 font-bold">Error: Falta configurar DTF en areaConfigs.js</div>;
    }

    // Retorna la vista maestra configurada específicamente para DTF
    // Manteniendo la independencia del proceso como se solicitó
    return (
        <AreaView
            areaKey="DTF"
            areaConfig={areaConfigs.DTF}
            {...props}
        />
    );
};

export default DTFArea;
