// src/components/production/areas/AreaGenerica.jsx
import React from "react";
import { useProduction } from "../context/ProductionContext";  // ✔ RUTA CORRECTA
import { areaConfigs } from "../../utils/configs/areaConfigs";  // ✔ RUTA CORRECTA

import AreaFilters from '../../production/components/AreaFilters';
import ProductionTable from '../base/ProductionTable';
import RollSidebar from "../sidebars/RollSidebar";              // ✔ RUTA CORRECTA

const GenericArea = ({ areaKey }) => {
  const { orders } = useProduction();

  const areaConfig = areaConfigs[areaKey];

  if (!areaConfig) {
    return (
      <div style={{ padding: 20 }}>
        <h2>⚠ Área no configurada: {areaKey}</h2>
        <p>Agrega este área en areaConfigs.js</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">

      {areaConfig.sidebar?.enabled && (
        <div className="w-64 border-r bg-white">
          <RollSidebar areaKey={areaKey} orders={orders} />
        </div>
      )}

      <div className="flex-1 p-4 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">{areaConfig.name}</h1>

        <AreaFilters areaKey={areaKey} />
        <ProductionTable areaKey={areaKey} />
      </div>
    </div>
  );
};

export default GenericArea;
