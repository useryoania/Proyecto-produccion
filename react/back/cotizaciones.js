const sql = require('mssql');
const puppeteer = require('puppeteer');
const { poolPromise } = require('./config/db'); // Importa tu configuración existente

const scrapeAndSaveCotizaciones = async () => {
  const url = 'https://www.brou.com.uy/cotizaciones'; // URL del BROU
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navega al sitio del BROU
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Selector donde están las cotizaciones
    const cotizacionesSelector = 'table tbody tr';

    // Espera a que los elementos estén disponibles
    await page.waitForSelector(cotizacionesSelector);

    // Extrae las cotizaciones
    const cotizaciones = await page.$$eval(cotizacionesSelector, rows =>
      rows.map(row => {
        const celdas = row.querySelectorAll('td');
        return {
          tipo: celdas[0]?.textContent.trim(),
          venta: celdas[4]?.textContent.trim().replace(',', '.'),
        };
      })
    );

    // Filtrar y mapear las cotizaciones relevantes
    const dolar = parseFloat(
      cotizaciones.find(cot => cot.tipo.includes('Dólar'))?.venta || 0
    );
    const euro = parseFloat(
      cotizaciones.find(cot => cot.tipo.includes('Euro'))?.venta || 0
    );
    const argentino = parseFloat(
      cotizaciones.find(cot => cot.tipo.includes('Peso Argentino'))?.venta || 0
    );
    const real = parseFloat(
      cotizaciones.find(cot => cot.tipo.includes('Real'))?.venta || 0
    );
    const ui = parseFloat(
      cotizaciones.find(cot => cot.tipo.includes('Unidad Indexada'))?.venta || 0
    );

    // Extraer la fecha del elemento con id "date_paragraph"
    const fechaTexto = await page.$eval('#date_paragraph', el => el.textContent.trim());
    const fechaMatch = fechaTexto.match(/(\d{2}) de (\w+) de (\d{4})/);

    if (!fechaMatch) {
      console.error('No se encontró una fecha válida en la página.');
      await browser.close();
      return;
    }

    const [_, dia, mesTexto, anio] = fechaMatch;

    // Convertir el mes de texto a número
    const meses = {
      enero: '01',
      febrero: '02',
      marzo: '03',
      abril: '04',
      mayo: '05',
      junio: '06',
      julio: '07',
      agosto: '08',
      septiembre: '09',
      octubre: '10',
      noviembre: '11',
      diciembre: '12',
    };
    const mes = meses[mesTexto.toLowerCase()];

    if (!mes) {
      console.error(`No se pudo convertir el mes: ${mesTexto}`);
      await browser.close();
      return;
    }

    const fechaFormateada = `${anio}-${mes}-${dia}`;

    console.log(`Cotizaciones extraídas para la fecha ${fechaFormateada}:`);
    console.log(`Dólar: ${dolar}, Euro: ${euro}, Argentino: ${argentino}, Real: ${real}, UI: ${ui}`);

    // Conectar a la base de datos usando poolPromise
    const pool = await poolPromise;

    // Verificar si ya existe un registro para la fecha extraída
    const result = await pool
      .request()
      .input('CotFecha', sql.Date, fechaFormateada)
      .query('SELECT COUNT(*) AS count FROM [User].dbo.Cotizaciones WHERE CotFecha = @CotFecha');

    if (result.recordset[0].count === 0) {
      // Insertar los datos si no existe para la fecha
      await pool
        .request()
        .input('CotFecha', sql.Date, fechaFormateada)
        .input('CotDolar', sql.Float, dolar)
        .input('CotEuro', sql.Float, euro)
        .input('CotArgentino', sql.Float, argentino)
        .input('CotReal', sql.Float, real)
        .input('CotUI', sql.Float, ui)
        .query(
          `INSERT INTO [User].dbo.Cotizaciones (CotFecha, CotDolar, CotEuro, CotArgentino, CotReal, CotUI)
           VALUES (@CotFecha, @CotDolar, @CotEuro, @CotArgentino, @CotReal, @CotUI)`
        );

      console.log('Cotizaciones guardadas exitosamente.');
    } else {
      console.log(`Las cotizaciones para la fecha ${fechaFormateada} ya existen. No se guardó nada.`);
    }

    // Cerrar el navegador
    await browser.close();
  } catch (error) {
    console.error('Error al realizar el scraping o guardar las cotizaciones:', error);
    await browser.close();
  }
};

// Exportamos el script
module.exports = scrapeAndSaveCotizaciones;
