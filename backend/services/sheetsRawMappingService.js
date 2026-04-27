const logger = require('../utils/logger');

/**
 * Convierte un Array crudo de Google Sheets en el objeto JSON estandar del ERP
 */
class SheetsRawMappingService {

    // Convierte [ 'TP-24', null, 'Juan' ] en { A: 'TP-24', C: 'Juan' }
    static _normalizeRow(f) {
        if (!f) return {};
        if (!Array.isArray(f)) return f; // Ya es objeto de letras
        const obj = {};
        for (let i = 0; i < f.length; i++) {
            if (f[i] === '' || f[i] == null) continue;
            let temp = i, letra = '';
            while (temp >= 0) {
                letra = String.fromCharCode((temp % 26) + 65) + letra;
                temp = Math.floor(temp / 26) - 1;
            }
            obj[letra] = f[i];
        }
        return obj;
    }

    static mapToOrderPayload(rawDataObj) {
        try {
            const { idExterno, area, rawRow, matrizData, datosPorHoja } = rawDataObj;

            // Reconstruir un "normRow" principal para la lógica inferior
            let normRow = {};
            let dMatriz = [];

            if (datosPorHoja) {
                // Nuevo formato unificado puro: Extraer hoja principal
                let keys = Object.keys(datosPorHoja);
                let selectedKey = keys.find(k => k.includes("INGRESO")) || keys.find(k => k.includes("BASE")) || keys.find(k => k.includes("PROD")) || keys[0];
                if (selectedKey) normRow = datosPorHoja[selectedKey];

                if (datosPorHoja["MATRIZ"]) dMatriz = [datosPorHoja["MATRIZ"]]; // Convertimos a arr para compatibilidad
            } else if (rawRow) {
                normRow = this._normalizeRow(rawRow);
                dMatriz = matrizData || [];
            } else {
                return null;
            }

            // Alias Normalization
            const areaUpper = (area || "").toUpperCase().trim();
            const esFamiliaDF = ["DF", "UVDF", "RDF", "XDF", "RXDF", "RUVDF"].includes(areaUpper);
            const esFamiliaECOUV = ["ECOUV", "XECOUV", "RECOUV", "RXECOUV"].includes(areaUpper);
            const esFamiliaTPU = ["TPU", "TP", "RTPU", "RTP"].includes(areaUpper);
            const esFamiliaSB = ["SB", "XSB", "RSB", "RXSB"].includes(areaUpper);
            const esFamiliaIMD = ["IMD", "XMD", "XIMD", "RIMD", "RXIMD"].includes(areaUpper);
            const esFamiliaCenco = ["TWC", "TWT", "RTWC"].includes(areaUpper);
            const esFamiliaEMB = ["EMB", "XEMB", "REMB", "RXEMB"].includes(areaUpper);

            if (esFamiliaDF) return this.mapDF(idExterno, "DF", normRow, datosPorHoja);
            if (esFamiliaECOUV) return this.mapECOUV(idExterno, "ECOUV", normRow, datosPorHoja);
            if (esFamiliaTPU) return this.mapTPU(idExterno, "TPUT", normRow, dMatriz);
            if (esFamiliaSB) return this.mapSB(idExterno, "SB", normRow, datosPorHoja);
            if (esFamiliaIMD) return this.mapIMD(idExterno, "IMD", normRow, datosPorHoja);
            if (esFamiliaCenco) return this.mapGenerico(idExterno, "TWC", normRow);
            if (esFamiliaEMB) return this.mapEMB(idExterno, "EMB", normRow, datosPorHoja);

            // Fallback Generico
            return this.mapGenerico(idExterno, areaUpper, normRow);
        } catch (error) {
            logger.error(`[SheetsRawMappingService] Error al mapear orden ${rawDataObj?.idExterno}: ${error.message}`);
            return null;
        }
    }

