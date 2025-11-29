import React from "react";
import { areaConfigs } from "../../utils/configs/areaConfigs";
import { useAreaManagement } from "../../hooks/useAreaManagment";
import AreaView from "./AreaView";
import { useOrders } from "../../hooks/useOrders";

export default function AreaGenerica({ areaKey }) {
  console.log("👉 [AreaGenerica] areaKey:", areaKey);

  const areaConfig = areaConfigs[areaKey];
  const { filters, updateFilter, views, switchView } =
    useAreaManagement(areaKey);

  const { orders } = useOrders(filters);

  return (
    <AreaView
      areaKey={areaKey}
      areaConfig={areaConfig}
      orders={orders}
      filters={filters}
      updateFilter={updateFilter}
      views={views}
      switchView={switchView}
    />
  );
}
