const { sql, getPool } = require('../config/db');

class PricingService {

    static async getExchangeRate(pool) {
        try {
            const res = await pool.request().query("SELECT Valor FROM ConfiguracionGlobal WHERE Clave = 'TIPO_CAMBIO_USD'");
            if (res.recordset.length > 0) return parseFloat(res.recordset[0].Valor) || 40.0;
        } catch (e) {
            console.error("Error al obtener TIPO_CAMBIO_USD:", e.message);
        }
        return 40.0; // Fallback
    }

    /**
     * Calcula el precio final de un artículo para un cliente dado.
     * @param {string} codArticulo - Código del artículo
     * @param {number} cantidad - Cantidad solicitada (default 1)
     * @param {number} clienteId - ID del cliente (opcional)
     * @param {Array} extraProfileIds - IDs de perfiles adicionales (ej: Urgencia)
     * @returns {Promise<object>} - { precioUnitario, precioTotal, desglose: [] }
     */
    static async calculatePrice(codArticulo, cantidad = 1, clienteId = null, extraProfileIds = [], variables = {}, targetCurrency = 'UYU', exchangeRate = null) {
        const pool = await getPool();

        let actualExchangeRate = exchangeRate;
        if (!actualExchangeRate) {
            actualExchangeRate = await PricingService.getExchangeRate(pool);
        }

        const breakdown = [];

        // Helper para homogenizar monedas
        // Si la moneda origen es distinta a la destino, aplicamos o dividimos por la tasa.
        const toTarget = (amount, fromCurrency) => {
            const cFrom = (fromCurrency || 'UYU').toUpperCase().trim();
            const cTo = targetCurrency.toUpperCase().trim();
            if (cFrom === cTo) return parseFloat(amount);

            if (cFrom === 'USD' && cTo === 'UYU') return parseFloat(amount) * actualExchangeRate;
            if (cFrom === 'UYU' && cTo === 'USD') return parseFloat(amount) / actualExchangeRate;

            return parseFloat(amount); // Fallback
        };

        // 1. Obtener Precio Base (Priorizamos la moneda solicitada si existe, sino tomamos la que haya)
        const baseRes = await pool.request()
            .input('Cod', sql.NVarChar, codArticulo)
            .query("SELECT Precio, Moneda FROM PreciosBase WHERE CodArticulo = @Cod ORDER BY CASE WHEN Moneda = '" + targetCurrency + "' THEN 1 ELSE 2 END");

        let precioBase = 0;
        let monedaBaseOriginal = 'UYU';

        if (baseRes.recordset.length > 0) {
            monedaBaseOriginal = baseRes.recordset[0].Moneda || 'UYU';
            const precioRaw = baseRes.recordset[0].Precio;
            precioBase = toTarget(precioRaw, monedaBaseOriginal);
            breakdown.push({ tipo: 'BASE', valor: precioBase, originalVal: precioRaw, orgCur: monedaBaseOriginal, desc: 'Precio de Lista' });
        } else {
            breakdown.push({ tipo: 'WARN', valor: 0, desc: 'Producto sin precio base definido' });
        }

        let nuevoPrecioBase = precioBase;
        let acumuladoDescuentos = 0;
        let acumuladoRecargos = 0;

        // 2. Obtener IDs de Perfiles
        let perfilesIds = [];

        // Del Cliente
        if (clienteId) {
            const clientConfig = await pool.request()
                .input('CID', sql.Int, clienteId)
                .query("SELECT PerfilID, PerfilesIDs FROM PreciosEspeciales WHERE ClienteID = @CID");

            if (clientConfig.recordset.length > 0) {
                const row = clientConfig.recordset[0];
                if (row.PerfilesIDs) {
                    perfilesIds = String(row.PerfilesIDs).split(',').map(Number).filter(n => !isNaN(n));
                } else if (row.PerfilID) {
                    perfilesIds = [row.PerfilID];
                }
            }
        }

        // Obtener Perfiles Globales (Por defecto para todos)
        const globalProfilesRes = await pool.request().query("SELECT ID FROM PerfilesPrecios WHERE EsGlobal = 1");
        const globalIds = globalProfilesRes.recordset.map(r => r.ID);

        // Combinar: Cliente + Globales + Extra (Flags)
        const todosLosPerfiles = [...new Set([...perfilesIds, ...globalIds, ...extraProfileIds.map(Number)])];


        // 3. Buscar Reglas (AdHoc + Perfiles)

        // Ad-Hoc (Solo si hay cliente)
        let adHocRes = { recordset: [] };
        if (clienteId) {
            adHocRes = await pool.request()
                .input('CID', sql.Int, clienteId)
                .input('Cod', sql.NVarChar, codArticulo)
                .query(`SELECT TipoRegla, Valor, Moneda, CodArticulo FROM PreciosEspecialesItems WHERE ClienteID = @CID AND (CodArticulo = @Cod OR CodArticulo = 'TOTAL')`);
        }

        // Perfiles (Si hay IDs)
        let profileRules = [];
        if (todosLosPerfiles.length > 0) {
            const idsStr = todosLosPerfiles.join(',');
            const perfilesRes = await pool.request()
                .input('Cod', sql.NVarChar, codArticulo)
                .input('Qty', sql.Decimal(18, 2), cantidad)
                .query(`
                    SELECT TipoRegla, Valor, Moneda, CodArticulo, CantidadMinima, PerfilID,
                           (SELECT Nombre FROM PerfilesPrecios WHERE ID = PerfilesItems.PerfilID) as NombrePerfil
                    FROM PerfilesItems
                    WHERE PerfilID IN (${idsStr})
                      AND (CodArticulo = @Cod OR CodArticulo = 'TOTAL')
                      AND (CantidadMinima IS NULL OR CantidadMinima <= @Qty)
                `);
            profileRules = perfilesRes.recordset;
        }

        // 4. Seleccionar MEJOR regla de CADA perfil
        const reglasFinales = [];

        const procesarReglas = (lista, nombreDefault = 'Regla') => {
            const grouped = {};
            lista.forEach(r => {
                const pid = r.PerfilID || 'ADHOC';
                if (!grouped[pid]) grouped[pid] = [];
                grouped[pid].push(r);
            });

            Object.values(grouped).forEach(rules => {
                // Prioridad: 1. Producto Exacto, 2. Mayor Cantidad Minima (Tramo superior)
                rules.sort((a, b) => {
                    const aExact = a.CodArticulo === codArticulo ? 1 : 0;
                    const bExact = b.CodArticulo === codArticulo ? 1 : 0;
                    if (aExact !== bExact) return bExact - aExact;
                    return (b.CantidadMinima || 0) - (a.CantidadMinima || 0);
                });
                if (rules.length > 0) reglasFinales.push({ ...rules[0], NombrePerfil: rules[0].NombrePerfil || nombreDefault });
            });
        };

        const adHocMapped = adHocRes.recordset.map(r => ({ ...r, PerfilID: 'ADHOC' }));
        procesarReglas(adHocMapped, 'Excepción Cliente');
        procesarReglas(profileRules, 'Perfil');


        // 5. Aplicar Matemáticas: Competencia entre (Lista - Descuento) vs (Precio Fijo)

        // Opción A: Precio de Lista con Mejor Descuento
        const discountRules = reglasFinales.filter(r => r.TipoRegla.includes('discount') || r.TipoRegla === 'percentage' || r.TipoRegla === 'percentage_discount' || r.TipoRegla === 'subtract');
        let optionA_Price = precioBase;
        let optionA_DiscountVal = 0;
        let bestDiscountRule = null;

        if (discountRules.length > 0) {
            // Buscamos el mejor descuento aplicable al precio LISTA
            let maxMontoTarget = 0;
            discountRules.forEach(r => {
                let montoTarget = 0;

                // Si es porcentaje, la moneda de la regla es irrelevante, el % aplica sobre el target.
                if (r.TipoRegla.includes('percentage') || r.TipoRegla === 'percentage') {
                    const percVal = parseFloat(r.Valor);
                    montoTarget = precioBase * (percVal / 100);
                } else {
                    // Si es fijo a restar (subtract), debemos convertir ese monto a la moneda destino.
                    montoTarget = toTarget(r.Valor, r.Moneda);
                }

                if (montoTarget > maxMontoTarget) {
                    maxMontoTarget = montoTarget;
                    bestDiscountRule = { ...r, convertedValue: montoTarget };
                }
            });
            optionA_DiscountVal = maxMontoTarget;
            optionA_Price = Math.max(0, precioBase - maxMontoTarget);
        }

        // Opción B: Mejor Precio Fijo
        const fixedRules = reglasFinales.filter(r => r.TipoRegla === 'fixed' || r.TipoRegla === 'fixed_price');
        let optionB_Price = Infinity;
        let bestFixedRule = null;

        if (fixedRules.length > 0) {
            // Evaluamos el mejor precio Fijo convertido a TARGET
            const mappedFixedRules = fixedRules.map(r => ({
                ...r,
                TargetPrice: toTarget(r.Valor, r.Moneda)
            }));
            mappedFixedRules.sort((a, b) => a.TargetPrice - b.TargetPrice);

            bestFixedRule = mappedFixedRules[0];
            optionB_Price = bestFixedRule.TargetPrice;
        }

        // Decisión: ¿Quién gana? (Menor precio para el cliente)
        // Por defecto gana A (Lista + Descuentos). Si B existe y es menor, gana B.
        if (bestFixedRule && optionB_Price < optionA_Price) {
            // GANA PRECIO FIJO
            nuevoPrecioBase = optionB_Price;
            breakdown.push({
                tipo: 'OVERRIDE',
                valor: nuevoPrecioBase,
                desc: `Precio Fijo [${bestFixedRule.NombrePerfil}] (Mejor que lista con desc.)`,
                profileId: bestFixedRule.PerfilID
            });
            // No aplicamos descuentos porcentuales extras a la base fija
            acumuladoDescuentos = 0;

            // Info opcional: Avisar que ganó al descuento
            if (bestDiscountRule) {
                breakdown.push({ tipo: 'INFO', valor: 0, desc: `(Se ignoró descuento por ser mayor el precio resultante)` });
            }

        } else {
            // GANA LISTA + DESCUENTO
            nuevoPrecioBase = precioBase; // Mantenemos base original para recargos
            // Solo logueamos el descuento si existió
            if (bestDiscountRule) {
                const r = bestDiscountRule;
                const val = parseFloat(r.Valor);
                const isPerc = r.TipoRegla.includes('percentage') || r.TipoRegla === 'percentage';
                breakdown.push({
                    tipo: 'DISCOUNT',
                    valor: -optionA_DiscountVal,
                    desc: `Mejor Desc. ${Math.round(val)}${isPerc ? '%' : ''} [${r.NombrePerfil || 'Regla'}]`,
                    profileId: r.PerfilID
                });
                acumuladoDescuentos = optionA_DiscountVal;

                if (discountRules.length > 1) {
                    breakdown.push({ tipo: 'INFO', valor: 0, desc: `(Se ignoraron ${discountRules.length - 1} descuentos menores)` });
                }
            }
        }

        // C. Recargos: Estos SÍ se acumulan (Urgencia + Zona, etc.)
        const surchargeRules = reglasFinales.filter(r => r.TipoRegla.includes('surcharge'));
        surchargeRules.forEach(r => {
            let montoTarget = 0;
            const src = `[${r.NombrePerfil || 'Regla'}]`;

            if (r.TipoRegla.includes('percentage')) {
                const percVal = parseFloat(r.Valor);
                montoTarget = nuevoPrecioBase * (percVal / 100);
                breakdown.push({ tipo: 'SURCHARGE', valor: montoTarget, desc: `Recargo ${percVal}% ${src}`, profileId: r.PerfilID });
            } else {
                montoTarget = toTarget(r.Valor, r.Moneda);
                breakdown.push({ tipo: 'SURCHARGE', valor: montoTarget, desc: `Recargo Fijo ${src}`, profileId: r.PerfilID });
            }
            acumuladoRecargos += montoTarget;
        });

        // D. Fórmulas Especiales (Ej: Puntadas)
        const formulaRules = reglasFinales.filter(r => r.TipoRegla.startsWith('formula_'));
        formulaRules.forEach(r => {
            const src = `[${r.NombrePerfil || 'Fórmula'}]`;
            // Las formulas asumen montos, los convertimos a target
            const parts = r.TipoRegla.split('_');
            if (parts.length >= 5) {
                const fBaseRaw = parseFloat(parts[1]);
                const fThreshold = parseFloat(parts[2]);
                const fStepPriceRaw = parseFloat(parts[3]);
                const fStepQty = parseFloat(parts[4]);

                const fBase = toTarget(fBaseRaw, r.Moneda);
                const fStepPrice = toTarget(fStepPriceRaw, r.Moneda);

                const puntadas = variables.puntadas || 0;
                const limiteMaximo = parseFloat(parts[5] || Infinity);

                const puntadasEfectivas = Math.min(puntadas, limiteMaximo);

                let testPrecioPorFormula = fBase;
                if (puntadasEfectivas > fThreshold) {
                    const extra = puntadasEfectivas - fThreshold;
                    const steps = Math.ceil(extra / fStepQty);
                    testPrecioPorFormula += steps * fStepPrice;
                }

                nuevoPrecioBase = testPrecioPorFormula;
                breakdown.push({
                    tipo: 'OVERRIDE',
                    valor: nuevoPrecioBase,
                    desc: `Cálculo por fórmula (${puntadasEfectivas} p.) ${src}`,
                    profileId: r.PerfilID
                });
                acumuladoDescuentos = 0;
            }
        });

        let precioFinal = nuevoPrecioBase + acumuladoRecargos - acumuladoDescuentos;
        if (precioFinal < 0) precioFinal = 0;

        // Generar TXT para Observaciones (Simil Simulador)
        let txtParts = [];

        // 1. Base
        const override = breakdown.find(b => b.tipo === 'OVERRIDE');
        if (override) {
            txtParts.push(`Base: ${targetCurrency} ${override.valor.toFixed(2)} (${override.desc})`);
        } else {
            txtParts.push(`Base: ${targetCurrency} ${precioBase.toFixed(2)}`);
        }

        // 2. Descuentos
        breakdown.filter(b => b.tipo === 'DISCOUNT').forEach(d => {
            txtParts.push(`${d.desc}: -${targetCurrency} ${Math.abs(d.valor).toFixed(2)}`);
        });

        // 3. Recargos
        breakdown.filter(b => b.tipo === 'SURCHARGE').forEach(s => {
            txtParts.push(`${s.desc}: +${targetCurrency} ${s.valor.toFixed(2)}`);
        });

        // 4. Final
        txtParts.push(`Total Unit.: ${targetCurrency} ${precioFinal.toFixed(2)}`);

        const txt = txtParts.join('\n');

        // --- Recopilar Perfiles Aplicados ---
        const appliedProfiles = new Set();

        if (bestFixedRule && optionB_Price < optionA_Price) {
            if (bestFixedRule.NombrePerfil) appliedProfiles.add(bestFixedRule.NombrePerfil);
        } else {
            if (bestDiscountRule && bestDiscountRule.NombrePerfil) appliedProfiles.add(bestDiscountRule.NombrePerfil);
        }

        if (surchargeRules && surchargeRules.length > 0) {
            surchargeRules.forEach(r => {
                if (r.NombrePerfil) appliedProfiles.add(r.NombrePerfil);
            });
        }

        return {
            codArticulo,
            cantidad,
            precioUnitario: precioFinal,
            precioTotal: precioFinal * cantidad,
            moneda: targetCurrency.toUpperCase(), // Asegurar que sale la moneda correcta output
            breakdown,
            txt,
            perfilesAplicados: [...appliedProfiles],
            _debug: {
                perfilesEvaluados: todosLosPerfiles,
                reglasEncontradas: profileRules.length + adHocMapped.length,
                globalIds,
                sqlParams: { Cod: codArticulo, Qty: cantidad, Target: targetCurrency },
                topRules: reglasFinales.map(r => ({ pid: r.PerfilID, val: r.Valor, min: r.CantidadMinima }))
            }
        };
    }

    /**
     * Endpoint Debug actualizado
     */
    static async debugPrice(req, res) {
        try {
            const { cod, qty, cid, extra, puntadas } = req.query; // extra: "1,4" ids
            const extraIds = extra ? extra.split(',').map(Number) : [];
            const vars = puntadas ? { puntadas: Number(puntadas) } : {};
            const result = await PricingService.calculatePrice(cod, qty || 1, cid, extraIds, vars);
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
}

module.exports = PricingService;
