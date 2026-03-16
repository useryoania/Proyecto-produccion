import{r as g,n as A,H as De,a as S,j as e,I as ke,J as Ae,M as Le,L as Se,S as V,z as B,P as $e,K as me,N as se,U as fe,C as Oe,V as ze}from"./index-CN-SSCF3.js";import{T as Te}from"./tag-CacGJMI-.js";const he=c=>{const U=new Date().toLocaleString("es-UY",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}),y=c.pagorealizado===1||c.pagorealizado===!0,D=c.orders||[];D.map(N=>N.orderNumber||N.codigoOrden||"").filter(Boolean);const C=c.TClDescripcion||"Común",f=c.lugarRetiro&&c.lugarRetiro!=="-"&&c.lugarRetiro!=="Web"?c.lugarRetiro:"Retiro Web",R=c.totalCost&&c.totalCost!=="-"?c.totalCost:null,$=c._isWeb||(c.ordenDeRetiro||"").includes("R-"),v=`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante Retiro ${c.displayLabel||c.ordenDeRetiro}</title>
  <style>
    @page { size: A5; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 15px;
      color: #111;
      background: #fff;
      padding: 10mm 10mm 8mm;
    }

    /* ── ENCABEZADO ── */
    .header {
      text-align: center;
      border-bottom: 2px solid #222;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header .empresa {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .header .modulo {
      font-size: 13px;
      color: #555;
      margin-top: 3px;
    }
    .header .doc-tipo {
      font-size: 12px;
      color: #888;
      margin-top: 2px;
      font-style: italic;
    }

    /* ── CÓDIGO PRINCIPAL ── */
    .codigo-principal {
      text-align: center;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 3px;
      margin: 12px 0 10px;
      padding: 8px 0;
      border-top: 1px dashed #ccc;
      border-bottom: 1px dashed #ccc;
    }

    /* ── ESTADO BADGE ── */
    .estado-badge {
      display: inline-block;
      padding: 5px 14px;
      border: 2px solid ${y?"#16a34a":"#dc2626"};
      color: ${y?"#16a34a":"#dc2626"};
      font-weight: 900;
      font-size: 14px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* ── TABLA DE DATOS ── */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
    }
    .info-table td {
      padding: 6px 4px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    .info-table td:first-child {
      color: #000;
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: 34%;
      white-space: nowrap;
    }
    .info-table td:last-child {
      font-weight: 700;
      text-align: right;
      font-size: 15px;
    }

    /* ── TABLA DE ÓRDENES ── */
    .orders-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 14px;
    }
    .orders-table thead tr {
      background: #f3f4f6;
    }
    .orders-table th {
      padding: 7px 6px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #444;
      border-bottom: 1px solid #ddd;
    }
    .orders-table td {
      padding: 7px 6px;
      border-bottom: 1px solid #eee;
      font-weight: 600;
    }

    /* ── SEPARADOR ── */
    .sep { border-top: 1px dashed #bbb; margin: 12px 0; }

    /* ── FIRMA ── */
    .firma-row {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }
    .firma-box {
      width: 44%;
      border-top: 1px solid #333;
      padding-top: 5px;
      text-align: center;
      font-size: 12px;
      color: #555;
    }

    /* ── PIE ── */
    .footer {
      margin-top: 14px;
      font-size: 12px;
      text-align: center;
      color: #aaa;
      border-top: 1px solid #eee;
      padding-top: 6px;
    }

    @media print {
      html, body { margin: 0; padding: 10mm 10mm 8mm; }
    }
  </style>
</head>
<body>

  <!-- ENCABEZADO igual a todos los comprobantes Macrosoft -->
  <div class="header">
    <div class="empresa">USER</div>
    <div class="modulo">Logística — Comprobante de Retiro</div>
    <div class="doc-tipo">${$?"Pedido Web":"Retiro Local"} · Local: ${f}</div>
  </div>

  <!-- CÓDIGO PRINCIPAL -->
  <div class="codigo-principal">${c.displayLabel||c.ordenDeRetiro}</div>

  <!-- ESTADO -->
  <div style="text-align:center; margin-bottom:18px;">
    <span class="estado-badge">${y?"✓ PAGADO":"PENDIENTE DE PAGO"}</span>
  </div>

  <!-- DATOS DEL RETIRO -->
  <table class="info-table">
    <tr>
      <td>Cliente</td>
      <td>
        ${c.CliNombre?`<strong>${c.CliNombre}</strong>`:""}
        ${c.idcliente?`<span style="color:#888;font-size:9px;">&nbsp;(${c.idcliente})</span>`:""}
      </td>
    </tr>
    ${c.CliTelefono&&c.CliTelefono.trim()?`<tr><td>Teléfono</td><td>${c.CliTelefono.trim()}</td></tr>`:""}
    <tr>
      <td>Tipo Cliente</td>
      <td>${C}</td>
    </tr>
    ${R?`<tr><td>Monto</td><td>${R}</td></tr>`:""}
    ${c.metodoPago?`<tr><td>Forma Pago</td><td>${c.metodoPago}</td></tr>`:""}
    <tr>
      <td>Local Retiro</td>
      <td>${f}</td>
    </tr>
    <tr>
      <td>Fecha Alta</td>
      <td>${c.fechaAlta?new Date(c.fechaAlta).toLocaleString("es-UY",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"-"}</td>
    </tr>
    ${c.direccionEnvio||c.departamentoEnvio||c.localidadEnvio||c.agenciaNombre?`
    <tr><td colspan="2" style="padding-top:6px;padding-bottom:2px;font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Datos de Envío</td></tr>
    ${c.direccionEnvio?`<tr><td>Dirección</td><td>${c.direccionEnvio}</td></tr>`:""}
    ${c.departamentoEnvio?`<tr><td>Departamento</td><td>${c.departamentoEnvio}</td></tr>`:""}
    ${c.localidadEnvio?`<tr><td>Localidad</td><td>${c.localidadEnvio}</td></tr>`:""}
    ${c.agenciaNombre?`<tr><td>Agencia</td><td><strong>${c.agenciaNombre}</strong></td></tr>`:""}
    `:""}
  </table>

  <div class="sep"></div>

  <!-- TABLA DE ÓRDENES con importe -->
  <div style="font-size:11px;color:#000;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;font-weight:800;">
    Órdenes incluidas (${D.length})
  </div>
  <table class="orders-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Código de Orden</th>
        <th style="text-align:right;">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${D.map((N,z)=>{const M=N.orderNumber||N.codigoOrden||"-",w=N.orderCosto||(N.costoFinal?N.costoFinal:null);return`
        <tr>
          <td>${z+1}</td>
          <td><strong>${M}</strong></td>
          <td style="text-align:right;">${w||"-"}</td>
        </tr>`}).join("")}
      ${D.length===0?'<tr><td colspan="3" style="text-align:center;color:#aaa;">Sin órdenes registradas</td></tr>':""}
    </tbody>
  </table>

  <div class="sep"></div>

  <!-- PIE: impresión + firmas (igual a LogisticsPage) -->
  <table style="width:100%;font-size:9px;color:#666;">
    <tr>
      <td>Impreso:</td>
      <td style="text-align:right;">${U}</td>
    </tr>
  </table>

  <!-- QR del retiro (igual patrón que labelPrinter.js) -->
  <div style="text-align:center; margin:8px 0 14px;">
    <img
      src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(c.displayLabel||c.ordenDeRetiro)}&color=000000&bgcolor=ffffff&margin=2"
      alt="QR"
      style="width:90px;height:90px;border:1px solid #eee;"
    />
    <div style="font-size:9px;color:#999;margin-top:2px;letter-spacing:1px;">${c.displayLabel||c.ordenDeRetiro}</div>
  </div>

  <div class="firma-row">
    <div class="firma-box">Firma y Aclaración Cliente</div>
    <div class="firma-box">Firma Responsable Logística</div>
  </div>

  <div class="footer">
    USER — Documento interno. Conserve este comprobante.
  </div>

</body>
</html>`,E=window.open("","_blank","width=620,height=800");E&&(E.document.write(v),E.document.close(),E.focus())},ve=c=>{const D=`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Etiquetas de Despacho</title>
  <style>
    @page { size: 10cm 15cm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; }
    
    .label {
      width: 10cm;
      height: 15cm;
      background: #fff;
      border: 2px solid #222;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      overflow: hidden;
    }
    .label:last-child { page-break-after: avoid; }

    /* Header bar */
    .header-bar {
      background: #1a1a1a;
      color: #fff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .orden-code {
      font-size: 16px;
      font-weight: 900;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
      background: rgba(255,255,255,0.15);
      padding: 3px 10px;
      border-radius: 4px;
    }

    /* Destinatario */
    .dest-section {
      flex: 1;
      padding: 16px 20px 10px;
      display: flex;
      flex-direction: column;
    }
    .badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #fff;
      background: #1a1a1a;
      padding: 3px 10px;
      border-radius: 3px;
      margin-bottom: 10px;
      width: fit-content;
    }
    .dest-nombre {
      font-size: 24px;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.15;
      margin-bottom: 10px;
      color: #111;
      border-bottom: 2px solid #eee;
      padding-bottom: 8px;
    }
    .dest-row {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .dest-row .icon {
      display: inline-block;
      width: 18px;
      font-size: 13px;
      color: #888;
    }
    .agencia-pill {
      margin-top: 10px;
      font-size: 15px;
      font-weight: 800;
      color: #1a1a1a;
      background: #f0f0f0;
      border: 1.5px solid #ccc;
      padding: 6px 14px;
      border-radius: 6px;
      display: inline-block;
    }

    /* Divider */
    .divider-area {
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 8px;
    }
    .divider-line {
      flex: 1;
      border-top: 2px dashed #aaa;
    }
    .scissors {
      font-size: 16px;
      color: #aaa;
    }

    /* Remitente */
    .rem-section {
      padding: 10px 20px 14px;
      background: #fafafa;
      border-top: 1px solid #eee;
    }
    .rem-badge {
      background: #666;
      margin-bottom: 6px;
    }
    .rem-nombre {
      font-size: 20px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #333;
      margin-bottom: 4px;
    }
    .rem-row {
      font-size: 14px;
      font-weight: 700;
      color: #555;
      line-height: 1.6;
    }

    @media print {
      body { background: #fff; }
      .label { border: none; }
    }
  </style>
</head>
<body>
  ${(Array.isArray(c)?c:[c]).map(f=>{const R=f.CliNombre||f.idcliente||"-",$=f.CliTelefono?f.CliTelefono.trim():"",v=f.departamentoEnvio||"",E=f.localidadEnvio||"",N=f.direccionEnvio||"",z=f.agenciaNombre||"";return`
      <div class="label">
        <div class="header-bar">
          <span class="logo">USER</span>
          <span class="orden-code">${f.displayLabel||f.ordenDeRetiro||""}</span>
        </div>

        <div class="dest-section">
          <div class="badge">DESTINATARIO</div>
          <div class="dest-nombre">${R}</div>
          ${$?`<div class="dest-row"><span class="icon">&#9742;</span> ${$}</div>`:""}
          ${v?`<div style="font-size:26px;font-weight:900;color:#111;text-transform:uppercase;line-height:1.2;">${v}</div>`:""}
          ${E?`<div style="font-size:26px;font-weight:900;color:#111;text-transform:uppercase;line-height:1.2;margin-bottom:4px;">${E}</div>`:""}
          ${N?`<div style="font-size:20px;font-weight:800;color:#222;line-height:1.3;margin-bottom:4px;">${N}</div>`:""}
          ${z?`<div class="agencia-pill">AGENCIA &gt; ${z}</div>`:""}
        </div>

        <div class="divider-area" style="padding-top:0;margin-top:-4px;">
          <div class="divider-line"></div>
        </div>

        <div class="rem-section">
          <div class="badge rem-badge">REMITENTE</div>
          <div class="rem-nombre">USER</div>
          <div class="rem-row">Arenal Grande 2667</div>
          <div class="rem-row">Montevideo, Uruguay</div>
          <div class="rem-row">&#9742; 092284262</div>
        </div>
      </div>
    `}).join("")}
</body>
</html>`,C=window.open("","_blank","width=420,height=620");C&&(C.document.write(D),C.document.close(),C.focus(),setTimeout(()=>C.print(),400))},Ue=()=>{const[c,U]=g.useState("empaque"),[y,D]=g.useState([]),[C,f]=g.useState([]),[R,$]=g.useState({}),[v,E]=g.useState([]),[N,z]=g.useState(!0),[M,w]=g.useState(null),[m,_]=g.useState(null),[F,q]=g.useState({}),[Ne,J]=g.useState(!1),[h,oe]=g.useState(""),[k,Q]=g.useState("ALL"),[W,ae]=A.useState("ALL"),[H,le]=A.useState("ALL"),[L,G]=A.useState(null),[ne,Z]=A.useState(null),[X,ee]=A.useState(""),[te,ie]=A.useState(""),[de,Y]=A.useState({}),[ce,K]=A.useState(""),[P,re]=A.useState({});g.useEffect(()=>{const t=De(window.location.origin,{transports:["websocket","polling"]});return t.on("retiros:update",o=>{const n=o?.type||"estado";n==="asignado_estante"&&o?.ordenRetiro?E(i=>i.filter(l=>l.ordenDeRetiro!==o.ordenRetiro)):T(!(n==="pago"||n==="pago_web"||n==="estado"))}),()=>t.disconnect()},[]);const T=g.useCallback(async(t=!0)=>{z(!0),w(null);try{let o=[];try{const{data:d}=await S.get("/web-retiros/locales");o=(d||[]).filter(s=>s.Estado===1||s.Estado===3).map(s=>({ordenDeRetiro:s.OrdIdRetiro,idcliente:s.NombreCliente||s.CodCliente||"Ecommerce",monto:s.Monto||0,moneda:s.Moneda||"UYU",pagorealizado:s.Estado===3||s.Estado===8?1:0,pagoHandy:!!s.ReferenciaPago,lugarRetiro:s.LugarRetiro||null,agenciaNombre:s.AgenciaNombre||null,direccionEnvio:s.DireccionEnvio||null,departamentoEnvio:s.DepartamentoEnvio||null,localidadEnvio:s.LocalidadEnvio||null,orders:s.BultosJSON?JSON.parse(s.BultosJSON):s.OrdenesCodigos?s.OrdenesCodigos.split(",").map(a=>({orderNumber:a.trim(),orderId:a.trim()})):[]}))}catch{}D(o);let n=[];try{n=(await S.get("/web-retiros/estantes")).data||[]}catch{}const i={},l={};n.forEach(d=>{if(d.OrdenRetiro){i[d.UbicacionID]||(i[d.UbicacionID]=[]);const s=d.OrdenesCodigos?d.OrdenesCodigos.split(",").map(a=>({orderNumber:a.trim(),orderId:a.trim()})):d.BultosJSON?JSON.parse(d.BultosJSON):[];i[d.UbicacionID].push({...d,orders:s})}l[d.EstanteID]||(l[d.EstanteID]={id:d.EstanteID,secciones:0,posiciones:0}),d.Seccion>l[d.EstanteID].secciones&&(l[d.EstanteID].secciones=d.Seccion),d.Posicion>l[d.EstanteID].posiciones&&(l[d.EstanteID].posiciones=d.Posicion)}),f(Object.values(l).sort((d,s)=>d.id.localeCompare(s.id))),$(i);try{const{data:d}=await S.get("/apiordenesRetiro/estados?estados=1,3,4,7,8"),s=new Set;Object.values(i).forEach(r=>r.forEach(p=>{p.OrdenRetiro&&s.add(p.OrdenRetiro)}));const a=new Set(o.map(r=>{const p=(r.ordenDeRetiro||"").match(/(\d+)$/);return p?parseInt(p[1],10):null}).filter(Boolean)),b=(Array.isArray(d)?d:[]).filter(r=>{if(s.has(r.ordenDeRetiro))return!1;const p=(r.ordenDeRetiro||"").match(/(\d+)$/),u=p?parseInt(p[1],10):null;return!(u&&a.has(u))});E(b)}catch{}t&&S.post("/web-retiros/sincronizar").then(()=>{S.get("/web-retiros/locales").then(d=>{const s=d.data.filter(a=>a.Estado===1||a.Estado===3).map(a=>({ordenDeRetiro:a.OrdIdRetiro,idcliente:a.NombreCliente||a.CodCliente||"Ecommerce",monto:a.Monto||0,moneda:a.Moneda||"UYU",pagorealizado:a.Estado===3||a.Estado===8?1:0,pagoHandy:!!a.ReferenciaPago,lugarRetiro:a.LugarRetiro||null,agenciaNombre:a.AgenciaNombre||null,direccionEnvio:a.DireccionEnvio||null,departamentoEnvio:a.DepartamentoEnvio||null,localidadEnvio:a.LocalidadEnvio||null,orders:a.BultosJSON?JSON.parse(a.BultosJSON):a.OrdenesCodigos?a.OrdenesCodigos.split(",").map(b=>({orderNumber:b.trim(),orderId:b.trim()})):[]}));D(s)})}).catch(d=>{})}catch{w("Problema al cargar la base de datos de retiros.")}finally{z(!1)}},[]);g.useEffect(()=>{T()},[T]);const xe=t=>{_(t),q({}),J(!1)},we=async(t,o,n)=>{if(!m)return;const i=`${t}-${o}-${n}`,l=m,d=R[i]||[];if(d.length>0){const s=d[0],a=String(s.CodigoCliente||"").trim().toLowerCase(),b=String(l.idcliente||"").trim().toLowerCase();if(a!==b&&a!=="ecommerce"){w("No puedes guardar órdenes de diferentes clientes en el mismo casillero.");return}}$(s=>{const a=s[i]||[];return{...s,[i]:[...a,{OrdenRetiro:l.ordenDeRetiro,CodigoCliente:l.idcliente,ClientName:l.clienteNombre||l.ClientName||l.idcliente}]}}),D(s=>s.filter(a=>a.ordenDeRetiro!==l.ordenDeRetiro)),E(s=>s.filter(a=>a.ordenDeRetiro!==l.ordenDeRetiro)),_(null),q({}),J(!1);try{const s=[];l.orders?.forEach(b=>{F[b.orderNumber]&&s.push(b.orderNumber)});const a={estanteId:t,seccion:o,posicion:n,ordenRetiro:l.ordenDeRetiro,codigoCliente:l.idcliente,bultos:l.orders,pagado:l.pagorealizado===1,scannedValues:s};await S.post("/web-retiros/estantes/asignar",a)}catch(s){w(s.response?.data?.error||s.message||"Error al asignar"),T(!1)}},pe=(t,o)=>{const i=(Array.isArray(o)?o:[o]).map(a=>{const b=a.OrdenRetiro||a.ordenDeRetiro,r=y.find(p=>p.ordenDeRetiro===b)||v.find(p=>p.ordenDeRetiro===b);return{...a,orders:a.orders?.length?a.orders:r?.orders||[],pagorealizado:a.Pagado?1:r?.pagorealizado??a.pagorealizado??0,TClDescripcion:r?.TClDescripcion||a.TClDescripcion||"",estado:r?.estado||a.estado||""}});let l=null,d=null;for(const a of i){const b=a.OrdenRetiro||a.ordenDeRetiro,r=y.find(u=>u.ordenDeRetiro===b)||v.find(u=>u.ordenDeRetiro===b);let p=!1;if(r){const u=(r.TClDescripcion||"").toLowerCase(),x=typeof r.estado=="string"?r.estado.toLowerCase():"";(r.pagorealizado===1||x.includes("abonado"))&&(p=!0),(u.includes("semanal")||u.includes("rollo"))&&(p=!0)}else a.Pagado&&(p=!0);if(!p){l=a,d=r;break}}if(l){Z({id:t,data:l,raw:d,blockList:i});return}G({id:t,dataList:i}),Y({}),K("");const s={};i.forEach(a=>s[a.OrdenRetiro||a.ordenDeRetiro]=!0),re(s)},je=async t=>{if(t.preventDefault(),!X||!te)return;const o=ne,n=o.blockList,i=o.raw||o.data;try{await S.post("/web-retiros/excepcional",{ordenRetiro:i.ordenDeRetiro||i.OrdenRetiro,codigoCliente:i.idcliente||i.CodigoCliente||i.CliCodigoCliente,monto:i.monto||i.Monto||0,password:X,explicacion:te}),Z(null),ee(""),ie(""),w(null),G({id:o.id,dataList:n}),Y({}),K("");const l={};n.forEach(d=>l[d.OrdenRetiro||d.ordenDeRetiro]=!0),re(l)}catch(l){const d=l.response?.data?.error||"Falló la autorización excepcional";w(d)}},ye=async()=>{if(!L)return;const{id:t,dataList:o}=L;let n=[];if(t==="FUERA DE ESTANTE"?n=[o[0].ordenDeRetiro||o[0].OrdenRetiro]:n=o.map(i=>i.OrdenRetiro||i.ordenDeRetiro).filter(i=>P[i]),n.length!==0){$(i=>{const l={...i};if(l[t]){const d=l[t].filter(s=>!n.includes(s.OrdenRetiro||s.ordenDeRetiro));d.length===0?delete l[t]:l[t]=d}return l}),G(null);try{await S.post("/web-retiros/estantes/liberar-multiple",{ubicacionId:t,ordenesParaEntregar:n})}catch(i){w(i.response?.data?.error||i.message||"Error al liberar el estante"),T(!1)}}};g.useEffect(()=>{if(!h||h.length<3)return;const t=h.toLowerCase();for(const o in R){const n=R[o];if(n.OrdenRetiro&&n.OrdenRetiro.toLowerCase().includes(t)||n.ClientName&&n.ClientName.toLowerCase().includes(t)||n.CodigoCliente&&n.CodigoCliente.toLowerCase().includes(t)){const i=document.getElementById(`box-${o}`);i&&i.scrollIntoView({behavior:"smooth",block:"center"});break}}},[h,R]);const Ce=()=>{const[t,o]=g.useState(""),n=A.useRef(null),i=s=>q(a=>({...a,[s]:!a[s]})),l=m.orders?.every(s=>F[s.orderNumber]),d=s=>{s.preventDefault();const a=t.trim().toUpperCase();if(!a)return;const b=m.orders?.find(r=>r.orderNumber.toUpperCase()===a);b&&q(r=>({...r,[b.orderNumber]:!0})),o("")};return e.jsxs("div",{className:"bg-white rounded-[24px] shadow-sm p-8 max-w-2xl mx-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200",children:[e.jsxs("div",{className:"flex justify-between items-start mb-6",children:[e.jsx("button",{onClick:()=>_(null),className:"p-3 bg-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors",children:e.jsx(ze,{size:24})}),e.jsxs("div",{className:"text-right",children:[e.jsx("span",{className:"text-[10px] font-bold text-blue-500 tracking-wider uppercase",children:"Detalle Envio Web"}),e.jsx("h2",{className:"text-3xl font-black text-slate-800 mt-1",children:m.pagoHandy?m.ordenDeRetiro.replace("R-","PW-"):m.ordenDeRetiro}),e.jsx("p",{className:"text-slate-400 font-medium uppercase text-sm mt-1",children:m.idcliente})]})]}),e.jsxs("form",{onSubmit:d,className:"mb-6 relative",children:[e.jsx("div",{className:"absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none",children:e.jsx(V,{className:"h-5 w-5 text-blue-400"})}),e.jsx("input",{ref:n,type:"text",value:t,onChange:s=>o(s.target.value),className:"block w-full pl-12 pr-16 py-4 border-2 border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white text-lg font-bold transition-all text-slate-700",placeholder:"Escanee el bulto aquí...",autoFocus:!0}),e.jsx("button",{type:"submit",className:"absolute inset-y-2 right-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700",children:"OK"})]}),e.jsxs("div",{className:"grid gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100",children:[e.jsx("p",{className:"text-xs font-bold text-slate-500 uppercase tracking-widest mb-2",children:"Checklist de Bultos"}),m.orders?.map(s=>e.jsxs("div",{onClick:()=>i(s.orderNumber),className:`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${F[s.orderNumber]?"bg-green-50 border-green-500 shadow-sm":"bg-white border-slate-200 hover:border-slate-300"}`,children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:`p-3 rounded-lg ${F[s.orderNumber]?"bg-green-500 text-white":"bg-slate-100 text-slate-400"}`,children:e.jsx(B,{size:20})}),e.jsxs("div",{children:[e.jsx("div",{className:"text-lg font-bold text-slate-700",children:s.orderNumber}),e.jsx("div",{className:"text-[10px] font-medium text-slate-400 uppercase",children:"Verificado automáticamente"})]})]}),F[s.orderNumber]?e.jsx(fe,{className:"text-green-500",size:24}):e.jsx("div",{className:"w-6 h-6 rounded-full border-2 border-slate-300"})]},s.orderNumber))]}),e.jsxs("div",{className:"flex gap-4",children:[e.jsx("button",{onClick:()=>_(null),className:"flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all",children:"Cancelar"}),e.jsx("button",{disabled:!l,onClick:()=>J(!0),className:"flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all",children:"Asignar a Estante"})]})]})},Re=()=>e.jsxs("div",{className:"max-w-5xl mx-auto animate-in fade-in duration-300",children:[e.jsxs("div",{className:"flex items-center justify-between mb-8",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl font-black text-slate-800",children:"Mapa del Depósito"}),e.jsxs("p",{className:"text-slate-500 font-medium text-sm mt-1",children:["Haga click en un casillero vacío para ubicar la orden ",e.jsx("strong",{className:"text-blue-600",children:m.pagoHandy?m.ordenDeRetiro.replace("R-","PW-"):m.ordenDeRetiro})]})]}),e.jsx("button",{onClick:()=>J(!1),className:"px-6 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-500 shadow-sm hover:bg-slate-50 text-sm",children:"Atrás"})]}),e.jsx("div",{className:"grid lg:grid-cols-3 gap-4",children:C.map(t=>e.jsxs("div",{className:"bg-white p-4 rounded-2xl border border-slate-200 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx("div",{className:"w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white font-black text-base",children:t.id}),e.jsxs("span",{className:"text-sm font-bold text-slate-700",children:["Estante ",t.id]})]}),e.jsx("div",{className:"space-y-1.5",children:[...Array(t.secciones)].map((o,n)=>e.jsxs("div",{className:"flex gap-1.5 items-center",children:[e.jsxs("div",{className:"w-8 bg-slate-50 rounded-md flex flex-col items-center justify-center border border-slate-200 py-1 shrink-0",children:[e.jsx("span",{className:"text-[8px] font-bold text-slate-400 uppercase",children:"S"}),e.jsx("span",{className:"text-xs font-black text-slate-700",children:n+1})]}),e.jsx("div",{className:"grid grid-cols-5 flex-1 gap-1",children:[...Array(t.posiciones)].map((i,l)=>{const d=`${t.id}-${n+1}-${l+1}`,s=R[d]||[],a=s.length>0;let b=!0;if(a&&m){const r=String(s[0].CodigoCliente||"").trim().toLowerCase(),p=String(m.idcliente||"").trim().toLowerCase();r!==p&&r!=="ecommerce"&&(b=!1)}return e.jsxs("button",{title:a&&s[0]?.OrdenRetiro||d,onClick:()=>{if(!b){w("No puedes guardar órdenes de diferentes clientes en el mismo casillero.");return}we(t.id,n+1,l+1)},className:`relative h-10 rounded-lg border-2 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${a?b?"bg-indigo-600 border-indigo-700 hover:bg-indigo-500":"bg-rose-950 border-rose-800 opacity-60 cursor-not-allowed":"bg-white border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50"}`,children:[a?e.jsx("span",{className:"text-[8px] font-black text-white leading-tight px-0.5 truncate w-full text-center",children:s[0]?.OrdenRetiro?.split("-")[1]||"?"}):e.jsx("span",{className:"text-[8px] text-slate-300",children:l+1}),s.length>1&&e.jsx("div",{className:"absolute top-0 right-0 bg-rose-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center",children:s.length})]},l)})})]},n))})]},t.id))})]});return e.jsxs("div",{className:"p-6 h-full overflow-y-auto",children:[e.jsxs("div",{className:"flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:"w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200",children:e.jsx(ke,{size:24})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-xl font-black text-slate-800 tracking-tight",children:"Logística eCommerce"}),e.jsxs("p",{className:"text-xs text-slate-500 mt-0.5 flex items-center gap-1.5",children:[e.jsx("span",{className:"w-2 h-2 rounded-full bg-green-500 animate-pulse"})," App Activa"]})]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"flex bg-slate-100 p-1.5 rounded-xl border border-slate-200",children:[e.jsxs("button",{onClick:()=>U("empaque"),className:`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${c==="empaque"?"bg-white text-blue-600 shadow-sm":"text-slate-500 hover:bg-slate-200"}`,children:[e.jsx(Ae,{size:18})," Empaque"]}),e.jsxs("button",{onClick:()=>U("entrega"),className:`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${c==="entrega"?"bg-white text-blue-600 shadow-sm":"text-slate-500 hover:bg-slate-200"}`,children:[e.jsx(Le,{size:18})," Entregas a Mostrar"]})]}),e.jsx("button",{title:"Recrear estantes: 3 × 4 secciones × 10 posiciones",onClick:async()=>{if(window.confirm(`¿Recrear ConfiguracionEstantes con 3 estantes (A/B/C) × 4 secciones × 10 posiciones?
Las ubicaciones ocupadas NO se borran.`))try{const t=await S.post("/web-retiros/estantes/config/seed",{estantes:["A","B","C"],secciones:4,posiciones:10});alert("✅ "+t.data.message),T(!1)}catch(t){alert("❌ Error: "+(t.response?.data?.error||t.message))}},className:"p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors",children:"⚙️"})]})]}),N&&!m&&y.length===0&&e.jsxs("div",{className:"flex flex-col items-center justify-center py-20",children:[e.jsx(Se,{className:"animate-spin text-blue-600 mb-4",size:40}),e.jsx("p",{className:"text-slate-500 font-medium",children:"Sincronizando con Servidor Web..."})]}),!N||y.length>0||v.length>0?c==="empaque"?m?Ne?e.jsx(Re,{}):e.jsx(Ce,{}):e.jsxs("div",{className:"animate-in fade-in duration-300",children:[e.jsxs("div",{className:"relative mb-6",children:[e.jsx(V,{className:"absolute left-5 top-1/2 -translate-y-1/2 text-slate-400",size:20}),e.jsx("input",{type:"text",placeholder:"Buscar orden web o cliente...",className:"w-full pl-14 pr-6 py-4 bg-white rounded-xl shadow-sm border border-slate-200 focus:border-blue-500 outline-none text-base font-medium transition-all",value:h,onChange:t=>oe(t.target.value)})]}),(()=>{const t=[{key:"PAGADO",label:"Pagados",color:"text-emerald-600",dot:"bg-emerald-500",badge:"bg-emerald-50 border-emerald-200 text-emerald-700"},{key:"ROLLO",label:"Rollo por Adelantado",color:"text-amber-600",dot:"bg-amber-500",badge:"bg-amber-50 border-amber-200 text-amber-700"},{key:"SEMANAL",label:"Semanales",color:"text-indigo-600",dot:"bg-indigo-500",badge:"bg-indigo-50 border-indigo-200 text-indigo-700"},{key:"PENDIENTE",label:"Pendientes de Pago",color:"text-rose-600",dot:"bg-rose-500",badge:"bg-rose-50 border-rose-200 text-rose-700"}],o=Array.from(new Set([...y,...v].map(n=>n.lugarRetiro).filter(Boolean))).sort();return e.jsxs("div",{className:"flex flex-col gap-3 mb-5",children:[e.jsxs("div",{className:"flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider",children:[e.jsx("button",{onClick:()=>ae("ALL"),className:`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${W==="ALL"?"bg-slate-800 text-white border-slate-800 shadow-md":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`,children:"Todos"}),t.map(n=>e.jsxs("button",{onClick:()=>ae(n.key),className:`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${W===n.key?`${n.dot.replace("bg-","bg-").replace("500","500")} text-white border-transparent shadow-md`:"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`,children:[e.jsx("div",{className:`w-2 h-2 rounded-full ${n.dot}`}),n.label]},n.key))]}),o.length>0&&e.jsxs("div",{className:"flex flex-wrap gap-2 items-center text-xs font-bold uppercase tracking-wider",children:[e.jsx("span",{className:"text-slate-400 py-2",children:"Local de recogida:"}),e.jsx("button",{onClick:()=>le("ALL"),className:`px-4 py-2 rounded-xl border transition-all ${H==="ALL"?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`,children:"Cualquiera"}),o.map((n,i)=>e.jsx("button",{onClick:()=>le(n),className:`px-4 py-2 rounded-xl border transition-all ${H===n?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`,children:n},i))]})]})})(),(()=>{const t=[{label:"Pagados",color:"text-emerald-600",dot:"bg-emerald-500",badge:"bg-emerald-50 border-emerald-200 text-emerald-700"},{label:"Rollo por Adelantado",color:"text-amber-600",dot:"bg-amber-500",badge:"bg-amber-50 border-amber-200 text-amber-700"},{label:"Semanales",color:"text-indigo-600",dot:"bg-indigo-500",badge:"bg-indigo-50 border-indigo-200 text-indigo-700"},{label:"Pendientes de Pago",color:"text-rose-600",dot:"bg-rose-500",badge:"bg-rose-50 border-rose-200 text-rose-700"}],o=r=>{if(r.pagorealizado===1||r.pagorealizado===!0)return 0;const p=(r.TClDescripcion||"").toLowerCase();return p.includes("rollo")?1:p.includes("semanal")?2:3},n=r=>{const p=o(r);return["PAGADO","ROLLO","SEMANAL","PENDIENTE"][p]},i=y.map(r=>({_key:`web-${r.ordenDeRetiro}`,ordenDeRetiro:r.ordenDeRetiro,idcliente:r.idcliente,displayLabel:r.pagoHandy?r.ordenDeRetiro.replace("R-","PW-"):r.ordenDeRetiro,pagorealizado:r.pagorealizado,TClDescripcion:r.TClDescripcion||"",fechaAlta:r.fechaAlta||r.FechaAlta||null,lugarRetiro:r.lugarRetiro||"Web",agenciaNombre:r.agenciaNombre||null,direccionEnvio:r.direccionEnvio||null,departamentoEnvio:r.departamentoEnvio||null,localidadEnvio:r.localidadEnvio||null,totalCost:r.monto?`${r.moneda} ${Number(r.monto).toFixed(2)}`:"-",orders:r.orders,pagoHandy:r.pagoHandy,_isWeb:!0,_raw:r})),l=v.map(r=>({_key:`local-${r.ordenDeRetiro}`,ordenDeRetiro:r.ordenDeRetiro,idcliente:r.CliCodigoCliente,displayLabel:r.ordenDeRetiro,pagorealizado:r.pagorealizado,TClDescripcion:r.TClDescripcion||"",fechaAlta:r.fechaAlta||r.FechaAlta||null,lugarRetiro:r.lugarRetiro||"-",agenciaNombre:r.agenciaNombre||null,direccionEnvio:r.direccionEnvio||null,departamentoEnvio:r.departamentoEnvio||null,localidadEnvio:r.localidadEnvio||null,totalCost:r.totalCost&&r.totalCost!=="NaN"?r.totalCost:r.montopagorealizado||"-",orders:(r.orders||[]).map(p=>({orderNumber:p.orderNumber||p.codigoOrden,orderId:p.orderId})),pagoHandy:!1,_isWeb:!1,_raw:r})),d=new Set,s=[];for(const r of[...i,...l])d.has(r.ordenDeRetiro)||(d.add(r.ordenDeRetiro),s.push(r));const a=s.filter(r=>{if(W!=="ALL"&&n(r)!==W||H!=="ALL"&&r.lugarRetiro!==H)return!1;if(h){const p=h.toLowerCase();if(!(r.ordenDeRetiro&&r.ordenDeRetiro.toLowerCase().includes(p))&&!(r.idcliente&&String(r.idcliente).toLowerCase().includes(p)))return!1}return!0}).sort((r,p)=>{const u=o(r),x=o(p);if(u!==x)return u-x;const I=r.fechaAlta?new Date(r.fechaAlta).getTime():1/0,be=p.fechaAlta?new Date(p.fechaAlta).getTime():1/0;return I-be});if(i.length===0&&l.length===0)return e.jsxs("div",{className:"py-16 flex flex-col items-center gap-3 text-slate-400",children:[e.jsx(B,{size:48,strokeWidth:1.5,className:"opacity-40"}),e.jsx("p",{className:"font-semibold",children:"No hay retiros en espera."})]});if(a.length===0)return e.jsx("div",{className:"py-8 flex flex-col items-center gap-2 text-slate-400",children:e.jsx("p",{className:"font-semibold text-sm",children:"No hay retiros con los filtros seleccionados."})});const b=[0,1,2,3].map(r=>({priority:r,meta:t[r],items:a.filter(p=>o(p)===r)})).filter(r=>r.items.length>0);return e.jsx("div",{className:"flex flex-col gap-6",children:b.map(({priority:r,meta:p,items:u})=>e.jsxs("div",{children:[e.jsxs("div",{className:`flex items-center gap-3 px-4 py-2 rounded-xl mb-3 border ${p.badge}`,children:[e.jsx("div",{className:`w-2.5 h-2.5 rounded-full ${p.dot}`}),e.jsx("span",{className:`text-[11px] font-black uppercase tracking-widest ${p.color}`,children:p.label}),e.jsx("span",{className:`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${p.dot} text-white`,children:u.length})]}),e.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3",children:u.map(x=>{const I=()=>{x._isWeb?xe(x._raw):xe({ordenDeRetiro:x.ordenDeRetiro,idcliente:x.idcliente,clienteNombre:x._raw.TClNombre||x.idcliente,monto:parseFloat(x._raw.totalCost)||0,moneda:"UYU",pagorealizado:x.pagorealizado,TClDescripcion:x.TClDescripcion,orders:x.orders})},ue=(j=>{if(!j)return null;const O=Math.floor((Date.now()-new Date(j).getTime())/1e3);return O<60?`${O}s`:O<3600?`${Math.floor(O/60)}m`:O<86400?`${Math.floor(O/3600)}h ${Math.floor(O%3600/60)}m`:`${Math.floor(O/86400)}d`})(x.fechaAlta),ge=(x.orders||[]).length,Ee=(x.fechaAlta?Math.floor((Date.now()-new Date(x.fechaAlta).getTime())/6e4):0)>480?"text-rose-600 font-black":"text-slate-700 font-bold";return e.jsxs("button",{onClick:I,className:"group relative bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 flex flex-col gap-2 overflow-hidden",children:[e.jsx("div",{className:`absolute top-0 left-0 right-0 h-1 ${p.dot} rounded-t-2xl`}),e.jsxs("div",{className:"absolute top-2 right-2 flex items-center gap-1 z-10",children:[e.jsx("div",{role:"button",tabIndex:0,onClick:j=>{j.stopPropagation(),ve(x)},onKeyDown:j=>{j.key==="Enter"&&(j.stopPropagation(),ve(x))},title:"Imprimir etiqueta",className:"w-9 h-9 rounded-lg flex items-center justify-center text-custom-dark hover:text-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer",children:e.jsx(Te,{size:18})}),e.jsx("div",{role:"button",tabIndex:0,onClick:j=>{j.stopPropagation(),he(x)},onKeyDown:j=>{j.key==="Enter"&&(j.stopPropagation(),he(x))},title:"Imprimir hoja de despacho",className:"w-9 h-9 rounded-lg flex items-center justify-center text-custom-dark hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer",children:e.jsx($e,{size:18})})]}),e.jsx("div",{className:"font-black text-slate-800 text-sm tracking-tight leading-tight mt-1",children:x.displayLabel}),x.CliNombre&&e.jsx("div",{className:"text-[11px] font-semibold text-slate-600 truncate leading-tight",children:x.CliNombre}),e.jsxs("div",{className:"flex flex-wrap items-center gap-1 mt-0.5",children:[e.jsx("span",{className:"text-[9px] font-bold text-slate-400 uppercase",children:x.idcliente}),x.TClDescripcion&&e.jsx("span",{className:"text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-bold",children:x.TClDescripcion})]}),x.lugarRetiro&&x.lugarRetiro!=="Desconocido"&&e.jsx("div",{className:"text-[10px] font-bold text-blue-500 truncate leading-tight",children:x.agenciaNombre?x.lugarRetiro.replace(/\s*\(.*\)\s*$/,"")+` (${x.agenciaNombre})`:x.lugarRetiro}),e.jsxs("div",{className:"flex items-center justify-between mt-auto",children:[ue&&e.jsxs("span",{className:`flex items-center gap-0.5 text-xs ${Ee}`,children:[e.jsx(me,{size:10})," ",ue]}),e.jsx("div",{className:"flex items-center gap-2 ml-auto",children:ge>0&&e.jsxs("span",{className:"flex items-center gap-0.5 text-[10px] font-bold text-slate-400",children:[e.jsx(B,{size:9})," ",ge]})})]})]},x._key)})})]},r))})})()]}):e.jsx("div",{className:"animate-in fade-in duration-300",children:e.jsxs("div",{className:"mt-4",children:[e.jsxs("div",{className:"flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-3 rounded-3xl border border-slate-100 shadow-sm",children:[e.jsxs("div",{className:"relative w-full md:w-96 flex-shrink-0",children:[e.jsx(V,{className:"absolute left-4 top-1/2 -translate-y-1/2 text-slate-400",size:18}),e.jsx("input",{type:"text",placeholder:"Buscar por orden o cliente...",className:"w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all",value:h,onChange:t=>oe(t.target.value)})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsx("button",{onClick:()=>Q("ALL"),className:`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${k==="ALL"?"bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200":"bg-transparent text-slate-500 border-transparent hover:bg-slate-50"}`,children:"Ver Todo"}),e.jsx("button",{onClick:()=>Q("FUERA"),className:`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${k==="FUERA"?"bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200":"bg-transparent text-slate-500 border-transparent hover:bg-slate-50"}`,children:"Fuera de Estante"}),C.map(t=>e.jsxs("button",{onClick:()=>Q(t.id),className:`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${k===t.id?"bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200":"bg-transparent text-slate-500 border-transparent hover:bg-slate-50"}`,children:["Estante ",t.id]},t.id))]})]}),k!=="FUERA"&&e.jsx("div",{className:"grid gap-4",children:C.filter(t=>k==="ALL"||k===t.id).map(t=>e.jsxs("div",{className:"bg-white p-4 rounded-2xl border border-slate-100 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-3 mb-4",children:[e.jsx("div",{className:"w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-base italic shadow-md shadow-blue-200",children:t.id}),e.jsxs("span",{className:"text-base font-black text-slate-800 uppercase italic tracking-tighter",children:["Bloque ",t.id]})]}),e.jsx("div",{className:"space-y-1.5",children:[...Array(t.secciones)].map((o,n)=>e.jsxs("div",{className:"flex gap-2 items-center",children:[e.jsxs("div",{className:"w-10 h-10 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 shrink-0",children:[e.jsx("span",{className:"text-[9px] font-black text-slate-400 uppercase",children:"Sec"}),e.jsx("span",{className:"text-sm font-black text-blue-600",children:n+1})]}),e.jsx("div",{className:"grid grid-cols-5 flex-1 gap-1.5",children:[...Array(t.posiciones)].map((i,l)=>{const d=`${t.id}-${n+1}-${l+1}`,s=R[d]||[],a=s.length>0;s[0];const b=h.toLowerCase(),r=a&&s.some(x=>x.OrdenRetiro&&x.OrdenRetiro.toLowerCase().includes(b)||x.CodigoCliente&&String(x.CodigoCliente).toLowerCase().includes(b)||x.ClientName&&x.ClientName.toLowerCase().includes(b)),p=h&&a&&!r,u=h&&a&&r;return e.jsx("div",{id:`box-${d}`,className:`h-14 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-0.5 relative group overflow-hidden 
                                        ${a?"bg-indigo-600 border-indigo-700 shadow-sm shadow-indigo-200":"bg-white border-dashed border-slate-200"}
                                        ${p?"opacity-20 grayscale":""}
                                        ${u?"ring-4 ring-green-400 border-green-500 bg-green-600 scale-[1.02]":""}
                                      `,children:a?e.jsxs(e.Fragment,{children:[s.length>1&&e.jsx("div",{className:"absolute top-0.5 right-0.5 bg-rose-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center z-10",children:s.length}),e.jsx("span",{className:`text-[8px] font-bold absolute top-0.5 left-1 ${u?"text-green-100":"text-indigo-300"}`,children:d}),e.jsx("div",{className:"flex flex-col gap-0.5 w-full overflow-hidden mt-3 px-1",children:s.slice(0,2).map((x,I)=>e.jsx("span",{className:"text-[9px] font-black text-white truncate text-center leading-tight",children:x.PagoHandy?x.OrdenRetiro.replace("R-","PW-"):x.OrdenRetiro},I))}),a&&e.jsx("div",{className:"absolute inset-0 bg-blue-700/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",onClick:()=>pe(d,s),children:e.jsxs("button",{className:"px-2 py-1 bg-white text-blue-600 rounded-lg font-black text-[9px] uppercase shadow flex items-center gap-1",children:[e.jsx(se,{size:10})," ENTREGAR"]})})]}):e.jsxs(e.Fragment,{children:[e.jsxs("span",{className:"text-[9px] font-black text-slate-300",children:["P",l+1]}),e.jsx("div",{className:"w-1 h-1 rounded-full bg-slate-200"})]})},l)})})]},n))})]},t.id))}),(k==="ALL"||k==="FUERA")&&v.length>0&&e.jsxs("div",{className:k==="ALL"?"mt-10 pt-8 border-t-2 border-slate-100":"",children:[e.jsxs("div",{className:"flex items-center gap-3 mb-5",children:[e.jsx("h3",{className:"text-lg font-black text-slate-800",children:"Retiros fuera de estante"}),e.jsx("span",{className:"px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold",children:v.filter(t=>{if(!h)return!0;const o=h.toLowerCase();return(t.ordenDeRetiro||"").toLowerCase().includes(o)||(t.CliCodigoCliente||"").toLowerCase().includes(o)}).length})]}),e.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3",children:v.filter(t=>{if(!h)return!0;const o=h.toLowerCase();return(t.ordenDeRetiro||"").toLowerCase().includes(o)||(t.CliCodigoCliente||"").toLowerCase().includes(o)}).sort((t,o)=>{const n=i=>i.pagorealizado===1||i.pagorealizado===!0?0:(i.TClDescripcion||"").toLowerCase().includes("rollo")?1:(i.TClDescripcion||"").toLowerCase().includes("semanal")?2:3;return n(t)!==n(o)?n(t)-n(o):new Date(t.fechaAlta||0)-new Date(o.fechaAlta||0)}).map(t=>{const o=t.pagorealizado===1||t.pagorealizado===!0,n=(t.TClDescripcion||"").toLowerCase(),i=o?"bg-emerald-500":n.includes("rollo")?"bg-amber-500":n.includes("semanal")?"bg-indigo-500":"bg-rose-500",l=t.fechaAlta?Math.floor((Date.now()-new Date(t.fechaAlta).getTime())/6e4):0,d=Math.floor(l/1440),s=Math.floor(l%1440/60),a=l%60,b=d>0?`${d}d`:s>0?`${s}h ${a}m`:`${a}m`;return e.jsxs("div",{className:"relative bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2 overflow-hidden",children:[e.jsx("div",{className:`absolute top-0 left-0 right-0 h-1 ${i} rounded-t-2xl`}),e.jsx("div",{className:"font-black text-slate-800 text-sm tracking-tight mt-1",children:t.ordenDeRetiro}),e.jsx("div",{className:"text-[10px] font-bold text-slate-400 uppercase truncate",children:t.CliCodigoCliente||t.CliNombre}),e.jsx("div",{className:`text-xs font-black ${o?"text-emerald-600":"text-rose-500"}`,children:o?"Pagado ✓":"Pend. Pago"}),e.jsxs("div",{className:"flex items-center justify-between mt-auto",children:[e.jsxs("span",{className:"flex items-center gap-0.5 text-[10px] font-bold text-slate-700",children:[e.jsx(me,{size:9})," ",b]}),e.jsxs("span",{className:"flex items-center gap-0.5 text-[10px] font-bold text-slate-400",children:[e.jsx(B,{size:9})," ",(t.orders||[]).length]})]}),e.jsx("button",{onClick:()=>pe("FUERA DE ESTANTE",t),className:"mt-1 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl transition-colors",children:"Entregar"})]},t.ordenDeRetiro)})})]}),k==="FUERA"&&v.length===0&&e.jsxs("div",{className:"py-16 flex flex-col items-center gap-3 text-slate-400",children:[e.jsx(B,{size:48,strokeWidth:1.5,className:"opacity-40"}),e.jsx("p",{className:"font-semibold",children:"No hay retiros fuera de estante."})]})]})}):null,L&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4",children:e.jsxs("div",{className:"bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95",children:[e.jsx("h3",{className:"text-2xl font-black text-slate-800 mb-2 tracking-tight",children:"Confirmar Entrega"}),e.jsxs("p",{className:"text-slate-500 mb-4 font-medium",children:["Ubicación a entregar: ",e.jsx("strong",{className:"text-blue-600",children:L.id})]}),L.dataList.length>1&&e.jsxs("div",{className:"mb-4 bg-slate-100 p-4 rounded-2xl border border-slate-200",children:[e.jsx("p",{className:"text-xs font-bold text-slate-500 uppercase mb-2",children:"Seleccione las órdenes a retirar:"}),e.jsx("div",{className:"flex flex-col gap-2 max-h-32 overflow-y-auto pr-2",children:L.dataList.map(t=>{const o=t.OrdenRetiro||t.ordenDeRetiro,n=!!P[o];return e.jsxs("label",{className:`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-all ${n?"bg-blue-50/80 border border-blue-200":"hover:bg-slate-200 border border-transparent"}`,children:[e.jsx("input",{type:"checkbox",className:"w-5 h-5 accent-blue-600 rounded",checked:n,onChange:i=>re(l=>({...l,[o]:i.target.checked}))}),e.jsx("span",{className:"font-bold text-slate-700",children:t.PagoHandy?o.replace("R-","PW-"):o}),e.jsx("span",{className:"text-xs text-slate-500 truncate",children:t.ClientName||t.CodigoCliente||"Cliente"})]},o)})})]}),e.jsxs("form",{onSubmit:t=>{t.preventDefault();const o=ce.trim().toUpperCase();if(o)try{let n=[];L.dataList.forEach(l=>{const d=l.OrdenRetiro||l.ordenDeRetiro;P[d]&&(l.BultosJSON?n.push(...JSON.parse(l.BultosJSON)):l.orders&&n.push(...l.orders))});const i=n.find(l=>l.orderNumber&&l.orderNumber.toUpperCase()===o||l.id&&l.id.toString().toUpperCase()===o);i&&Y(l=>({...l,[i.orderNumber||i.id]:!0})),K("")}catch{}},className:"mb-6 relative",children:[e.jsx("div",{className:"absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none",children:e.jsx(V,{className:"h-5 w-5 text-blue-400"})}),e.jsx("input",{type:"text",value:ce,onChange:t=>K(t.target.value),className:"block w-full pl-12 pr-16 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-medium transition-all text-slate-700",placeholder:"Escanee el bulto aquí (opcional manual)...",autoFocus:!0}),e.jsx("button",{type:"submit",className:"absolute inset-y-1.5 right-1.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700",children:"OK"})]}),e.jsxs("div",{className:"bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 max-h-48 overflow-y-auto",children:[e.jsx("p",{className:"text-xs font-bold text-slate-400 uppercase tracking-widest mb-3",children:"Checklist Bultos a Entregar"}),e.jsx("ul",{className:"space-y-2",children:(()=>{try{let t=[];return L.dataList.forEach(o=>{const n=o.OrdenRetiro||o.ordenDeRetiro;P[n]&&(o.BultosJSON?t.push(...JSON.parse(o.BultosJSON)):o.orders&&t.push(...o.orders))}),t.length===0?e.jsx("li",{className:"text-sm font-medium text-slate-600",children:"No hay bultos u órdenes seleccionadas."}):t.map((o,n)=>{const i=o.orderNumber||o.id||`Desconocido_${n}`,l=!!de[i];return e.jsxs("li",{onClick:()=>Y(d=>({...d,[i]:!l})),className:`flex items-center gap-3 text-sm font-bold cursor-pointer transition-all p-3 rounded-xl border-2 shadow-sm ${l?"bg-green-50/80 border-green-400 text-green-800":"bg-white border-slate-200 text-slate-700"}`,children:[e.jsx("div",{className:`p-1.5 rounded-md ${l?"bg-green-500/10":"bg-slate-100"}`,children:e.jsx(B,{size:16,className:l?"text-green-600":"text-blue-500"})}),i,e.jsx("span",{className:"text-[11px] font-normal opacity-60 ml-auto mr-2 truncate max-w-[120px]",children:o.ordNombreTrabajo||""}),l?e.jsx(fe,{className:"text-green-500",size:20}):e.jsx("div",{className:"w-5 h-5 rounded-full border-2 border-slate-300"})]},n)})}catch{return e.jsx("li",{className:"text-sm font-medium text-slate-600",children:"Error al leer bultos."})}})()})]}),e.jsxs("div",{className:"flex gap-4",children:[e.jsx("button",{onClick:()=>G(null),className:"flex-[0.8] py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors",children:"Cancelar"}),(()=>{let t=!0;try{let o=[];L.dataList.forEach(i=>{const l=i.OrdenRetiro||i.ordenDeRetiro;P[l]&&(i.BultosJSON?o.push(...JSON.parse(i.BultosJSON)):i.orders&&o.push(...i.orders))}),Object.values(P).some(i=>i)?o.length>0&&(t=o.every(i=>!!de[i.orderNumber||i.id||""])):t=!1}catch{}return e.jsxs("button",{disabled:!t,onClick:ye,className:"flex-[1.2] py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:text-white disabled:shadow-none disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2",children:[e.jsx(se,{size:20})," Entregar Ahora"]})})()]})]})}),ne&&e.jsx("div",{className:"fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4",children:e.jsxs("div",{className:"bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 border-2 border-rose-200",children:[e.jsx("div",{className:"w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4",children:e.jsx(Oe,{size:32})}),e.jsx("h3",{className:"text-2xl font-black text-slate-800 text-center mb-2",children:"!ALERTA!"}),e.jsxs("p",{className:"text-slate-600 font-medium text-center mb-6",children:["Este retiro ",e.jsx("strong",{children:"DEBE SER ABONADO"}),". Por favor verifique que pase por caja y confirme el pago.",e.jsx("br",{}),e.jsx("br",{}),e.jsx("span",{className:"text-xs text-rose-500 font-bold uppercase tracking-wider",children:"Esto es una excepcionalidad"})]}),e.jsxs("form",{onSubmit:je,children:[e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"block text-sm font-bold text-slate-700 mb-2",children:"Contraseña de Autorización"}),e.jsx("input",{type:"password",required:!0,value:X,onChange:t=>{ee(t.target.value),w(null)},className:"w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all",placeholder:"Ingrese contraseña..."})]}),e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"block text-sm font-bold text-slate-700 mb-2",children:"Explicación o Detalle (Requerido)"}),e.jsx("textarea",{required:!0,value:te,onChange:t=>ie(t.target.value),rows:2,className:"w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all resize-none",placeholder:"Justifique la excepción de este retiro..."})]}),M&&e.jsxs("div",{className:"mb-4 bg-red-50 border border-red-300 text-red-700 text-sm font-bold rounded-xl px-4 py-2.5",children:["⚠️ ",M]}),e.jsxs("div",{className:"flex gap-4",children:[e.jsx("button",{type:"button",onClick:()=>{Z(null),ee(""),w(null)},className:"flex-[1] py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors",children:"Cancelar"}),e.jsxs("button",{type:"submit",className:"flex-[1] py-3 px-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-md shadow-rose-200 transition-all flex justify-center items-center gap-2",children:[e.jsx(se,{size:18})," Autorizar"]})]})]})]})})]})};export{Ue as default};
