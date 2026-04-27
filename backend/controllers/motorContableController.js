'use strict';
/**
 * motorContableController.js
 * ABM para Cont_EventosContables (tabla unificada) + Cont_ReglasAsiento
 */
const { getPool, sql } = require('../config/db');
const logger = require('../utils/logger');
const motor = require('../services/motorContable');

// ─── GET: Listar todos los eventos ────────────────────────────────────────────
exports.getTiposTransaccion = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT EvtCodigo, EvtNombre, EvtDescripcion, EvtPrefijo, EvtSubtipo,
                   EvtAfectaSaldo, EvtGeneraDeuda, EvtAplicaRecurso,
                   EvtUsaEntidad, EvtRequiereDoc, EvtActivo, EvtOrden
            FROM dbo.Cont_EventosContables
            ORDER BY EvtOrden ASC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        logger.error('[MOTOR] getTiposTransaccion:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── GET: Reglas de asiento de un evento ──────────────────────────────────────
exports.getReglasPorTransaccion = async (req, res) => {
    try {
        const { codigo } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('Codigo', sql.VarChar(30), codigo)
            .query(`
                SELECT RasId, EvtCodigo, CueCodigo, RasNaturaleza, RasFormula, RasOrden
                FROM dbo.Cont_ReglasAsiento
                WHERE EvtCodigo = @Codigo
                ORDER BY RasOrden ASC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        logger.error('[MOTOR] getReglasPorTransaccion:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── POST: Guardar / actualizar evento + reglas ────────────────────────────────
exports.saveReglasTransaccion = async (req, res) => {
    const {
        EvtCodigo, EvtNombre, EvtDescripcion, EvtPrefijo, EvtSubtipo,
        EvtAfectaSaldo, EvtGeneraDeuda, EvtAplicaRecurso,
        EvtUsaEntidad, EvtRequiereDoc, EvtActivo, EvtOrden,
        lineas
    } = req.body;

    if (!EvtCodigo || !EvtNombre) return res.status(400).json({ success: false, error: 'Codigo y Nombre son obligatorios' });

    try {
        const pool = await getPool();
        const tran = pool.transaction();
        await tran.begin();
        try {
            const existe = await tran.request()
                .input('C', sql.VarChar(30), EvtCodigo)
                .query('SELECT 1 FROM dbo.Cont_EventosContables WHERE EvtCodigo = @C');

            if (existe.recordset.length > 0) {
                await tran.request()
                    .input('C', sql.VarChar(30), EvtCodigo)
                    .input('N', sql.NVarChar(100), EvtNombre)
                    .input('D', sql.NVarChar(500), EvtDescripcion || '')
                    .input('P', sql.VarChar(5), EvtPrefijo || null)
                    .input('S', sql.VarChar(30), EvtSubtipo || null)
                    .input('AS_', sql.SmallInt, EvtAfectaSaldo ?? 0)
                    .input('GD', sql.Bit, EvtGeneraDeuda ?? 0)
                    .input('AR', sql.Bit, EvtAplicaRecurso ?? 0)
                    .input('UE', sql.Bit, EvtUsaEntidad ?? 0)
                    .input('RD', sql.Bit, EvtRequiereDoc ?? 0)
                    .input('AC', sql.Bit, EvtActivo ?? 1)
                    .input('OR_', sql.Int, EvtOrden ?? 100)
                    .query(`UPDATE dbo.Cont_EventosContables SET
                        EvtNombre=@N, EvtDescripcion=@D, EvtPrefijo=@P, EvtSubtipo=@S,
                        EvtAfectaSaldo=@AS_, EvtGeneraDeuda=@GD, EvtAplicaRecurso=@AR,
                        EvtUsaEntidad=@UE, EvtRequiereDoc=@RD, EvtActivo=@AC, EvtOrden=@OR_
                        WHERE EvtCodigo=@C`);
            } else {
                await tran.request()
                    .input('C', sql.VarChar(30), EvtCodigo)
                    .input('N', sql.NVarChar(100), EvtNombre)
                    .input('D', sql.NVarChar(500), EvtDescripcion || '')
                    .input('P', sql.VarChar(5), EvtPrefijo || null)
                    .input('S', sql.VarChar(30), EvtSubtipo || null)
                    .input('AS_', sql.SmallInt, EvtAfectaSaldo ?? 0)
                    .input('GD', sql.Bit, EvtGeneraDeuda ?? 0)
                    .input('AR', sql.Bit, EvtAplicaRecurso ?? 0)
                    .input('UE', sql.Bit, EvtUsaEntidad ?? 0)
                    .input('RD', sql.Bit, EvtRequiereDoc ?? 0)
                    .input('AC', sql.Bit, EvtActivo ?? 1)
                    .input('OR_', sql.Int, EvtOrden ?? 100)
                    .query(`INSERT INTO dbo.Cont_EventosContables
                        (EvtCodigo, EvtNombre, EvtDescripcion, EvtPrefijo, EvtSubtipo,
                         EvtAfectaSaldo, EvtGeneraDeuda, EvtAplicaRecurso,
                         EvtUsaEntidad, EvtRequiereDoc, EvtActivo, EvtOrden)
                        VALUES (@C,@N,@D,@P,@S,@AS_,@GD,@AR,@UE,@RD,@AC,@OR_)`);
            }

            // Borrar reglas antiguas y reinsertar
            await tran.request().input('C', sql.VarChar(30), EvtCodigo)
                .query('DELETE FROM dbo.Cont_ReglasAsiento WHERE EvtCodigo=@C');

            for (const lin of (lineas || [])) {
                await tran.request()
                    .input('C', sql.VarChar(30), EvtCodigo)
                    .input('Cue', sql.VarChar(30), lin.CueCodigo)
                    .input('Nat', sql.VarChar(10), lin.RasNaturaleza)
                    .input('Form', sql.VarChar(50), lin.RasFormula || 'TOTAL')
                    .input('Ord', sql.Int, lin.RasOrden || 10)
                    .query('INSERT INTO dbo.Cont_ReglasAsiento (EvtCodigo, CueCodigo, RasNaturaleza, RasFormula, RasOrden) VALUES (@C,@Cue,@Nat,@Form,@Ord)');
            }

            await tran.commit();
            motor.invalidarCache();
            res.json({ success: true, message: 'Evento y reglas guardados correctamente.' });
        } catch (errIn) {
            await tran.rollback();
            throw errIn;
        }
    } catch (err) {
        logger.error('[MOTOR] saveReglas:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── DELETE: Eliminar evento + reglas ─────────────────────────────────────────
exports.deleteTransaccion = async (req, res) => {
    try {
        const { codigo } = req.params;
        const pool = await getPool();
        const tran = pool.transaction();
        await tran.begin();
        try {
            await tran.request().input('C', sql.VarChar(30), codigo)
                .query('DELETE FROM dbo.Cont_ReglasAsiento WHERE EvtCodigo=@C');
            await tran.request().input('C', sql.VarChar(30), codigo)
                .query('DELETE FROM dbo.Cont_EventosContables WHERE EvtCodigo=@C');
            await tran.commit();
            motor.invalidarCache();
            res.json({ success: true, message: 'Eliminado correctamente.' });
        } catch (erIn) {
            await tran.rollback();
            throw erIn;
        }
    } catch (err) {
        logger.error('[MOTOR] delete:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── GET: Operaciones disponibles para selector en Caja ───────────────────────
// Filtra los eventos que pueden iniciarse manualmente desde caja:
//   - Activos
//   - Tienen prefijo de documento (FC, TK, etc.) O afectan saldo
//   - No son internos del sistema (sin código numérico puro)
exports.getOperacionesCaja = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT
                EvtCodigo,
                EvtNombre,
                EvtDescripcion,
                EvtPrefijo,
                EvtAfectaSaldo,
                EvtGeneraDeuda,
                EvtAplicaRecurso,
                EvtUsaEntidad,
                EvtRequiereDoc,
                (SELECT COUNT(*) FROM dbo.Cont_ReglasAsiento WHERE EvtCodigo = e.EvtCodigo) AS CantidadReglas
            FROM dbo.Cont_EventosContables e
            WHERE EvtActivo = 1
              AND ISNUMERIC(EvtCodigo) = 0          -- Excluir tipos numericos (tipos de e-facturacion DGI)
              AND EvtCodigo NOT IN ('TICKET', 'CIERRE_CICLO', 'REPOSICION')
            ORDER BY
                -- Agrupar: primero los que generan deuda, luego cobros, luego recursos
                CASE WHEN EvtGeneraDeuda = 1 THEN 0
                     WHEN EvtAfectaSaldo = 1 THEN 1
                     WHEN EvtAplicaRecurso = 1 THEN 2
                     ELSE 3 END,
                EvtOrden ASC
        `);

        // Agrupar por categoria para el frontend
        const eventos = result.recordset;
        const agrupado = {
            cobros_ingresos: eventos.filter(e => e.EvtAfectaSaldo === 1 && !e.EvtGeneraDeuda),
            ventas_deuda:    eventos.filter(e => e.EvtGeneraDeuda),
            recursos:        eventos.filter(e => e.EvtAplicaRecurso),
            ajustes:         eventos.filter(e => e.EvtAfectaSaldo === 0 && !e.EvtGeneraDeuda && !e.EvtAplicaRecurso),
            otros:           eventos.filter(e => e.EvtAfectaSaldo === -1 && !e.EvtGeneraDeuda && !e.EvtAplicaRecurso),
        };

        res.json({ success: true, data: eventos, agrupado });
    } catch (err) {
        logger.error('[MOTOR] getOperacionesCaja:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