    static mapECOUV(idExterno, areaId, f, datosPorHoja) {
        const clienteNom = f.C ? f.C.toString().trim() : "";
        const nombreTrabajo = f.D ? f.D.toString().trim() : "S/N";
        const prioridadStr = f.E ? f.E.toString().toUpperCase() : (f.F ? f.F.toString().toUpperCase() : "");
        const prioridad = prioridadStr.includes("URGENT") ? "Urgente" : "Normal";
        
        // Material en ECOUV viene típicamente en la J y la variante en la H.
        const material = (f.J || f.I || "").toString().trim();
        const variante = (f.H || "").toString().trim();

        let cantidadReal = parseFloat(f.F) || parseFloat(f.B) || 1;
        
        // Si datosPorHoja tiene "BASE", la cantidad real de m2 está típicamente en la col B
        if (datosPorHoja && datosPorHoja["BASE"] && datosPorHoja["BASE"].B) {
            const baseCant = parseFloat(datosPorHoja["BASE"].B);
            if (!isNaN(baseCant) && baseCant > 0) {
                cantidadReal = baseCant;
            }
        }

        let disenoImpresion = "Link no definido";

        for (let l of ['K', 'L', 'M', 'N', 'O', 'H', 'I', 'J']) {
            if (f[l] && typeof f[l] === 'string' && f[l].includes('http')) {
                disenoImpresion = f[l].toString().trim();
                break;
            }
        }

        cantidadReal = Math.round(cantidadReal * 100) / 100;

        return { 
            idExterno, 
            idServicioBase: areaId, 
            nombreTrabajo, 
            prioridad, 
            metrosTotales: cantidadReal, 
            clienteInfo: { id: clienteNom, idReact: 0 }, 
            archivosReferencia: [], 
            archivosTecnicos: [], 
            servicios: [{ 
                areaId, 
                esPrincipal: true, 
                cabecera: { material, variante, metros: cantidadReal }, 
                items: [{ fileName: disenoImpresion, cantidad: cantidadReal, copias: 1 }], 
                variablesEspeciales: {} 
            }] 
        };
    }

    static mapDF(idExterno, areaId, f, datosPorHoja) {
        const clienteNom = f.C ? f.C.toString().trim() : "";
        const nombreTrabajo = f.D ? f.D.toString().trim() : "S/N";
        const prioridadStr = f.E ? f.E.toString().toUpperCase() : "";
        const prioridad = prioridadStr.includes("URGENT") ? "Urgente" : "Normal";
        const material = f.H ? f.H.toString().trim() : "";

        let cantidadReal = parseFloat(f.J) || parseFloat(f.F) || 1;

        // Si datosPorHoja tiene "BASE", la cantidad real de DTF o el trabajo está en la col B
        if (datosPorHoja && datosPorHoja["BASE"] && datosPorHoja["BASE"].B) {
            const baseCant = parseFloat(datosPorHoja["BASE"].B);
            if (!isNaN(baseCant) && baseCant > 0) {
                cantidadReal = baseCant;
            }
        }

        let disenoImpresion = "Link no definido";

        for (let l of ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']) {
            if (f[l] && typeof f[l] === 'string' && f[l].includes('http')) {
                disenoImpresion = f[l].toString().trim();
                break;
            }
        }

        const notasGenerales = f.P ? f.P.toString().trim() : "";
        cantidadReal = Math.round(cantidadReal * 100) / 100;

        return { idExterno, idServicioBase: areaId, nombreTrabajo, prioridad, notasGenerales, metrosTotales: cantidadReal, clienteInfo: { id: clienteNom, idReact: 0 }, archivosReferencia: [], archivosTecnicos: [], servicios: [{ areaId, esPrincipal: true, cabecera: { material, variante: "", metros: cantidadReal }, items: [{ fileName: disenoImpresion, cantidad: cantidadReal, copias: 1 }], variablesEspeciales: {} }] };
    }

