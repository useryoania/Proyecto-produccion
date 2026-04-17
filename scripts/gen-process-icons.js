/**
 * Convierte los 4 SVG de proceso en componentes React con currentColor.
 * Por cada archivo: elimina el <defs><style>, el rect de fondo, y reemplaza
 * las clases CSS con fill inline.
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'src', 'assets', 'images');

// Mapeo de clases por archivo (cuál clase es main, light y white/bg)
const configs = [
  {
    file: 'idea.svg',
    compName: 'IdeaIcon',
    // cls-1=#4c7fc7(main), cls-2=#fff(white), cls-3=#a7c7fc(light)
    clsMain: 'cls-1', clsLight: 'cls-3', clsWhite: 'cls-2',
  },
  {
    file: 'diseno.svg',
    compName: 'DisenoIcon',
    // cls-1=#fff(white), cls-2=#1e81ce(main), cls-3=#9bc9ff(light)
    clsMain: 'cls-2', clsLight: 'cls-3', clsWhite: 'cls-1',
  },
  {
    file: 'produccion.svg',
    compName: 'ProduccionIcon',
    // cls-1=#fff(white), cls-2=#1e81ce(main), cls-3=#9bc9ff(light)
    clsMain: 'cls-2', clsLight: 'cls-3', clsWhite: 'cls-1',
  },
  {
    file: 'entrega.svg',
    compName: 'EntregaIcon',
    // cls-1=#c2e3f7(light), cls-2=#fff(white), cls-3=#0c91df(main)
    clsMain: 'cls-3', clsLight: 'cls-1', clsWhite: 'cls-2',
  },
];

function transformSVG(raw, cfg) {
  let svg = raw;

  // 1. Eliminar el bloque <defs>...</defs>
  svg = svg.replace(/<defs>[\s\S]*?<\/defs>/g, '');

  // 2. Eliminar el rect de fondo completo (el que ocupa todo el viewBox)
  svg = svg.replace(/<rect[^>]*class="cls-[0-9]"[^>]*width="[^"]*"[^>]*height="[^"]*"[^>]*\/>/g, '');
  svg = svg.replace(/<rect[^>]*width="[^"]*"[^>]*height="[^"]*"[^>]*class="cls-[0-9]"[^>]*\/>/g, '');

  // 3. Reemplazar clases con fills inline
  // cls main → currentColor
  svg = svg.replace(new RegExp(`class="${cfg.clsMain}"`, 'g'), 'fill="currentColor"');
  // cls light → currentColor 50%
  svg = svg.replace(new RegExp(`class="${cfg.clsLight}"`, 'g'), 'fill="currentColor" opacity="0.5"');
  // cls white → currentColor 15% (detalle sutil, no blanco visible)  
  svg = svg.replace(new RegExp(`class="${cfg.clsWhite}"`, 'g'), 'fill="currentColor" opacity="0.12"');

  // 4. Convertir atributos SVG a camelCase para JSX
  svg = svg.replace(/stroke-width=/g, 'strokeWidth=');
  svg = svg.replace(/stroke-linecap=/g, 'strokeLinecap=');
  svg = svg.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
  svg = svg.replace(/stroke-dasharray=/g, 'strokeDasharray=');
  svg = svg.replace(/data-name=/g, 'dataName=');

  // 5. Quitar el encabezado XML
  svg = svg.replace(/<\?xml[^>]*\?>/g, '').trim();

  // 6. Reemplazar el tag <svg ...> para agregar width/height como props y quitar id
  svg = svg.replace(/<svg([^>]*)>/, (match, attrs) => {
    // Extraer viewBox
    const vbMatch = attrs.match(/viewBox="([^"]*)"/);
    const viewBox = vbMatch ? vbMatch[1] : '0 0 100 100';
    return `<svg viewBox="${viewBox}" width={size} height={size} className={className} style={style}>`;
  });

  return svg;
}

const components = configs.map(cfg => {
  const raw = fs.readFileSync(path.join(BASE, cfg.file), 'utf8');
  const body = transformSVG(raw, cfg);

  return `
export function ${cfg.compName}({ size = 80, className = '', style = {} }) {
  return (
    ${body}
  );
}`;
});

const output = `// Iconos del flujo Idea → Diseño → Producción → Entrega
// Autogenerado por scripts/gen-process-icons.js
// Todos usan currentColor — controlá el color desde el padre con CSS color: '#00AEEF'
/* eslint-disable */

${components.join('\n')}
`;

const outPath = path.join(__dirname, '..', 'src', 'components', 'icons', 'ProcessIcons.jsx');
fs.writeFileSync(outPath, output, 'utf8');
console.log('✅ ProcessIcons.jsx generado en:', outPath);
