import { dtfRenderers } from "../renderers/dtfRenderers.js";
import bordadoRenderers from "../renderers/bordadoRenderers.js";
import commonRenderers from "../renderers/commonRenderers.js";
import dtfRowRenderer from "./dtfRowRenderer";


export function getFieldRenderer(areaKey) {
  switch (areaKey) {
    case "DTF":
      return dtfRenderers;
    case "BORD":
      return bordadoRenderers;
    default:
      return commonRenderers;
  }
}

export { dtfRenderers, bordadoRenderers, commonRenderers };