    static mapTPU(idExterno, areaId, f, matriz) {
        const clienteNom = f.C ? f.C.toString().trim() : "";
        const nombreTrabajo = f.D ? f.D.toString().trim() : "S/N";
        const material = f.E ? f.E.toString().trim() : "";
        const prioridadStr = f.F ? f.F.toString().toUpperCase() : "";

        let cantidadReal = parseFloat(f.F) || 1;
        let disenoImpresion = f.G ? f.G.toString().trim() : "Link no definido";

        if (!disenoImpresion.includes("http")) {
            for (let l of ['E', 'F', 'G', 'H', 'I', 'J', 'K']) {
                if (f[l] && typeof f[l] === 'string' && f[l].includes('http')) {
                    disenoImpresion = f[l].toString().trim();
                    break;
                }
            }
        }

        let linkSpot = "";
        let linkRefMatriz = "";
        if (matriz && Array.isArray(matriz)) {
            for (const m of matriz) {
                const normM = this._normalizeRow(m);
                if (normM.A && normM.A.toString().trim().toUpperCase() === idExterno.toUpperCase()) {
                    linkSpot = normM.B ? normM.B.toString().trim() : "";
                    linkRefMatriz = normM.C ? normM.C.toString().trim() : "";
                    break;
                }
            }
        }

        const referencias = []; if (linkRefMatriz.includes("http")) referencias.push(linkRefMatriz);
        const tecnicos = []; if (linkSpot.includes("http")) tecnicos.push(linkSpot);
        cantidadReal = Math.round(cantidadReal * 100) / 100;

        const serviciosArray = [{ 
            areaId, 
            esPrincipal: true, 
            cabecera: { material, variante: "TPU", metros: cantidadReal }, 
            items: [{ fileName: disenoImpresion, cantidad: cantidadReal, copias: 1 }], 
            variablesEspeciales: {} 
        }];

        // Matriz TPU como Extra Contable Addicional
        serviciosArray.push({
            areaId: areaId,
            esPrincipal: false,
            isCobranzaExtra: true,
            cabecera: { 
                material: "Matriz TPU", 
                variante: "Matriz asignada automáticamente", 
                metros: 1, 
                codArticulo: "156", 
                proIdProducto: 417,
                codStock: "1.1.10.1" 
            },
            items: [{ fileName: "Matriz automática.dat", cantidad: 1, copias: 1 }],
            variablesEspeciales: { isMatriz: true }
        });return { idExterno, idServicioBase: areaId, nombreTrabajo, prioridad: "Normal", metrosTotales: cantidadReal, clienteInfo: { id: clienteNom, idReact: 0 }, archivosReferencia: referencias, archivosTecnicos: tecnicos, servicios: serviciosArray };
    }

