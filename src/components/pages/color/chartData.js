// 24 parches tipo ColorChecker para la chart de calibración de color.
// `hex` es el color NOMINAL que se imprime (referencia visual + PDF). El LAB
// REAL de cada parche se mide con espectrofotómetro y se guarda aparte (por tirada),
// y es ESE valor el que se usa para calibrar la cámara — no el hex.
export const CHART_COLS = 6;
export const CHART_ROWS = 4;

export const CHART_PATCHES = [
    { id: 1,  name: 'Piel oscura',      hex: '#735444' },
    { id: 2,  name: 'Piel clara',       hex: '#C29682' },
    { id: 3,  name: 'Cielo',            hex: '#627A9D' },
    { id: 4,  name: 'Follaje',          hex: '#576C43' },
    { id: 5,  name: 'Flor azul',        hex: '#8580B1' },
    { id: 6,  name: 'Verde azulado',    hex: '#67BDAA' },
    { id: 7,  name: 'Naranja',          hex: '#D6782C' },
    { id: 8,  name: 'Azul púrpura',     hex: '#505BA6' },
    { id: 9,  name: 'Rojo medio',       hex: '#C15A63' },
    { id: 10, name: 'Púrpura',          hex: '#5E3C6C' },
    { id: 11, name: 'Verde amarillo',   hex: '#9DBC40' },
    { id: 12, name: 'Amarillo naranja', hex: '#E0A32E' },
    { id: 13, name: 'Azul',             hex: '#383D96' },
    { id: 14, name: 'Verde',            hex: '#469449' },
    { id: 15, name: 'Rojo',             hex: '#AF363C' },
    { id: 16, name: 'Amarillo',         hex: '#E7C71F' },
    { id: 17, name: 'Magenta',          hex: '#BB5695' },
    { id: 18, name: 'Cian',             hex: '#0885A1' },
    { id: 19, name: 'Blanco',           hex: '#F3F3F2' },
    { id: 20, name: 'Gris 80%',         hex: '#C8C8C8' },
    { id: 21, name: 'Gris 65%',         hex: '#A0A0A0' },
    { id: 22, name: 'Gris 50%',         hex: '#7A7A79' },
    { id: 23, name: 'Gris 35%',         hex: '#555555' },
    { id: 24, name: 'Negro',            hex: '#343434' },
];

export function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}
