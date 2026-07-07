const { sql } = require('../config/db');

/**
 * Valida que las órdenes de falla (-F) de un lote tengan su metraje cargado:
 *   (1) el total del grupo de falla (MetrosGrupoFalla > 0), y
 *   (2) cada orden -F con su Magnitud > 0.
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

    // ¿Existe la columna del total de grupo? (se auto-crea al abrir el detalle del lote)
    const colRes = await new sql.Request(db)
        .query("SELECT COL_LENGTH('dbo.Ordenes','MetrosGrupoFalla') AS L");
    let grpFalta = colRes.recordset[0].L === null; // sin columna → el total nunca se cargó
    if (!grpFalta) {
        const gRes = await new sql.Request(db)
            .input('RID_G', sql.VarChar(50), rid)
            .query(`
                SELECT COUNT(*) AS Faltan
                FROM dbo.Ordenes
                WHERE CAST(RolloID AS VARCHAR(50)) = @RID_G
                  AND CodigoOrden LIKE '%-F%'
                  AND Estado NOT IN ('Cancelado','Cancelada')
                  AND ISNULL(MetrosGrupoFalla, 0) <= 0
            `);
        grpFalta = (gRes.recordset[0].Faltan || 0) > 0;
    }
    const sinMetros = fallaRows.filter(r => Number(r.Mag) <= 0).map(r => r.CodigoOrden);

    if (grpFalta || sinMetros.length > 0) {
        const partes = [];
        if (grpFalta) partes.push('el metraje del grupo de falla');
        if (sinMetros.length > 0) partes.push('el metraje de cada orden de falla');
        return { falta: true, motivo: partes.join(' y ') };
    }
    return { falta: false, motivo: null };
}

module.exports = { validarMetrosFalla };
