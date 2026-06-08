const sql = require('mssql');
const { getPool } = require('./config/db');

async function run() {
  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Check if sequence already exists
      let seqRes = await transaction.request()
        .input('TipoDoc', sql.VarChar(50), 'COBRO_WEB')
        .query(`SELECT SecIdSecuencia FROM dbo.SecuenciaDocumentos WHERE SecTipoDoc = @TipoDoc`);
      
      let secId;
      if (seqRes.recordset.length > 0) {
        secId = seqRes.recordset[0].SecIdSecuencia;
      } else {
        const insertSeq = await transaction.request()
          .input('TipoDoc', sql.VarChar(50), 'COBRO_WEB')
          .input('Serie', sql.VarChar(5), 'W')
          .input('Prefijo', sql.VarChar(10), 'W-')
          .query(`
            INSERT INTO dbo.SecuenciaDocumentos 
              (SecTipoDoc, SecSerie, SecPrefijo, SecDigitos, SecUltimoNumero, SecActivo)
            OUTPUT INSERTED.SecIdSecuencia
            VALUES (@TipoDoc, @Serie, @Prefijo, 6, 0, 1)
          `);
        secId = insertSeq.recordset[0].SecIdSecuencia;
      }

      // 2. Check if Config_TiposDocumento already exists
      const confRes = await transaction.request()
        .input('Cod', sql.VarChar(20), 'COBRO_WEB')
        .query(`SELECT CodDocumento FROM dbo.Config_TiposDocumento WHERE CodDocumento = @Cod`);
      
      if (confRes.recordset.length === 0) {
        await transaction.request()
          .input('Cod', sql.VarChar(20), 'COBRO_WEB')
          .input('Det', sql.VarChar(100), 'Cobro Web (Handy/MercadoPago)')
          .input('Efact', sql.Int, 101) // Like E-Ticket Contado
          .input('Rut', sql.Bit, 0)
          .input('Afecta', sql.Bit, 0)
          .input('Ref', sql.Bit, 0)
          .input('Evt', sql.VarChar(50), 'VTA_CAJA') // Requested by user
          .input('Sec', sql.Int, secId)
          .query(`
            INSERT INTO dbo.Config_TiposDocumento
              (CodDocumento, Detalle, Codigo_Efact, RutObligatorio, AfectaCtaCte, Referenciado, EvtCodigo, SecIdSecuencia)
            VALUES (@Cod, @Det, @Efact, @Rut, @Afecta, @Ref, @Evt, @Sec)
          `);
        console.log("Inserted COBRO_WEB into Config_TiposDocumento with SecId:", secId);
      } else {
        console.log("COBRO_WEB already exists in Config_TiposDocumento.");
      }

      await transaction.commit();
      console.log("Success!");
    } catch (e) {
      await transaction.rollback();
      throw e;
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