    // --- NUEVA FUNCIÓN ESPECÍFICA PARA IMD ---
    static mapIMD(idExterno, areaId, f, datosPorHoja) {
        const clienteNom = f.C ? f.C.toString().trim() : "";
        const nombreTrabajo = f.D ? f.D.toString().trim() : idExterno;
        const prioridadStr = f.E ? f.E.toString().toUpperCase() : "";
        const prioridad = prioridadStr.includes("URGENT") ? "Urgente" : "Normal";

        // Extrae el material leyendo la columna K o la I (donde guardas la tela)
        const material = (f.K || f.I || "").toString().trim();

        let cR = parseFloat(f.F) || parseFloat(f.B) || 1;
        
        // Si datosPorHoja tiene "BASE", la cantidad real está en la col B
        if (datosPorHoja && datosPorHoja["BASE"] && datosPorHoja["BASE"].B) {
            const baseCant = parseFloat(datosPorHoja["BASE"].B);
            if (!isNaN(baseCant) && baseCant > 0) {
                cR = baseCant;
            }
        }
        
        let url = "Sin link";

        for (let key of Object.keys(f)) {
            if (key === 'A') continue;
            if (f[key] && typeof f[key] === 'string' && f[key].includes('http')) {
                url = f[key].toString().trim();
                break;
            }
        }

        cR = Math.round(cR * 100) / 100;

        const serviciosArray = [{
            areaId,
            esPrincipal: true,
            cabecera: { material, variante: "", metros: cR },
            items: [{ fileName: url, cantidad: cR, copias: 1 }],
            variablesEspeciales: {}
        }];

        const textoServiciosExtra = (f.AJ || "").toString().toUpperCase();

        if (textoServiciosExtra.includes("CORTE")) {
            serviciosArray.push({
                areaId: 'TWC', // Taller Web Corte / Corte Láser
                esPrincipal: false,
                cabecera: { 
                    material: "Corte Laser por prenda", 
                    variante: "Corte detectado Automáticamente", 
                    metros: 0, 
                    codArticulo: "1375",
                    proIdProducto: 90, 
                    codStock: "1.1.6.1" 
                },
                items: [{ fileName: url, cantidad: 0, copias: 1 }]
            });
        }
        
        if (textoServiciosExtra.includes("COSTURA")) {
            serviciosArray.push({
                areaId: 'TWT', // Taller Web Costura
                esPrincipal: false,
                cabecera: { 
                    material: "Costura", 
                    variante: "Costura detectada Automáticamente", 
                    metros: 0, 
                    codArticulo: "115", 
                    proIdProducto: 36,
                    codStock: "1.1.7.1" 
                },
                items: [{ fileName: url, cantidad: 0, copias: 1 }]
            });
        }

        if (textoServiciosExtra.includes("BORDADO") || textoServiciosExtra.includes("EMB")) {
            serviciosArray.push({
                areaId: 'EMB', // Bordado
                esPrincipal: false,
                cabecera: { 
                    material: "Bordado Estándar", 
                    variante: "Bordado detectado Automáticamente", 
                    metros: 0, 
                    codArticulo: "1567",
                    proIdProducto: 434,
                    codStock: "1.1.9.1"
                },
                items: [{ fileName: url, cantidad: 0, copias: 1 }]
            });
        }

        return {
            idExterno,
            idServicioBase: areaId,
            nombreTrabajo,
            prioridad,
            metrosTotales: cR,
            clienteInfo: { id: clienteNom, idReact: 0 },
            archivosReferencia: [],
            archivosTecnicos: [],
            servicios: serviciosArray
        };
    }

