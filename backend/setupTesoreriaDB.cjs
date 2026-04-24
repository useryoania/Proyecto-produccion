require('dotenv').config();
const { getPool, sql } = require('./config/db');

async function run() {
  let pool;
  try {
    pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const eventos = [
        { cod: 'TES_CHEQUE_REC', nom: 'Recibir Cheque Tercero',  pref: 'CHQR', saldo: 1, deuda: 0 },
        { cod: 'TES_CHEQUE_DEP', nom: 'Depositar Cheque Tercero', pref: 'CHQD', saldo: 0, deuda: 0 },
        { cod: 'TES_CHEQUE_END', nom: 'Endosar Cheque Tercero',   pref: 'CHQE', saldo: -1, deuda: 0 },
        { cod: 'TES_CHEQUE_EMI', nom: 'Emitir Cheque Propio',     pref: 'CHQP', saldo: -1, deuda: 0 }
      ];

      for (const e of eventos) {
        const exist = await transaction.request().input('cod', sql.VarChar, e.cod).query(`SELECT EvtCodigo FROM Cont_EventosContables WHERE EvtCodigo = @cod`);
        if (exist.recordset.length === 0) {
           await transaction.request()
             .input('cod', sql.VarChar, e.cod)
             .input('nom', sql.VarChar, e.nom)
             .input('pref', sql.VarChar, e.pref)
             .input('saldo', sql.SmallInt, e.saldo)
             .input('deuda', sql.Bit, e.deuda)
             .query(`
                INSERT INTO Cont_EventosContables 
                  (EvtCodigo, EvtNombre, EvtPrefijo, EvtSubtipo, EvtAfectaSaldo, EvtGeneraDeuda, EvtAplicaRecurso, EvtUsaEntidad, EvtRequiereDoc, EvtActivo, EvtOrden, EvtFechaAlta)
                VALUES 
                  (@cod, @nom, @pref, 'TESORERIA', @saldo, @deuda, 0, 1, 0, 1, 100, GETDATE())
             `);
        }
      }

      await transaction.commit();
      console.log('✅ Eventos Contables registrados en Cont_EventosContables.');
      process.exit(0);

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch(e) {
    console.error('❌ Error DB:', e);
    process.exit(1);
  }
}

run();
