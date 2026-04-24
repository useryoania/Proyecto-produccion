require('dotenv').config();
const { getPool, sql } = require('./config/db');

async function run() {
  let pool;
  try {
    pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const req = transaction.request();

      // 1. Crear Cuentas si no existen
      const ctas = [
        { cod: '1.1.5', nom: 'Valores a Depositar (Cheques)', tipo: 'ACTIVO', mon: 1 }, 
        { cod: '2.1.3', nom: 'Cheques Diferidos a Pagar', tipo: 'PASIVO', mon: 1 } 
      ];

      for (const cta of ctas) {
        const exist = await req.input(`cod_${cta.cod.replace(/\./g,'_')}`, sql.VarChar, cta.cod).query(`SELECT CueId FROM Cont_PlanCuentas WHERE CueCodigo = @cod_${cta.cod.replace(/\./g,'_')}`);
        if (exist.recordset.length === 0) {
           await req
             .input(`c_${cta.cod.replace(/\./g,'_')}`, sql.VarChar, cta.cod)
             .input(`n_${cta.cod.replace(/\./g,'_')}`, sql.VarChar, cta.nom)
             .input(`tb_${cta.cod.replace(/\./g,'_')}`, sql.VarChar, cta.tipo)
             .input(`m_${cta.cod.replace(/\./g,'_')}`, sql.Int, cta.mon)
             .query(`
               INSERT INTO Cont_PlanCuentas (CueCodigo, CueNombre, CueNivel, CueTipoBase, CueMoneda, CueImputable, CueActiva)
               VALUES (@c_${cta.cod.replace(/\./g,'_')}, @n_${cta.cod.replace(/\./g,'_')}, 3, @tb_${cta.cod.replace(/\./g,'_')}, @m_${cta.cod.replace(/\./g,'_')}, 1, 1)
             `);
           console.log(`✅ Cuenta ${cta.cod} - ${cta.nom} creada.`);
        } else {
           console.log(`ℹ️ Cuenta ${cta.cod} ya existe.`);
        }
      }

      // 2. Mapear Reglas de Asiento
      const reglas = [
        // TES_CHEQUE_REC
        { evt: 'TES_CHEQUE_REC', ord: 1, cta: '1.1.5', nat: 'DEBE', form: 'TOTAL' },
        { evt: 'TES_CHEQUE_REC', ord: 2, cta: 'META_CLIENTE', nat: 'HABER', form: 'TOTAL' },
        // TES_CHEQUE_DEP
        { evt: 'TES_CHEQUE_DEP', ord: 1, cta: '1.1.3', nat: 'DEBE', form: 'TOTAL' },
        { evt: 'TES_CHEQUE_DEP', ord: 2, cta: '1.1.5', nat: 'HABER', form: 'TOTAL' },
        // TES_CHEQUE_END
        { evt: 'TES_CHEQUE_END', ord: 1, cta: '2.1.1', nat: 'DEBE', form: 'TOTAL' },
        { evt: 'TES_CHEQUE_END', ord: 2, cta: '1.1.5', nat: 'HABER', form: 'TOTAL' },
        // TES_CHEQUE_EMI
        { evt: 'TES_CHEQUE_EMI', ord: 1, cta: '2.1.1', nat: 'DEBE', form: 'TOTAL' },
        { evt: 'TES_CHEQUE_EMI', ord: 2, cta: '2.1.3', nat: 'HABER', form: 'TOTAL' },
      ];

      // Borrar reglas previas para estos eventos
      await req.query(`DELETE FROM Cont_ReglasAsiento WHERE EvtCodigo IN ('TES_CHEQUE_REC', 'TES_CHEQUE_DEP', 'TES_CHEQUE_END', 'TES_CHEQUE_EMI')`);

      for (const r of reglas) {
        await req
          .input(`evt_${r.evt}_${r.ord}`, sql.VarChar, r.evt)
          .input(`cta_${r.evt}_${r.ord}`, sql.VarChar, r.cta)
          .input(`nat_${r.evt}_${r.ord}`, sql.VarChar, r.nat)
          .input(`form_${r.evt}_${r.ord}`, sql.VarChar, r.form)
          .input(`ord_${r.evt}_${r.ord}`, sql.Int, r.ord)
          .query(`
            INSERT INTO Cont_ReglasAsiento (EvtCodigo, CueCodigo, RasNaturaleza, RasFormula, RasOrden)
            VALUES (@evt_${r.evt}_${r.ord}, @cta_${r.evt}_${r.ord}, @nat_${r.evt}_${r.ord}, @form_${r.evt}_${r.ord}, @ord_${r.evt}_${r.ord})
          `);
      }
      
      console.log('✅ Reglas de asiento configuradas para Tesorería.');

      await transaction.commit();
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