    // --- NUEVA FUNCIÓN ESPECÍFICA PARA SB (Sublimación) ---
    static mapSB(idExterno, areaId, f, datosPorHoja) {
        const clienteNom = f.C ? f.C.toString().trim() : "";
        const nombreTrabajo = f.D ? f.D.toString().trim() : idExterno;
        const prioridadStr = f.E ? f.E.toString().toUpperCase() : (f.F ? f.F.toString().toUpperCase() : "");
        const prioridad = prioridadStr.includes("URGENT") ? "Urgente" : "Normal";

        // Material en SB viene típicamente en la J o I, Variante en la H.
        const material = (f.J || f.I || "").toString().trim();
        const variante = (f.H || "").toString().trim();

        let cR = parseFloat(f.F) || parseFloat(f.B) || 1;
        
        // Si datosPorHoja tiene "BASE", la cantidad real está en la col B
        if (datosPorHoja && datosPorHoja["BASE"] && datosPorHoja["BASE"].B) {
            const baseCant = parseFloat(datosPorHoja["BASE"].B);
            if (!isNaN(baseCant) && baseCant > 0) {
                cR = baseCant;
            }
        }
        
        let url = "Sin link";

        for (let l of ['L', 'M', 'N', 'O', 'P', 'K', 'J', 'I']) {
            if (f[l] && typeof f[l] === 'string' && f[l].includes('http')) {
                url = f[l].toString().trim();
                break;
            }
        }

        // Fallback por si la URL está en otra columna impredecible
        if (url === "Sin link") {
            for (let key of Object.keys(f)) {
                if (f[key] && typeof f[key] === 'string' && f[key].includes('http')) {
                    url = f[key].toString().trim();
                    break;
                }
            }
        }

        cR = Math.round(cR * 100) / 100;

        const serviciosArray = [{
            areaId,
            esPrincipal: true,
            cabecera: { material, variante, metros: cR },
            items: [{ fileName: url, cantidad: cR, copias: 1 }],
            variablesEspeciales: {}
        }];

        // LÓGICA DE SERVICIOS EXTRA (Corte, Costura, Bordado) 
        // El usuario indica que en Corte/Costura/Bordado u otras columnas (G, I, AI, AJ, AM) puede venir esta solicitud
        const textoServiciosExtra = (
            (f.G || "") + " " + 
            (f.I || "") + " " + 
            (f.AI || "") + " " + 
            (f.AJ || "") + " " + 
            (f.AK || "") + " " + 
            (f.AM || "")
        ).toUpperCase();

        if (textoServiciosExtra.includes("CORTE")) {
            serviciosArray.push({
                areaId: 'TWC', // Taller Web Corte / Corte Láser
                esPrincipal: false,
                cabecera: { 
                    material: "Corte Laser por prenda", 
                    variante: "Corte detectado Automáticamente", 
                    metros: 0, 
                    codArticulo: "1375",
                    proIdProducto: 90, 
                    codStock: "1.1.6.1" 
                },
                items: [{ fileName: url, cantidad: 0, copias: 1 }]
            });
        }
        
        if (textoServiciosExtra.includes("COSTURA")) {
            serviciosArray.push({
                areaId: 'TWT', // Taller Web Costura
                esPrincipal: false,
                cabecera: { 
                    material: "Costura", 
                    variante: "Costura detectada Automáticamente", 
                    metros: 0, 
                    codArticulo: "115", 
                    proIdProducto: 36,
                    codStock: "1.1.7.1" 
                },
                items: [{ fileName: url, cantidad: 0, copias: 1 }]
            });
        }

        if (textoServiciosExtra.includes("BORDADO") || textoServiciosExtra.includes("EMB")) {
            serviciosArray.push({
                areaId: 'EMB', // Bordado
                esPrincipal: false,
                cabecera: { 
                    material: "Bordado Estándar", 
                    variante: "Bordado detectado Automáticamente", 
                    metros: 0, 
                    codArticulo: "1567",
                    proIdProducto: 434,
                    codStock: "1.1.9.1"
                },
                items: [{ fileName: url, cantidad: 0, copias: 1 }]
            });
        }

        return {
            idExterno,
            idServicioBase: areaId,
            nombreTrabajo,
            prioridad,
            metrosTotales: cR,
            clienteInfo: { id: clienteNom, idReact: 0 },
            archivosReferencia: [],
            archivosTecnicos: [],
            servicios: serviciosArray
        };
    }

