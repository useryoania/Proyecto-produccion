const { sql, getPool } = require('../config/db');
const logger = require('../utils/logger');

class PricingService {

    static async getExchangeRate(pool) {
        try {
            const res = await pool.request().query("SELECT Valor FROM ConfiguracionGlobal WHERE Clave = 'TIPO_CAMBIO_USD'");
            if (res.recordset.length > 0) return parseFloat(res.recordset[0].Valor) || 40.0;
        } catch (e) {
            logger.error("Error al obtener TIPO_CAMBIO_USD:", e.message);
        }
        return 40.0; // Fallback
    }

    static async getGlobalConfigs(pool) {
        try {
            const res = await pool.request().query("SELECT Clave, Valor FROM ConfiguracionGlobal");
            const configs = {};
            res.recordset.forEach(r => { configs[r.Clave] = r.Valor; });
            return configs;
        } catch (e) {
            logger.error("Error al obtener configuracion global:", e.message);
            return {};
        }
    }

    /**
     * Calcula el precio final de un artículo para un cliente dado.
     */
    static async calculatePrice(codArticulo, cantidad = 1, clienteId = null, extraProfileIds = [], variables = {}, targetCurrency = 'UYU', exchangeRate = null, areaId = null) {
        const pool = await getPool();
        const globalConfigs = await PricingService.getGlobalConfigs(pool);

        const cleanCod = (codArticulo || '').toString().trim();
        const cleanArea = (areaId || '').toString().trim().toUpperCase();
        const cleanCurrency = (targetCurrency || 'UYU').toString().trim().toUpperCase();

        let actualExchangeRate = exchangeRate;
        if (!actualExchangeRate) {
            actualExchangeRate = parseFloat(globalConfigs['TIPO_CAMBIO_USD']) || 40.0;
        }

        const breakdown = [];

        // Helper para homogenizar monedas
        const toTarget = (amount, fromCurrency) => {
            const cFrom = (fromCurrency || 'UYU').toString().trim().toUpperCase();
            const cTo = cleanCurrency;
            if (cFrom === cTo) return parseFloat(amount);
            if (cFrom === 'USD' && cTo === 'UYU') return parseFloat(amount) * actualExchangeRate;
            if (cFrom === 'UYU' && cTo === 'USD') return parseFloat(amount) / actualExchangeRate;
            return parseFloat(amount);
        };

        // 1. Obtener AreaID si no viene
        let resolvedAreaId = cleanArea;
        if (!resolvedAreaId && cleanCod && cleanCod !== '') {
            try {
                const areaRes = await pool.request()
                    .input('Cod', sql.NVarChar, cleanCod)
                    .query("SELECT TOP 1 AreaID FROM Ordenes WHERE LTRIM(RTRIM(CodArticulo)) = @Cod");
                if (areaRes.recordset.length > 0) resolvedAreaId = areaRes.recordset[0].AreaID?.toString().trim().toUpperCase();
            } catch (e) {
                logger.warn("[PricingService] Error fetching AreaID for " + cleanCod);
            }
        }

        // 2. Obtener Precio Base (Priorizamos la moneda solicitada si existe)
        const baseRes = await pool.request()
            .input('Cod', sql.NVarChar, cleanCod)
            .input('Currency', sql.NVarChar, cleanCurrency)
            .query("SELECT Precio, Moneda FROM PreciosBase WHERE LTRIM(RTRIM(CodArticulo)) = @Cod ORDER BY CASE WHEN Moneda = @Currency THEN 1 ELSE 2 END");

        let precioBase = 0;
        let monedaBaseOriginal = 'UYU';

        // --- ESPECIAL: TARIFA BORDADO POR PUNTADAS ---
        const areasBordado = (globalConfigs['AREAS_BORDADO_PUNTADAS'] || 'BOR,EMB').split(',').map(s => s.trim().toUpperCase());
        const isBordadoByDesc = variables._desc && variables._desc.toLowerCase().includes('bordado');

        if (areasBordado.includes(resolvedAreaId) || cleanCod === '109' || isBordadoByDesc) {
            const baseStitches = parseFloat(globalConfigs['BORDADO_PUNTADAS_BASE']) || 5000;
            const basePriceStitchesUYU = parseFloat(globalConfigs['BORDADO_PRECIO_BASE_UYU']) || 50;
            const stepStitches = parseFloat(globalConfigs['BORDADO_PUNTADAS_INTERVALO']) || 1000;
            const stepPriceUYU = parseFloat(globalConfigs['BORDADO_PRECIO_INTERVALO_UYU']) || 10;
            const totalPuntadas = variables.puntadas || 0;

            let priceBordadoUYU = basePriceStitchesUYU;
            if (totalPuntadas > baseStitches) {
                const extra = totalPuntadas - baseStitches;
                const steps = Math.ceil(extra / stepStitches);
                priceBordadoUYU += steps * stepPriceUYU;
            }

            precioBase = toTarget(priceBordadoUYU, 'UYU');
            monedaBaseOriginal = 'UYU';
            breakdown.push({ tipo: 'OVERRIDE', valor: precioBase, desc: `Bordado por Puntadas (${totalPuntadas} p.)` });
        }
        else if (baseRes.recordset.length > 0) {
            monedaBaseOriginal = baseRes.recordset[0].Moneda || 'UYU';
            const precioRaw = baseRes.recordset[0].Precio;
            precioBase = toTarget(precioRaw, monedaBaseOriginal);
            breakdown.push({ tipo: 'BASE', valor: precioBase, originalVal: precioRaw, orgCur: monedaBaseOriginal, desc: 'Precio de Lista' });
        } else {
            breakdown.push({ tipo: 'WARN', valor: 0, desc: 'Producto sin precio base definido' });
        }

        let nuevoPrecioBase = precioBase;

        // --- ESPECIAL: TARIFA MÍNIMA ESTAMPADO ---
        const areasCalculoBajadas = (globalConfigs['AREAS_CALCULO_BAJADAS'] || 'EST,COR,DF').split(',').map(s => s.trim().toUpperCase());
        const isEstampadoByDesc = variables._desc && variables._desc.toLowerCase().includes('estampado');

        if (areasCalculoBajadas.includes(resolvedAreaId) || ['110', '113'].includes(cleanCod) || isEstampadoByDesc) {
            const minMontoListaUYU = parseFloat(globalConfigs['ESTAMPADO_MINIMO_UYU']) || 150;
            const minMontoTarget = toTarget(minMontoListaUYU, 'UYU');
            if (precioBase * cantidad < minMontoTarget && cantidad > 0) {
                nuevoPrecioBase = minMontoTarget / cantidad;
                breakdown.push({ tipo: 'OVERRIDE', valor: nuevoPrecioBase, desc: `Cargo Mínimo de Estampado (${cleanCurrency} ${minMontoTarget.toFixed(2)} total)` });
            }
        }

        // 3. Obtener Reglas Aplicables
        const cleanedProfiles = extraProfileIds.map(Number).filter(n => !isNaN(n));
        const rulesRes = await pool.request()
            .input('Pid', sql.Int, clienteId)
            .input('Cod', sql.NVarChar, cleanCod)
            .input('Qty', sql.Int, cantidad)
            .query(`
                -- Reglas por Perfil (Cliente, Globales y Extras)
                SELECT DISTINCT PI.ID as PerfilItemID, PI.PerfilID, PI.CodArticulo, PI.Valor, PI.Moneda, PI.TipoRegla, PI.CantidadMinima, 
                       PP.Nombre as NombrePerfil, 0 as PrioridadPerfil
                FROM PerfilesItems PI
                INNER JOIN PerfilesPrecios PP ON PI.PerfilID = PP.ID
                LEFT JOIN PreciosEspeciales PE ON (
                    PP.ID = PE.PerfilID OR 
                    EXISTS (SELECT 1 FROM STRING_SPLIT(CAST(PE.PerfilesIDs AS VARCHAR(MAX)), ',') WHERE value = CAST(PP.ID AS VARCHAR(10)))
                )
                WHERE (PE.ClienteID = @Pid OR PP.EsGlobal = 1 OR PP.ID IN (${cleanedProfiles.length > 0 ? cleanedProfiles.join(',') : '0'}))
                  AND (LTRIM(RTRIM(PI.CodArticulo)) = @Cod OR PI.CodArticulo = '' OR PI.CodArticulo IS NULL OR LTRIM(RTRIM(PI.CodArticulo)) = 'TOTAL')
                  AND (PI.CantidadMinima <= CEILING(@Qty) OR PI.CantidadMinima = 1)

                UNION ALL

                -- Reglas Directas (Excepciones) por Cliente
                SELECT ItemID as PerfilItemID, ClienteID as PerfilID, CodArticulo, Valor, Moneda, TipoRegla, MinCantidad as CantidadMinima, 
                       'Excepción Cliente' as NombrePerfil, 999 as PrioridadPerfil
                FROM PreciosEspecialesItems
                WHERE ClienteID = @Pid
                  AND (LTRIM(RTRIM(CodArticulo)) = @Cod OR CodArticulo = 'TOTAL')
                  AND (MinCantidad <= CEILING(@Qty) OR MinCantidad = 1)
                
                ORDER BY PrioridadPerfil DESC, CantidadMinima DESC
            `);

        // Filtro: Mejor regla por PerfilID
        const todasLasReglas = rulesRes.recordset;
        let traceDecision = `\n--- ANALISIS DE PRECIOS PARA ${cleanCod} (Cant: ${cantidad}) ---\n`;
        traceDecision += `Perfiles Activos: ${(extraProfileIds || []).join(',')} | Area: ${resolvedAreaId}\n`;
        traceDecision += `Reglas encontradas en BD: ${todasLasReglas.length}\n`;
        todasLasReglas.forEach(r => {
            traceDecision += `  - Encontrada: [${r.NombrePerfil}] Tipo: ${r.TipoRegla} | Art: ${r.CodArticulo} | Val: ${r.Valor} | MinQty: ${r.CantidadMinima}\n`;
        });

        const reglasFinales = [];
        const grouped = {};
        todasLasReglas.forEach(r => {
            if (!grouped[r.PerfilID]) grouped[r.PerfilID] = [];
            grouped[r.PerfilID].push(r);
        });
        Object.values(grouped).forEach(rules => {
            rules.sort((a, b) => {
                const aExact = (a.CodArticulo || '').toString().trim() === cleanCod ? 1 : 0;
                const bExact = (b.CodArticulo || '').toString().trim() === cleanCod ? 1 : 0;
                if (aExact !== bExact) return bExact - aExact;
                return (b.CantidadMinima || 0) - (a.CantidadMinima || 0);
            });
            reglasFinales.push(rules[0]);
            traceDecision += `  > GANADORA para Perfil ${rules[0].NombrePerfil}: Art=${rules[0].CodArticulo} [Min=${rules[0].CantidadMinima}] (Se descartan las demás del mismo perfil si las hubiera)\n`;
        });
        traceDecision += `\n* Fase Competencia (Desc vs Precio Fijo):\n`;

        // 4. Competencia: Descuento vs Precio Fijo
        const discountRules = reglasFinales.filter(r => r.TipoRegla.includes('discount') || r.TipoRegla === 'percentage' || r.TipoRegla === 'subtract');
        let optionA_Price = nuevoPrecioBase;
        let optionA_DiscVal = 0;
        let bestDisc = null;

        discountRules.forEach(r => {
            let val = 0;
            if (r.TipoRegla.includes('percentage') || r.TipoRegla === 'percentage') val = nuevoPrecioBase * (parseFloat(r.Valor) / 100);
            else val = toTarget(r.Valor, r.Moneda);
            traceDecision += `  - Opción Desc Evaluada [${r.NombrePerfil}]: Ahorro de ${val.toFixed(2)}\n`;
            if (val > optionA_DiscVal) { optionA_DiscVal = val; bestDisc = r; }
        });
        if (bestDisc) traceDecision += `  -> MEJOR DESCUENTO: [${bestDisc.NombrePerfil}] Ahorra ${optionA_DiscVal.toFixed(2)}\n`;
        optionA_Price = Math.max(0, nuevoPrecioBase - optionA_DiscVal);

        const fixedRules = reglasFinales.filter(r => r.TipoRegla === 'fixed' || r.TipoRegla === 'fixed_price');
        let optionB_Price = Infinity;
        let bestFixed = null;
        fixedRules.forEach(r => {
            let val = toTarget(r.Valor, r.Moneda);
            traceDecision += `  - Opción Fija Evaluada [${r.NombrePerfil}]: Queda en ${val.toFixed(2)}\n`;
            if (val < optionB_Price) { optionB_Price = val; bestFixed = r; }
        });
        if (bestFixed) traceDecision += `  -> MEJOR PRECIO FIJO: [${bestFixed.NombrePerfil}] Queda en ${optionB_Price.toFixed(2)}\n`;

        let precioFinalBase = optionA_Price;
        let discFinalVal = optionA_DiscVal;
        let appliedFixed = false;

        if (bestFixed && optionB_Price < optionA_Price) {
            traceDecision += `  => RESULTADO COMPETENCIA: GANA PRECIO FIJO porque (${optionB_Price.toFixed(2)}) es mejor (más bajo) que aplicar dto (${optionA_Price.toFixed(2)})\n`;
            precioFinalBase = optionB_Price;
            discFinalVal = 0;
            appliedFixed = true;
            breakdown.push({ tipo: 'OVERRIDE', valor: precioFinalBase, desc: `Precio Fijo [${bestFixed.NombrePerfil}]`, profileId: bestFixed.PerfilID });
        } else if (bestDisc) {
            traceDecision += `  => RESULTADO COMPETENCIA: GANA DESCUENTO porque (${optionA_Price.toFixed(2)}) es mejor o igual a precio fijo.\n`;
            breakdown.push({
                tipo: 'DISCOUNT',
                valor: -discFinalVal,
                desc: `Desc. ${Math.round(parseFloat(bestDisc.Valor))}${bestDisc.TipoRegla.includes('percentage') ? '%' : ''} [${bestDisc.NombrePerfil}]`,
                profileId: bestDisc.PerfilID
            });
        }

        traceDecision += `\n* Fase Recargos (Acumulativos):\n`;
        // 5. Recargos (Acumulativos)
        let surchargeRules = reglasFinales.filter(r => r.TipoRegla.includes('surcharge'));
        const idUrgencia = parseInt(globalConfigs['ID_PERFIL_URGENCIA']) || 2;
        const areasNoUrg = (globalConfigs['AREAS_SIN_URGENCIA'] || 'BOR,EMB,COR,TWC,COS,TWT').split(',').map(s => s.trim().toUpperCase());
        if (areasNoUrg.includes(resolvedAreaId)) {
            surchargeRules = surchargeRules.filter(r => r.PerfilID !== idUrgencia && r.NombrePerfil?.toLowerCase() !== 'urgente');
        }

        let totalRecargos = 0;
        surchargeRules.forEach(r => {
            let val = r.TipoRegla.includes('percentage') ? nuevoPrecioBase * (parseFloat(r.Valor) / 100) : toTarget(r.Valor, r.Moneda);
            traceDecision += `  - SUMA RECARGO [${r.NombrePerfil}]: +${val.toFixed(2)}\n`;
            totalRecargos += val;
            breakdown.push({ tipo: 'SURCHARGE', valor: val, desc: `Recargo ${r.TipoRegla.includes('percentage') ? r.Valor + '%' : ''} [${r.NombrePerfil}]`, profileId: r.PerfilID });
        });

        const finalPU = precioFinalBase + totalRecargos;
        traceDecision += `\n= PRECIO FINAL CALCULADO: ${finalPU.toFixed(2)}\n`;
        logger.info(traceDecision);

        // --- Generar resumen textual ---
        let txt = `Base: ${cleanCurrency} ${precioBase.toFixed(2)}`;
        breakdown.forEach(b => {
            // Si el breakdown es un override, informamos que la base cambió
            if (b.tipo === 'OVERRIDE') {
                txt += `\nOverride: ${cleanCurrency} ${b.valor.toFixed(2)} (${b.desc})`;
            } else if (b.tipo === 'DISCOUNT') {
                txt += `\nDescuento: -${cleanCurrency} ${Math.abs(b.valor).toFixed(2)} (${b.desc})`;
            } else if (b.tipo === 'SURCHARGE') {
                txt += `\nRecargo: +${cleanCurrency} ${Math.abs(b.valor).toFixed(2)} (${b.desc})`;
            }
        });
        txt += `\nTotal Unit.: ${cleanCurrency} ${finalPU.toFixed(2)}`;

        // --- Recopilar Nombres de Perfiles SÓLO los que aplicaron ---
        const appliedSet = new Set();
        if (appliedFixed && bestFixed) appliedSet.add(bestFixed.NombrePerfil);
        else if (bestDisc) appliedSet.add(bestDisc.NombrePerfil);

        surchargeRules.forEach(r => appliedSet.add(r.NombrePerfil));

        return {
            codArticulo: cleanCod,
            cantidad,
            precioUnitario: finalPU,
            precioTotal: finalPU * cantidad,
            moneda: cleanCurrency,
            breakdown,
            txt,
            perfilesAplicados: [...appliedSet].filter(Boolean),
            _debug: { resolvedAreaId, cleanCod, cleanCurrency }
        };
    }

    static async setBasePrice(codArticulo, precio, moneda = 'UYU') {
        const pool = await getPool();
        await pool.request()
            .input('Cod', sql.NVarChar, codArticulo.trim())
            .input('Pre', sql.Decimal(18, 4), precio)
            .input('Mon', sql.VarChar, moneda.toUpperCase())
            .query(`
                MERGE PreciosBase AS target
                USING (SELECT @Cod AS CodArticulo, @Mon AS Moneda) AS source
                ON (target.CodArticulo = source.CodArticulo AND target.Moneda = source.Moneda)
                WHEN MATCHED THEN UPDATE SET Precio = @Pre, UltimaActualizacion = GETDATE()
                WHEN NOT MATCHED THEN INSERT (CodArticulo, Precio, Moneda, UltimaActualizacion) VALUES (@Cod, @Pre, @Mon, GETDATE());
            `);
    }
}

module.exports = PricingService;
