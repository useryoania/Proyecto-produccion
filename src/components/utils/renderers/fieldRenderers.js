import {
  dtfRenderers,
  bordadoRenderers,
  commonRenderers,
} from "../configs/areaConfigs.js";

export function getFieldRenderer(areaKey) {
  switch (areaKey) {
    case "DTF":
      return dtfRenderers;
    case "BORDADO":
      return bordadoRenderers;
    default:
      return commonRenderers;
  }
}

export { dtfRenderers, bordadoRenderers, commonRenderers };
