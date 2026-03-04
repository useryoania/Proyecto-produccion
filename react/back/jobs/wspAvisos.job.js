/**
 * Job de avisos WhatsApp (CALLBELL) - PRO
 * --------------------------------------
 * - Throttle por destinatario (no global)
 * - Concurrencia global configurable
 * - No corta el procesamiento por fallos en cache/socket
 */

const sql = require("mssql");
const axios = require("axios");
const { poolPromise } = require("../config/db");
const { updateCache } = require("../cacheManager");
const { getIO } = require("../socket");

// ================= ENV =================

const CALLBELL_API_KEY = process.env.CALLBELL_API_KEY;
const CALLBELL_TEMPLATE_UUID = process.env.CALLBELL_TEMPLATE_UUID;
const CALLBELL_CHANNEL_UUID = process.env.CALLBELL_CHANNEL_UUID;

const FORCE_TEST_TO = String(process.env.FORCE_TEST_TO ?? "true") === "true";
const WA_TEST_TO = process.env.WA_TEST_TO;

const ESTADO_POR_AVISAR = Number(process.env.WSP_ESTADO_POR_AVISAR ?? 1);

// Concurrencia global: cuántos envíos simultáneos a distintos números
const GLOBAL_CONCURRENCY = Number(process.env.WSP_GLOBAL_CONCURRENCY ?? 4);

// Throttle por destinatario: mínimo tiempo entre mensajes al mismo número (ms)
const PER_RECIPIENT_MIN_INTERVAL_MS = Number(process.env.WSP_PER_RECIPIENT_DELAY_MS ?? 4000);

// Endpoints Callbell
const CALLBELL_SEND_URL = "https://api.callbell.eu/v1/messages/send";

// ======================================

function assertEnv() {
  const missing = [];
  if (!CALLBELL_API_KEY) missing.push("CALLBELL_API_KEY");
  if (!CALLBELL_TEMPLATE_UUID) missing.push("CALLBELL_TEMPLATE_UUID");
  if (!CALLBELL_CHANNEL_UUID) missing.push("CALLBELL_CHANNEL_UUID");
  if (FORCE_TEST_TO && !WA_TEST_TO) missing.push("WA_TEST_TO (porque FORCE_TEST_TO=true)");
  if (missing.length) throw new Error(`Faltan variables .env: ${missing.join(", ")}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizePhone(raw) {
  if (!raw) return null;

  // Solo dígitos
  let digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return null;

  // Quitar prefijos internacionales tipo 00
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Si ya viene con 598 (UY), devolver E.164
  if (digits.startsWith("598")) {
    const rest = digits.slice(3);
    if (rest.length < 7) return null;
    return `+${digits}`;
  }

  // Si viene en formato nacional con 0 adelante (ej 097083460)
  if (digits.startsWith("0")) digits = digits.slice(1);

  // Si queda en 8 dígitos (ej 97083460), asumimos Uruguay y agregamos 598
  // (Esto cubre móviles 09xxxxxxx -> 9xxxxxxx (8 dígitos) y algunos fijos)
  if (digits.length === 8) return `+598${digits}`;

  // Si te llega 9 dígitos sin 0 (raro pero puede pasar), también asumimos UY
  if (digits.length === 9) return `+598${digits}`;

  // Si te llega algo tipo 11-15 dígitos, asumimos que ya está internacional sin '+'
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;

  return null;
}

function formatDateUY(date = new Date()) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatNumberUY(value, decimals = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("es-UY", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Envío template por Callbell
 */
async function enviarTemplateWsp({ to, params }) {
  const payload = {
    to,
    from: "whatsapp",
    channel_uuid: CALLBELL_CHANNEL_UUID,

    // Requeridos por Callbell siempre
    type: "text",
    content: { text: String(params?.[0] ?? "-") },

    // Template
    template_uuid: CALLBELL_TEMPLATE_UUID,
    optin_contact: true,
    template_values: (params || []).map((v) => String(v ?? "")),
  };

  const { data } = await axios.post(CALLBELL_SEND_URL, payload, {
    headers: {
      Authorization: `Bearer ${CALLBELL_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });

  return data; // { message: { uuid, status: 'enqueued' } }
}

