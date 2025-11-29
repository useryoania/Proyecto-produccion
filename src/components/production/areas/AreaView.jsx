// src/components/areas/AreaView.jsx
import React from "react";
import AreaFilters from "../components/AreaFilters";
import ProductionTable from "../components/ProductionTable";

// Si quieres que AreaView tenga su propio CSS por defecto,
// este import se usará si no se pasa `styles` desde AreaGenerica.
import defaultStyles from "./AreaView.module.css";

/**
 * AreaView
 * Props esperadas:
 * - areaKey
 * - areaConfig
 * - orders
 * - filters
 * - updateFilter (fn)
 * - views { currentView: 'table' | 'kanban' }
 * - switchView (fn)
 * - styles (opcional) -> CSS module inyectado por AreaGenerica
 */
export default function AreaView({
  areaKey,
  areaConfig,
  orders = [],
  filters = {},
  updateFilter = () => {},
  views = { currentView: "table" },
  switchView = () => {},
  styles: injectedStyles,
}) {
  // Usar el CSS recibido desde AreaGenerica si existe, si no usar el default.
  const styles = injectedStyles || defaultStyles;

  if (!areaConfig) {
    console.error("❌ AreaView: areaConfig no encontrado para areaKey=", areaKey);
    return <div style={{ padding: 20 }}>Error: configuración del área no encontrada.</div>;
  }

  // Seguridad: funciones de filtro pueden estar nombradas de otra forma,
  // por eso AreaFilters usa onFilterChange. Adaptamos para que no rompa.
  const onFilterChange = (key, value) => {
    if (typeof updateFilter === "function") updateFilter(key, value);
    else console.warn("⚠ updateFilter no es función");
  };

  return (
    <div className={styles.areaContainer ?? ""}>

      {/* HEADER SUPERIOR */}
      <div className={styles.headerContainer ?? ""}>

        <div>
          <div className={styles.breadcrumb ?? ""}>
            PRODUCCIÓN / {areaConfig.name}
          </div>
          <h1 className={styles.areaTitle ?? ""}>{areaConfig.name}</h1>
        </div>

        <div className={styles.headerButtons ?? ""}>
          <button className={styles.buttonConfig ?? ""}>⚙ Config.</button>
          <button className={styles.buttonInsumos ?? ""}>📦 Insumos</button>
          <button className={styles.buttonFalla ?? ""}>⚠ Falla</button>
          <button className={styles.buttonNuevaOrden ?? ""}>＋ Nueva Orden</button>
        </div>
      </div>

      {/* TABS (Producción / Punto Logístico) */}
      <div className={styles.tabsContainer ?? ""} style={{ marginLeft: "1.5rem", marginTop: "1rem" }}>
        <button
          className={views.currentView === "table" ? styles.tabButtonActive ?? "" : styles.tabButton ?? ""}
          onClick={() => switchView("table")}
        >
          Producción
        </button>

        <button
          className={views.currentView === "kanban" ? styles.tabButtonActive ?? "" : styles.tabButton ?? ""}
          onClick={() => switchView("kanban")}
        >
          Punto logístico
        </button>
      </div>

      {/* BARRA SUPERIOR INTERNA: selector de máquina + filtros rápidos */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0.75rem 1.5rem" }}>
        {/* Selector de máquinas (si el área tiene printers/machines configuradas) */}
        {areaConfig.printers && Array.isArray(areaConfig.printers) && (
          <select
            className={styles.machineSelect ?? ""}
            value={filters.printer ?? ""}
            onChange={(e) => onFilterChange("printer", e.target.value)}
          >
            <option value="">Todas las máquinas</option>
            {areaConfig.printers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {/* Puedes añadir aquí botones adicionales (tabs de modo) si los quieres */}
        <div style={{ marginLeft: "auto" }} />
      </div>

      {/* FILTROS: AreaFilters maneja common + unique */}
      <div className={styles.filtersRow ?? ""}>
        <AreaFilters
          areaConfig={areaConfig}
          filters={filters}
          onFilterChange={onFilterChange}
        />
      </div>

      {/* CONTENEDOR PRINCIPAL: Tabla o Kanban */}
      <div className={styles.tableWrapper ?? ""}>
        {views.currentView === "table" ? (
          <ProductionTable
            areaConfig={areaConfig}
            orders={orders}
            // si tu ProductionTable necesita otras props como selectedOrders,
            // onToggleSelection, pásalas aquí.
          />
        ) : (
          // Placeholder seguro para Kanban (a reemplazar cuando tengas KanbanView)
          <div style={{ padding: 24 }}>
            <h3 style={{ margin: 0 }}>Punto logístico / Kanban</h3>
            <p style={{ color: "#6b7280" }}>
              Aún no hay vista Kanban implementada. Puedes integrar tu componente
              `KanbanView` aquí cuando lo tengas: &nbsp;
              <code>{`<KanbanView areaConfig={areaConfig} orders={orders} />`}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
