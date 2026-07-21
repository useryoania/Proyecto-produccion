const { sql } = require('../config/db');

/**
 * Valida que las órdenes de falla (-F) de un lote tengan su metraje cargado:
 * cada orden -F con su Magnitud > 0.
 *
 * NOTA: antes también se exigía un total de grupo (MetrosGrupoFalla) que se cargaba a mano y
 * podía no coincidir con la suma real. Ese total pasó a ser la SUMA de las órdenes del grupo
 * (calculada, no editable), así que validar los metros de cada orden ya cubre el total.
 * La columna se mantiene por compatibilidad con los datos viejos, pero no se exige ni se usa.
 *
 * Un lote sin órdenes -F pasa siempre. `db` puede ser un pool o una transacción activa,
 * así se puede usar tanto al finalizar (dentro de la transacción del finish) como al
 * asignar/mover un lote a una calandra.
 *
 * Devuelve { falta: boolean, motivo: string|null } — `motivo` describe qué metraje falta.
 */
async function validarMetrosFalla(db, rolloId) {
    const rid = String(rolloId);

    const fRes = await new sql.Request(db)
        .input('RID_F', sql.VarChar(50), rid)
        .query(`
            SELECT CodigoOrden, ISNULL(TRY_CONVERT(DECIMAL(10,2), Magnitud), 0) AS Mag
            FROM dbo.Ordenes
            WHERE CAST(RolloID AS VARCHAR(50)) = @RID_F
              AND CodigoOrden LIKE '%-F%'
              AND Estado NOT IN ('Cancelado','Cancelada')
        `);
    const fallaRows = fRes.recordset || [];
    if (fallaRows.length === 0) return { falta: false, motivo: null };

    const sinMetros = fallaRows.filter(r => Number(r.Mag) <= 0).map(r => r.CodigoOrden);

    if (sinMetros.length > 0) {
        return { falta: true, motivo: `el metraje de ${sinMetros.length === 1 ? 'la orden de falla' : 'las órdenes de falla'} ${sinMetros.join(', ')}` };
    }
    return { falta: false, motivo: null };
}

module.exports = { validarMetrosFalla };