async function marcarOrdenEnviada(pool, ordId) {
  await pool.request()
    .input("id", sql.Int, ordId)
    .query(`
      UPDATE [User].dbo.Ordenes
      SET OrdAvisoWsp = 1,
          OrdFechaAvisoWsp = GETDATE(),
          OrdEstadoActual = 6
      WHERE OrdIdOrden = @id
    `);
}

/**
 * Limiter de concurrencia simple (sin dependencias)
 */
function createConcurrencyLimiter(maxConcurrent) {
  let active = 0;
  const queue = [];

  const next = () => {
    if (active >= maxConcurrent) return;
    const job = queue.shift();
    if (!job) return;

    active++;
    Promise.resolve()
      .then(job.fn)
      .then(job.resolve, job.reject)
      .finally(() => {
        active--;
        next();
      });
  };

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

/**
 * Throttle por destinatario:
 * - garantiza un mínimo de PER_RECIPIENT_MIN_INTERVAL_MS entre mensajes al mismo "to"
 * - importante para templates seguidos al mismo número
 */
function createPerRecipientThrottle(minIntervalMs) {
  const nextAllowedAt = new Map(); // to -> timestamp
  const chains = new Map();        // to -> Promise (cola por destinatario)

  return async function runForRecipient(to, fn) {
    const prev = chains.get(to) || Promise.resolve();

    const p = prev
      .catch(() => {}) // si el anterior falló, no bloqueamos la cola
      .then(async () => {
        const now = Date.now();
        const allowed = nextAllowedAt.get(to) || 0;
        const wait = Math.max(0, allowed - now);
        if (wait > 0) await sleep(wait);

        // reserva la próxima ventana ANTES de ejecutar (evita carreras)
        nextAllowedAt.set(to, Date.now() + minIntervalMs);

        return fn();
      });

    chains.set(to, p);
    return p;
  };
}

// ================= JOB =================

async function procesarAvisosWsp() {
  assertEnv();

  const pool = await poolPromise;

  // Traemos TODO lo pendiente (igual que tu lógica base; si querés, volvemos a meter Cotizaciones como antes)
  const query = `
  ;WITH CotiDia AS (
    SELECT TOP (1)
      CotFecha,
      CotDolar
    FROM [User].dbo.Cotizaciones WITH (NOLOCK)
    ORDER BY CotFecha DESC
  )
  SELECT
    Ord.OrdIdOrden,
    Cli.CliCelular,
    Ord.OrdCodigoOrden,
    Ord.OrdNombreTrabajo,
    LTRIM(RTRIM(Pro.ProNombreProducto + ISNULL(' ' + Pro.ProDetalleProducto, ''))) AS Producto,
    CAST(Ord.OrdCantidad AS decimal(18,2)) AS Cantidad,
    Mon.MonIdMoneda,
    Mon.MonSimbolo,
    CAST(Ord.OrdCostoFinal AS decimal(18,2)) AS CostoFinal,
    ISNULL(Cd.CotDolar, NULL) AS CotDolarDia
  FROM [User].dbo.Ordenes Ord WITH (NOLOCK)
  JOIN [User].dbo.Clientes Cli WITH (NOLOCK)
    ON Cli.CliIdCliente = Ord.CliIdCliente
  JOIN [User].dbo.Productos Pro WITH (NOLOCK)
    ON Pro.ProIdProducto = Ord.ProIdProducto
  JOIN [User].dbo.Monedas Mon WITH (NOLOCK)
    ON Mon.MonIdMoneda = Ord.MonIdMoneda
  LEFT JOIN CotiDia Cd
    ON 1 = 1
  WHERE (Ord.OrdEstadoActual = @Estado
    AND ISNULL(Ord.OrdAvisoWsp, 0) = 0
    AND Cli.CliCelular IS NOT NULL)
    OR Ord.OrdEstadoActual = 12;
  `;

  const result = await pool.request()
    .input("Estado", sql.Int, ESTADO_POR_AVISAR)
    .query(query);

  const rows = result.recordset || [];
  if (!rows.length) {
    console.log("[WSP JOB] No hay órdenes por avisar.");
    return;
  }

  console.log(`[WSP JOB] Pendientes: ${rows.length} | concurrency=${GLOBAL_CONCURRENCY} | perRecipientDelay=${PER_RECIPIENT_MIN_INTERVAL_MS}ms`);

  const limit = createConcurrencyLimiter(GLOBAL_CONCURRENCY);
  const throttle = createPerRecipientThrottle(PER_RECIPIENT_MIN_INTERVAL_MS);

  const fechaTxt = formatDateUY(new Date());

  // Armamos tareas (una por orden) y las ejecutamos con concurrencia global
  const tasks = rows.map((r, idx) =>
    limit(async () => {
      const codigoOrden = r.OrdCodigoOrden || "-";
      console.log(`[WSP JOB] (${idx + 1}/${rows.length}) START ${codigoOrden}`);

      const toReal = normalizePhone(r.CliCelular);
      const to = FORCE_TEST_TO ? normalizePhone(WA_TEST_TO) : toReal;

      if (!to) {
        console.warn(`[WSP JOB] ${codigoOrden} sin celular válido:`, r.CliCelular);
        return;
      }

      const trabajo = r.OrdNombreTrabajo || "-";
      const producto = r.Producto || "-";
      const cantidadTxt = formatNumberUY(r.Cantidad, 2);
      const totalTxt = `${r.MonSimbolo} ${formatNumberUY(r.CostoFinal, 2)}`;
      let equivalentePesosTxt = `$ ${formatNumberUY(r.CostoFinal, 2)}`;

      if (Number(r.MonIdMoneda) !== 1) {
        const cot = Number(r.CotDolarDia);
        const eq = Number.isFinite(cot) ? Number(r.CostoFinal) * cot : 0;
        equivalentePesosTxt = `$ ${formatNumberUY(eq, 2)}`;
      }

      const params = [
        fechaTxt,            // 1) Fecha
        codigoOrden,         // 2) Orden
        trabajo,             // 3) Trabajo
        producto,            // 4) Producto
        cantidadTxt,         // 5) Cantidad
        totalTxt,            // 6) Total
        equivalentePesosTxt, // 7) Equivalente en $
      ];

      // 1) Envío WhatsApp con throttle por destinatario
      let sendResp;
      try {
        sendResp = await throttle(to, async () => {
          const resp = await enviarTemplateWsp({ to, params });
          console.log("[CALLBELL] SEND RESPONSE:", resp);
          return resp;
        });
      } catch (err) {
        const details = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
        console.error(`[WSP JOB] Error enviando WSP - ${codigoOrden}`, details);
        return; // no marcamos DB
      }

      const uuid = sendResp?.message?.uuid;
      const st = sendResp?.message?.status;
      console.log(`[WSP JOB] ENQUEUED ${codigoOrden} -> ${to} (uuid=${uuid || "?"}, status=${st || "?"})`);

      // 2) Post-procesos (no frenan el resto)
      try {
        await marcarOrdenEnviada(pool, r.OrdIdOrden);
      } catch (e) {
        console.error(`[WSP JOB] Error DB update - ${codigoOrden}`, e?.message || e);
        // si esto falla, se reintenta en el próximo run
      }

      try {
        await updateCache("ordenes", (currentData) => {
          if (!Array.isArray(currentData) || currentData.length === 0) return currentData;
          return currentData.map((o) =>
            o.OrdIdOrden === r.OrdIdOrden
              ? { ...o, OrdAvisoWsp: 1, OrdFechaAvisoWsp: new Date(), OrdEstadoActual: 6 }
              : o
          );
        });
      } catch (e) {
        console.warn(`[WSP JOB] updateCache falló (no bloquea) - ${codigoOrden}`, e?.message || e);
      }

      try {
        const io = getIO();
        io.emit("actualizado", { type: "wsp" });
      } catch (_) {}

      console.log(`[WSP JOB] FINISH OK ${codigoOrden}${FORCE_TEST_TO ? " (TEST)" : ""}`);
    })
  );

  // Esperamos a que termine todo
  await Promise.allSettled(tasks);

  console.log("[WSP JOB] Procesamiento terminado.");
}

module.exports = { procesarAvisosWsp };