    // --- NUEVA FUNCIÓN ESPECÍFICA PARA EMB (Bordados) ---
    static mapEMB(idExterno, areaId, f, datosPorHoja) {
        // En EMB, el cliente está en la D
        const clienteNom = f.D ? f.D.toString().trim() : "";
        // El trabajo (descripción) puede que esté en otro lado si C o D se movieron, ajustémoslo a idExterno u otra columna
        // Asumiendo que el nombre de trabajo capaz está en alguna otra, le ponemos "S/N" o verificamos
        const nombreTrabajo = f.E ? f.E.toString().trim() : idExterno;
        // La columna de urgencia, asumiremos F o E o ignoraremos si no la vemos
        const prioridadStr = f.F ? f.F.toString().toUpperCase() : "";
        const prioridad = prioridadStr.includes("URGENT") ? "Urgente" : "Normal";

        // Material/Producto en EMB viene exacto en la W
        const materialRaw = (f.W || "").toString().trim();
        const variante = (f.I || f.H || "").toString().trim();
        
        // El materialRaw viene como "Bordado de hasta 4000 puntadas". Extraemos el número para el tarifario:
        const matchPuntadas = materialRaw.match(/(\d+)\s*puntadas/i);
        const extractPuntadas = matchPuntadas ? parseInt(matchPuntadas[1], 10) : 0;
        
        const material = materialRaw || "Bordado Personalizado";

        // Cantidad está típicamente en la J
        let cR = parseFloat(f.J) || parseFloat(f.B) || 1;
        
        // Si datosPorHoja tiene "BASE", intentamos buscar la cantidad en J
        if (datosPorHoja && datosPorHoja["BASE"] && datosPorHoja["BASE"].J) {
            const baseCant = parseFloat(datosPorHoja["BASE"].J);
            if (!isNaN(baseCant) && baseCant > 0) {
                cR = baseCant;
            }
        }
        
        // Links en F, G o donde haya http
        let url = "Sin link";

        for (let l of ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']) {
            if (f[l] && typeof f[l] === 'string' && f[l].includes('http')) {
                url = f[l].toString().trim();
                break;
            }
        }

        if (url === "Sin link") {
            for (let key of Object.keys(f)) {
                if (f[key] && typeof f[key] === 'string' && f[key].includes('http')) {
                    url = f[key].toString().trim();
                    break;
                }
            }
        }

        cR = Math.round(cR * 100) / 100;

        const serviciosArray = [{
            areaId,
            esPrincipal: true,
            cabecera: { 
                material, 
                variante, 
                metros: cR,
                codArticulo: extractPuntadas > 0 ? `EMB-BORD-${extractPuntadas}` : "EMB-BORD" 
            },
            items: [{ fileName: url, cantidad: cR, copias: 1 }],
            variablesEspeciales: { puntadas: extractPuntadas }
        }];

        // Matriz EMBLA como un Extra Contable Adicional
        serviciosArray.push({
            areaId: areaId,
            esPrincipal: false,
            isCobranzaExtra: true,
            cabecera: { 
                material: "Matriz Emblema", 
                variante: "Matriz asignada automáticamente", 
                metros: 1, 
                codArticulo: "EMB-MATRIZ",
                proIdProducto: null, // Que lo resuelva el Sync
                codStock: "1.1.X" 
            },
            items: [{ fileName: "Matriz automática.dat", cantidad: 1, copias: 1 }],
            variablesEspeciales: { isMatriz: true }
        });

        return {
            idExterno,
            idServicioBase: areaId,
            nombreTrabajo,
            prioridad,
            metrosTotales: cR,
            clienteInfo: { id: clienteNom, idReact: 0 },
            archivosReferencia: [],
            archivosTecnicos: [],
            servicios: serviciosArray
        };
    }

    static mapGenerico(idExterno, areaId, f) {
        const clienteNom = f.C ? f.C.toString().trim() : "";
        const nombreTrabajo = f.D ? f.D.toString().trim() : idExterno;
        let cR = 1; let url = "Sin link";
        for (let key of Object.keys(f)) {
            if (key === 'A') continue;
            if (f[key] && typeof f[key] === 'string' && f[key].includes('http')) url = f[key].toString().trim();
            if (typeof f[key] === 'number' && f[key] > 0 && cR === 1) cR = f[key];
        }
        let material = "";
        let codArticulo = undefined;
        let proIdProducto = undefined;

        const areaUp = (areaId || '').toUpperCase();
        if (areaUp === 'TWC' || areaUp === 'CORTE') {
            material = 'Corte Laser por prenda';
            codArticulo = '1375';
            proIdProducto = 90;
        } else if (areaUp === 'TWT' || areaUp === 'COSTURA') {
            material = 'Costura';
            codArticulo = '115';
            proIdProducto = 36;
        } else if (areaUp === 'EMB' || areaUp === 'BORDADO' || areaUp === 'BORD') {
            material = 'Bordado';
            codArticulo = '1567';
            proIdProducto = 434;
        }

        cR = Math.round(cR * 100) / 100;

        return { 
            idExterno, idServicioBase: areaId, nombreTrabajo, prioridad: "Normal", metrosTotales: cR, 
            clienteInfo: { id: clienteNom, idReact: 0 }, archivosReferencia: [], archivosTecnicos: [], 
            servicios: [{ 
                areaId, esPrincipal: true, 
                cabecera: { material, variante: "", metros: cR, codArticulo, proIdProducto }, 
                items: [{ fileName: url, cantidad: cR, copias: 1 }], 
                variablesEspeciales: {} 
            }] 
        };
    }
}

module.exports = SheetsRawMappingService;

module.exports = SheetsRawMappingService;
