import{r as h,m as P,a as E,j as e,H as Le,S as X,I as ve,M as Se,L as $e,z as _,J as Ne,X as ze,K as Te,N as we,U as ye,V as Pe,P as Ie,W as Fe,Y as de}from"./index-DwyRdHTZ.js";import{T as Ue}from"./tag-BBdhTmfX.js";const Be=c=>{const J=new Date().toLocaleString("es-UY",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}),R=c.pagorealizado===1||c.pagorealizado===!0,S=c.orders||[];S.map(D=>D.orderNumber||D.codigoOrden||"").filter(Boolean);const A=c.TClDescripcion||"Común",w=c.lugarRetiro&&c.lugarRetiro!=="-"&&c.lugarRetiro!=="Web"?c.lugarRetiro:"Retiro Web",k=c.totalCost&&c.totalCost!=="-"?c.totalCost:null,O=c._isWeb||(c.ordenDeRetiro||"").includes("R-"),N=`<!DOCTYPE html>
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
      border: 2px solid ${R?"#16a34a":"#dc2626"};
      color: ${R?"#16a34a":"#dc2626"};
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
    <div class="doc-tipo">${O?"Pedido Web":"Retiro Local"} · Local: ${w}</div>
  </div>

  <!-- CÓDIGO PRINCIPAL -->
  <div class="codigo-principal">${c.displayLabel||c.ordenDeRetiro}</div>

  <!-- ESTADO -->
  <div style="text-align:center; margin-bottom:18px;">
    <span class="estado-badge">${R?"✓ PAGADO":"PENDIENTE DE PAGO"}</span>
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
      <td>${A}</td>
    </tr>
    ${k?`<tr><td>Monto</td><td>${k}</td></tr>`:""}
    ${c.metodoPago?`<tr><td>Forma Pago</td><td>${c.metodoPago}</td></tr>`:""}
    <tr>
      <td>Local Retiro</td>
      <td>${w}</td>
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
    Órdenes incluidas (${S.length})
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
      ${S.map((D,B)=>{const ee=D.orderNumber||D.codigoOrden||"-",L=D.orderCosto||(D.costoFinal?D.costoFinal:null);return`
        <tr>
          <td>${B+1}</td>
          <td><strong>${ee}</strong></td>
          <td style="text-align:right;">${L||"-"}</td>
        </tr>`}).join("")}
      ${S.length===0?'<tr><td colspan="3" style="text-align:center;color:#aaa;">Sin órdenes registradas</td></tr>':""}
    </tbody>
  </table>

  <div class="sep"></div>

  <!-- PIE: impresión + firmas (igual a LogisticsPage) -->
  <table style="width:100%;font-size:9px;color:#666;">
    <tr>
      <td>Impreso:</td>
      <td style="text-align:right;">${J}</td>
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
</html>`,$=window.open("","_blank","width=620,height=800");$&&($.document.write(N),$.document.close(),$.focus())},Me=c=>{const S=`<!DOCTYPE html>
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
  ${(Array.isArray(c)?c:[c]).map(w=>{const k=w.CliNombre||w.idcliente||"-",O=w.CliTelefono?w.CliTelefono.trim():"",N=w.departamentoEnvio||"",$=w.localidadEnvio||"",D=w.direccionEnvio||"",B=w.agenciaNombre||"";return`
      <div class="label">
        <div class="header-bar">
          <span class="logo">USER</span>
          <span class="orden-code">${w.displayLabel||w.ordenDeRetiro||""}</span>
        </div>

        <div class="dest-section">
          <div class="badge">DESTINATARIO</div>
          <div class="dest-nombre">${k}</div>
          ${O?`<div class="dest-row"><span class="icon">&#9742;</span> ${O}</div>`:""}
          ${N?`<div style="font-size:26px;font-weight:900;color:#111;text-transform:uppercase;line-height:1.2;">${N}</div>`:""}
          ${$?`<div style="font-size:26px;font-weight:900;color:#111;text-transform:uppercase;line-height:1.2;margin-bottom:4px;">${$}</div>`:""}
          ${D?`<div style="font-size:20px;font-weight:800;color:#222;line-height:1.3;margin-bottom:4px;">${D}</div>`:""}
          ${B?`<div class="agencia-pill">AGENCIA &gt; ${B}</div>`:""}
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
</html>`,A=window.open("","_blank","width=420,height=620");A&&(A.document.write(S),A.document.close(),A.focus(),setTimeout(()=>A.print(),400))},qe=()=>{const[c,J]=h.useState("empaque"),[R,S]=h.useState([]),[A,w]=h.useState([]),[k,O]=h.useState({}),[N,$]=h.useState([]),[D,B]=h.useState(!0),[ee,L]=h.useState(null),[f,q]=h.useState(null),[G,K]=h.useState({}),[te,W]=h.useState(!1),[y,ce]=h.useState(""),[z,re]=h.useState("ALL"),[je,oe]=h.useState(!1),[pe,Y]=h.useState(null),[se,xe]=h.useState(null),[V,ge]=P.useState("ALL"),[Q,ue]=P.useState("ALL"),[v,Z]=P.useState(null),[_e,We]=P.useState(""),[be,ae]=P.useState({}),[me,ne]=P.useState(""),[H,fe]=P.useState({});h.useEffect(()=>{const o=n=>{n.key==="Escape"&&(v?Z(null):te?W(!1):f&&q(null))};return window.addEventListener("keydown",o),()=>window.removeEventListener("keydown",o)},[v,te,f]);const M=h.useCallback(async(o=!0)=>{B(!0),L(null);try{let n=[];try{const{data:a}=await E.get("/web-retiros/locales");n=(a||[]).filter(t=>t.Estado===1||t.Estado===3).map(t=>({ordenDeRetiro:t.OrdIdRetiro,idcliente:t.NombreCliente||t.CodCliente||"Ecommerce",monto:t.Monto||0,moneda:t.Moneda||"UYU",pagorealizado:t.Estado===3||t.Estado===8?1:0,pagoHandy:!!t.ReferenciaPago,lugarRetiro:t.LugarRetiro||null,agenciaNombre:t.AgenciaNombre||null,direccionEnvio:t.DireccionEnvio||null,departamentoEnvio:t.DepartamentoEnvio||null,localidadEnvio:t.LocalidadEnvio||null,orders:t.BultosJSON?JSON.parse(t.BultosJSON):t.OrdenesCodigos?t.OrdenesCodigos.split(",").map(l=>({orderNumber:l.trim(),orderId:l.trim()})):[]}))}catch{}S(n);let d=[];try{d=(await E.get("/web-retiros/estantes")).data||[]}catch{}const i={},s={};d.forEach(a=>{if(a.OrdenRetiro){i[a.UbicacionID]||(i[a.UbicacionID]=[]);const t=a.OrdenesCodigos?a.OrdenesCodigos.split(",").map(l=>({orderNumber:l.trim(),orderId:l.trim()})):a.BultosJSON?JSON.parse(a.BultosJSON):[];i[a.UbicacionID].push({...a,orders:t})}s[a.EstanteID]||(s[a.EstanteID]={id:a.EstanteID,secciones:0,posiciones:0}),a.Seccion>s[a.EstanteID].secciones&&(s[a.EstanteID].secciones=a.Seccion),a.Posicion>s[a.EstanteID].posiciones&&(s[a.EstanteID].posiciones=a.Posicion)}),w(Object.values(s).sort((a,t)=>a.id.localeCompare(t.id))),O(i);try{const{data:a}=await E.get("/apiordenesRetiro/estados?estados=1,3,4,7,8,9"),t=new Set;Object.values(i).forEach(u=>u.forEach(b=>{b.OrdenRetiro&&t.add(b.OrdenRetiro)}));const l=new Set(n.map(u=>{const b=(u.ordenDeRetiro||"").match(/(\d+)$/);return b?parseInt(b[1],10):null}).filter(Boolean)),x=(Array.isArray(a)?a:[]).filter(u=>{if(t.has(u.ordenDeRetiro))return!1;const b=(u.ordenDeRetiro||"").match(/(\d+)$/),I=b?parseInt(b[1],10):null;return!(I&&l.has(I))});$(x)}catch{}o&&E.post("/web-retiros/sincronizar").then(()=>{E.get("/web-retiros/locales").then(a=>{const t=a.data.filter(l=>l.Estado===1||l.Estado===3).map(l=>({ordenDeRetiro:l.OrdIdRetiro,idcliente:l.NombreCliente||l.CodCliente||"Ecommerce",monto:l.Monto||0,moneda:l.Moneda||"UYU",pagorealizado:l.Estado===3||l.Estado===8?1:0,pagoHandy:!!l.ReferenciaPago,lugarRetiro:l.LugarRetiro||null,agenciaNombre:l.AgenciaNombre||null,direccionEnvio:l.DireccionEnvio||null,departamentoEnvio:l.DepartamentoEnvio||null,localidadEnvio:l.LocalidadEnvio||null,orders:l.BultosJSON?JSON.parse(l.BultosJSON):l.OrdenesCodigos?l.OrdenesCodigos.split(",").map(x=>({orderNumber:x.trim(),orderId:x.trim()})):[]}));S(t)})}).catch(a=>{})}catch{L("Problema al cargar la base de datos de retiros.")}finally{B(!1)}},[]);h.useEffect(()=>{M()},[M]);const he=o=>{if((o.ordenDeRetiro||"").startsWith("RT-")){le("FUERA DE ESTANTE",o);return}q(o),K({}),W(!1)},Ce=async(o,n,d)=>{if(!f)return;const i=`${o}-${n}-${d}`,s=f,a=k[i]||[];if(a.length>0){const t=a[0],l=String(t.CodigoCliente||"").trim().toLowerCase(),x=String(s.idcliente||"").trim().toLowerCase();if(l!==x&&l!=="ecommerce"){L("No puedes guardar órdenes de diferentes clientes en el mismo casillero.");return}}O(t=>{const l=t[i]||[];return{...t,[i]:[...l,{OrdenRetiro:s.ordenDeRetiro,CodigoCliente:s.idcliente,ClientName:s.clienteNombre||s.ClientName||s.idcliente}]}}),S(t=>t.filter(l=>l.ordenDeRetiro!==s.ordenDeRetiro)),$(t=>t.filter(l=>l.ordenDeRetiro!==s.ordenDeRetiro)),q(null),K({}),W(!1);try{const t=[];s.orders?.forEach(x=>{G[x.orderNumber]&&t.push(x.orderNumber)});const l={estanteId:o,seccion:n,posicion:d,ordenRetiro:s.ordenDeRetiro,codigoCliente:s.idcliente,bultos:s.orders,pagado:s.pagorealizado===1,scannedValues:t};await E.post("/web-retiros/estantes/asignar",l)}catch(t){L(t.response?.data?.error||t.message||"Error al asignar"),M(!1)}},le=async(o,n)=>{const d=Array.isArray(n)?n:[n];let i=[];try{const{data:t}=await E.get("/apiordenesRetiro/estados?estados=1,2,3,4,7,8,9");i=Array.isArray(t)?t:[]}catch{}const s=d.map(t=>{const l=t.OrdenRetiro||t.ordenDeRetiro,u=i.find(b=>b.ordenDeRetiro===l)||R.find(b=>b.ordenDeRetiro===l)||N.find(b=>b.ordenDeRetiro===l);return{...t,orders:t.orders?.length?t.orders:u?.orders||[],pagorealizado:t.Pagado?1:u?.pagorealizado??t.pagorealizado??0,TClDescripcion:u?.TClDescripcion||t.TClDescripcion||"",estado:u?.estado||t.estado||""}});for(const t of s){const l=t.OrdenRetiro||t.ordenDeRetiro,x=i.find(r=>r.ordenDeRetiro===l)||R.find(r=>r.ordenDeRetiro===l)||N.find(r=>r.ordenDeRetiro===l),u=x?.pagorealizado===1||t.Pagado,b=(typeof x?.estado=="string"?x.estado:"").toLowerCase(),I=x?.estadoNumerico===9||b==="autorizado"||t.estadoNumerico===9;if(!u&&!I){de.fire({toast:!0,position:"top",icon:"warning",title:`${l} no está pagada ni autorizada. Debe pasar por Caja.`,showConfirmButton:!1,timer:4e3});return}}Z({id:o,dataList:s}),ae({}),ne("");const a={};s.forEach(t=>a[t.OrdenRetiro||t.ordenDeRetiro]=!0),fe(a)},Re=async()=>{if(!v)return;const{id:o,dataList:n}=v;let d=[];if(o==="FUERA DE ESTANTE"?d=[n[0].ordenDeRetiro||n[0].OrdenRetiro]:d=n.map(i=>i.OrdenRetiro||i.ordenDeRetiro).filter(i=>H[i]),d.length!==0){O(i=>{const s={...i};if(s[o]){const a=s[o].filter(t=>!d.includes(t.OrdenRetiro||t.ordenDeRetiro));a.length===0?delete s[o]:s[o]=a}return s}),Z(null);try{await E.post("/web-retiros/estantes/liberar-multiple",{ubicacionId:o,ordenesParaEntregar:d})}catch(i){L(i.response?.data?.error||i.message||"Error al liberar el estante"),M(!1)}}},De=async(o,n)=>{const d=Array.isArray(n)?n:[n];let i=[];try{const{data:a}=await E.get("/apiordenesRetiro/estados?estados=1,2,3,4,7,8,9");i=Array.isArray(a)?a:[]}catch{}for(const a of d){const t=a.OrdenRetiro||a.ordenDeRetiro,l=i.find(b=>b.ordenDeRetiro===t)||R.find(b=>b.ordenDeRetiro===t),x=l?.pagorealizado===1||a.Pagado,u=l?.estadoNumerico===9||(l?.estado||"").toLowerCase()==="autorizado"||a.estadoNumerico===9;if(!x&&!u){de.fire({toast:!0,position:"top-end",icon:"warning",title:`${t} no está pagada ni autorizada. Debe pasar por Caja.`,showConfirmButton:!1,timer:4e3,showClass:{popup:"animate-[slideInRight_0.3s_ease-out]"},hideClass:{popup:"animate-[slideOutRight_0.3s_ease-in]"}});return}}const s=d.map(a=>a.OrdenRetiro||a.ordenDeRetiro);O(a=>{const t={...a};if(t[o]){const l=t[o].filter(x=>!s.includes(x.OrdenRetiro||x.ordenDeRetiro));l.length===0?delete t[o]:t[o]=l}return t});try{await E.post("/web-retiros/estantes/liberar-multiple",{ubicacionId:o,ordenesParaEntregar:s}),de.fire({toast:!0,position:"top-end",icon:"success",title:"Entregado correctamente.",showConfirmButton:!1,timer:2500,showClass:{popup:"animate-[slideInRight_0.3s_ease-out]"},hideClass:{popup:"animate-[slideOutRight_0.3s_ease-in]"}})}catch(a){L(a.response?.data?.error||a.message||"Error al entregar"),M(!1)}},Ee=async(o,n)=>{if(!(!o||!n)){O(d=>{const i={...d};if(i[n]){const s=i[n].filter(a=>(a.OrdenRetiro||a.ordenDeRetiro)!==o);s.length===0?delete i[n]:i[n]=s}return i});try{await E.delete("/web-retiros/estantes/desasignar",{data:{ubicacionId:n,ordenRetiro:o}})}catch(d){L(d.response?.data?.error||d.message||"Error al desasignar del estante"),M(!1)}}},Ae=async o=>{if(!se||!o)return;const n=se.ubicacionId,d=se.OrdenRetiro;if(n!==o){O(i=>{const s={...i},a=(s[n]||[]).filter(l=>(l.OrdenRetiro||l.ordenDeRetiro)!==d),t=(i[n]||[]).find(l=>(l.OrdenRetiro||l.ordenDeRetiro)===d);return a.length===0?delete s[n]:s[n]=a,t&&(s[o]=[...s[o]||[],t]),s}),xe(null),oe(!1),Y(null);try{const i=o.split("-"),s=i[0],a=parseInt(i[1]),t=parseInt(i[2]);await E.post("/web-retiros/estantes/mover",{ordenRetiro:d,destEstanteId:s,destSeccion:a,destPosicion:t})}catch(i){L(i.response?.data?.error||i.message||"Error al mover"),M(!1)}}};h.useEffect(()=>{if(!y||y.length<2)return;const o=y.toLowerCase();for(const n in k){const d=k[n];if(!Array.isArray(d)||d.length===0)continue;if(d.some(s=>s.OrdenRetiro&&s.OrdenRetiro.toLowerCase().includes(o)||s.ClientName&&s.ClientName.toLowerCase().includes(o)||s.CodigoCliente&&String(s.CodigoCliente).toLowerCase().includes(o)||Array.isArray(s.orders)&&s.orders.some(a=>a.orderNumber&&a.orderNumber.toLowerCase().includes(o)))){const s=document.getElementById(`box-${n}`);s&&(s.scrollIntoView({behavior:"smooth",block:"center"}),s.classList.add("ring-4","ring-yellow-400","ring-offset-2","scale-110","z-50"),setTimeout(()=>{s.classList.remove("ring-4","ring-yellow-400","ring-offset-2","scale-110","z-50")},2500));break}}},[y,k]);const ke=()=>{const[o,n]=h.useState(""),d=P.useRef(null),i=t=>K(l=>({...l,[t]:!l[t]})),s=f.orders?.every(t=>G[t.orderNumber]),a=t=>{t.preventDefault();const l=o.trim().toUpperCase();if(!l)return;const x=f.orders?.find(u=>u.orderNumber.toUpperCase()===l);x&&K(u=>({...u,[x.orderNumber]:!0})),n("")};return e.jsx("div",{className:"fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4",children:e.jsxs("div",{className:"bg-white rounded-3xl shadow-2xl p-8 w-full max-w-4xl animate-in fade-in zoom-in-95 duration-200",children:[e.jsxs("div",{className:"flex items-start justify-between mb-4",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-[10px] font-bold text-blue-500 tracking-wider uppercase",children:"Detalle Envio Web"}),e.jsx("h2",{className:"text-3xl font-black text-slate-800 mt-0.5",children:f.pagoHandy?f.ordenDeRetiro.replace("R-","PW-"):f.ordenDeRetiro}),e.jsx("p",{className:"text-slate-400 font-medium uppercase text-sm mt-0.5",children:f.idcliente})]}),e.jsx("button",{onClick:()=>q(null),className:"p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors",children:e.jsx(Fe,{size:20})})]}),e.jsxs("form",{onSubmit:a,className:"mb-4 relative",children:[e.jsx("div",{className:"absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none",children:e.jsx(X,{className:"h-5 w-5 text-blue-400"})}),e.jsx("input",{ref:d,type:"text",value:o,onChange:t=>n(t.target.value),className:"block w-full pl-12 pr-16 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white text-base font-bold transition-all text-slate-700",placeholder:"Escanee el bulto aquí...",autoFocus:!0}),e.jsx("button",{type:"submit",className:"absolute inset-y-1.5 right-1.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700",children:"OK"})]}),e.jsxs("div",{className:"bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6",children:[e.jsx("p",{className:"text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3",children:"Checklist de Bultos"}),e.jsx("div",{className:"grid grid-cols-3 gap-2 max-h-64 overflow-y-auto",children:f.orders?.map(t=>e.jsxs("div",{onClick:()=>i(t.orderNumber),className:`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${G[t.orderNumber]?"bg-green-50 border-green-500 shadow-sm":"bg-white border-slate-200 hover:border-slate-300"}`,children:[e.jsx("div",{className:`p-2 rounded-lg shrink-0 ${G[t.orderNumber]?"bg-green-500 text-white":"bg-slate-100 text-slate-400"}`,children:e.jsx(_,{size:16})}),e.jsx("div",{className:"flex-1 min-w-0",children:e.jsx("div",{className:"text-sm font-black text-slate-800 truncate",children:t.orderNumber})}),G[t.orderNumber]?e.jsx(ye,{className:"text-green-500 shrink-0",size:18}):e.jsx("div",{className:"w-4 h-4 rounded-full border-2 border-slate-300 shrink-0"})]},t.orderNumber))})]}),e.jsxs("div",{className:"flex gap-4",children:[e.jsx("button",{onClick:()=>q(null),className:"flex-[0.8] py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors",children:"Cancelar"}),e.jsx("button",{disabled:!s,onClick:()=>W(!0),className:"flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all",children:"Asignar a Estante"})]})]})})},Oe=()=>e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8",onClick:()=>W(!1),children:e.jsxs("div",{className:"bg-white rounded-3xl shadow-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95",onClick:o=>o.stopPropagation(),children:[e.jsxs("div",{className:"flex items-center justify-between mb-8",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl font-black text-slate-800",children:"Mapa del Depósito"}),e.jsxs("p",{className:"text-slate-500 font-medium text-sm mt-1",children:["Haga click en un casillero vacío para ubicar la orden ",e.jsx("strong",{className:"text-blue-600",children:f.pagoHandy?f.ordenDeRetiro.replace("R-","PW-"):f.ordenDeRetiro})]})]}),e.jsx("button",{onClick:()=>W(!1),className:"px-6 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-500 shadow-sm hover:bg-slate-50 text-sm",children:"Atrás"})]}),e.jsx("div",{className:"grid lg:grid-cols-3 gap-4",children:A.map(o=>e.jsxs("div",{className:"bg-white p-4 rounded-2xl border border-slate-200 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx("div",{className:"w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white font-black text-base",children:o.id}),e.jsxs("span",{className:"text-sm font-bold text-slate-700",children:["Estante ",o.id]})]}),e.jsx("div",{className:"space-y-1.5",children:[...Array(o.secciones)].map((n,d)=>e.jsxs("div",{className:"flex gap-1.5 items-center",children:[e.jsxs("div",{className:"w-8 bg-slate-50 rounded-md flex flex-col items-center justify-center border border-slate-200 py-1 shrink-0",children:[e.jsx("span",{className:"text-[8px] font-bold text-slate-400 uppercase",children:"S"}),e.jsx("span",{className:"text-xs font-black text-slate-700",children:d+1})]}),e.jsx("div",{className:"grid grid-cols-5 flex-1 gap-1",children:[...Array(o.posiciones)].map((i,s)=>{const a=`${o.id}-${d+1}-${s+1}`,t=k[a]||[],l=t.length>0;let x=!0;if(l&&f){const u=String(t[0].CodigoCliente||"").trim().toLowerCase(),b=String(f.idcliente||"").trim().toLowerCase();u!==b&&u!=="ecommerce"&&(x=!1)}return e.jsxs("button",{title:l&&t[0]?.OrdenRetiro||a,onClick:()=>{if(!x){L("No puedes guardar órdenes de diferentes clientes en el mismo casillero.");return}Ce(o.id,d+1,s+1)},className:`relative h-10 rounded-lg border-2 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${l?x?"bg-indigo-600 border-indigo-700 hover:bg-indigo-500":"bg-rose-950 border-rose-800 opacity-60 cursor-not-allowed":"bg-white border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50"}`,children:[l?e.jsx("span",{className:"text-[8px] font-black text-white leading-tight px-0.5 truncate w-full text-center",children:t[0]?.OrdenRetiro?.split("-")[1]||"?"}):e.jsx("span",{className:"text-[8px] text-slate-300",children:s+1}),t.length>1&&e.jsx("div",{className:"absolute top-0 right-0 bg-rose-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center",children:t.length})]},s)})})]},d))})]},o.id))})]})});return e.jsxs("div",{className:"p-6 h-full overflow-y-auto",children:[e.jsxs("div",{className:"bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden",children:[e.jsxs("div",{className:"flex items-center gap-3 px-4 py-3",children:[e.jsx("div",{className:"w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0",children:e.jsx(Le,{size:16})}),e.jsx("span",{className:"text-sm font-black text-slate-800 tracking-tight shrink-0",children:"Logística eCommerce"}),c==="empaque"&&!f&&e.jsxs("div",{className:"relative w-56 shrink-0",children:[e.jsx(X,{className:"absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400",size:13}),e.jsx("input",{type:"text",placeholder:"Buscar orden o cliente...",className:"w-full pl-7 pr-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus:border-blue-400 focus:bg-white outline-none text-xs font-medium transition-all",value:y,onChange:o=>ce(o.target.value)})]}),e.jsx("div",{className:"flex-1"}),e.jsxs("div",{className:"flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0",children:[e.jsxs("button",{onClick:()=>J("empaque"),className:`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${c==="empaque"?"bg-white text-blue-600 shadow-sm":"text-slate-500 hover:bg-slate-200"}`,children:[e.jsx(ve,{size:14})," Empaque"]}),e.jsxs("button",{onClick:()=>J("entrega"),className:`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${c==="entrega"?"bg-white text-blue-600 shadow-sm":"text-slate-500 hover:bg-slate-200"}`,children:[e.jsx(Se,{size:14})," Entregas"]})]})]}),c==="empaque"&&!f&&(()=>{const o=[{key:"PAGADO",label:"Pagados",dot:"bg-emerald-500",active:"bg-emerald-500"},{key:"ROLLO",label:"Rollo",dot:"bg-amber-500",active:"bg-amber-500"},{key:"SEMANAL",label:"Semanales",dot:"bg-indigo-500",active:"bg-indigo-500"},{key:"AUTORIZADO",label:"Autorizados",dot:"bg-orange-500",active:"bg-orange-500"},{key:"PENDIENTE",label:"Pendientes",dot:"bg-rose-500",active:"bg-rose-500"}],n=Array.from(new Set([...R,...N].map(d=>d.lugarRetiro).filter(Boolean))).sort();return e.jsxs("div",{className:"px-4 pb-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2",children:[e.jsx("button",{onClick:()=>ge("ALL"),className:`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${V==="ALL"?"bg-slate-800 text-white border-slate-800":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`,children:"Todos"}),o.map(d=>e.jsxs("button",{onClick:()=>ge(d.key),className:`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${V===d.key?`${d.active} text-white border-transparent`:"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`,children:[e.jsx("div",{className:`w-1.5 h-1.5 rounded-full ${V===d.key?"bg-white":d.dot}`}),d.label]},d.key)),n.length>0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"w-px h-4 bg-slate-200 mx-1"}),e.jsx("button",{onClick:()=>ue("ALL"),className:`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${Q==="ALL"?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`,children:"Todos los locales"}),n.map((d,i)=>e.jsx("button",{onClick:()=>ue(d),className:`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${Q===d?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`,children:d},i))]})]})})()]}),D&&!f&&R.length===0&&e.jsxs("div",{className:"flex flex-col items-center justify-center py-20",children:[e.jsx($e,{className:"animate-spin text-blue-600 mb-4",size:40}),e.jsx("p",{className:"text-slate-500 font-medium",children:"Sincronizando con Servidor Web..."})]}),!D||R.length>0||N.length>0?c==="empaque"?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"animate-in fade-in duration-300",children:(()=>{const o=[{label:"Pagados",color:"text-emerald-600",dot:"bg-emerald-500",badge:"bg-emerald-50 border-emerald-200 text-emerald-700"},{label:"Rollo por Adelantado",color:"text-amber-600",dot:"bg-amber-500",badge:"bg-amber-50 border-amber-200 text-amber-700"},{label:"Semanales",color:"text-indigo-600",dot:"bg-indigo-500",badge:"bg-indigo-50 border-indigo-200 text-indigo-700"},{label:"Autorizados",color:"text-orange-600",dot:"bg-orange-500",badge:"bg-orange-50 border-orange-200 text-orange-700"},{label:"Pendientes de Pago",color:"text-rose-600",dot:"bg-rose-500",badge:"bg-rose-50 border-rose-200 text-rose-700"}],n=r=>{if(r.pagorealizado===1||r.pagorealizado===!0)return 0;const g=(r.TClDescripcion||"").toLowerCase();return g.includes("rollo")?1:g.includes("semanal")?2:r.estadoNumerico===9||r.OReEstadoActual===9?3:4},d=r=>{const g=n(r);return["PAGADO","ROLLO","SEMANAL","AUTORIZADO","PENDIENTE"][g]},i=R.map(r=>({_key:`web-${r.ordenDeRetiro}`,ordenDeRetiro:r.ordenDeRetiro,idcliente:r.idcliente,displayLabel:r.pagoHandy?r.ordenDeRetiro.replace("R-","PW-"):r.ordenDeRetiro,pagorealizado:r.pagorealizado,TClDescripcion:r.TClDescripcion||"",fechaAlta:r.fechaAlta||r.FechaAlta||null,lugarRetiro:r.lugarRetiro||"Web",agenciaNombre:r.agenciaNombre||null,direccionEnvio:r.direccionEnvio||null,departamentoEnvio:r.departamentoEnvio||null,localidadEnvio:r.localidadEnvio||null,totalCost:r.monto?`${r.moneda} ${Number(r.monto).toFixed(2)}`:"-",orders:r.orders,pagoHandy:r.pagoHandy,_isWeb:!0,_raw:r})),s=N.map(r=>({_key:`local-${r.ordenDeRetiro}`,ordenDeRetiro:r.ordenDeRetiro,idcliente:r.CliCodigoCliente,displayLabel:r.ordenDeRetiro,pagorealizado:r.pagorealizado,estadoNumerico:r.OReEstadoActual,OReEstadoActual:r.OReEstadoActual,TClDescripcion:r.TClDescripcion||"",fechaAlta:r.fechaAlta||r.FechaAlta||null,lugarRetiro:r.lugarRetiro||"-",agenciaNombre:r.agenciaNombre||null,direccionEnvio:r.direccionEnvio||null,departamentoEnvio:r.departamentoEnvio||null,localidadEnvio:r.localidadEnvio||null,totalCost:r.totalCost&&r.totalCost!=="NaN"?r.totalCost:r.montopagorealizado||"-",orders:(r.orders||[]).map(g=>({orderNumber:g.orderNumber||g.codigoOrden,orderId:g.orderId})),pagoHandy:!1,_isWeb:!1,_raw:r})),a=new Set,t=[];for(const r of[...i,...s])a.has(r.ordenDeRetiro)||(a.add(r.ordenDeRetiro),t.push(r));const l=t.filter(r=>{if(V!=="ALL"&&d(r)!==V||Q!=="ALL"&&r.lugarRetiro!==Q)return!1;if(y){const g=y.toLowerCase(),T=r.ordenDeRetiro&&r.ordenDeRetiro.toLowerCase().includes(g),j=r.idcliente&&String(r.idcliente).toLowerCase().includes(g),p=Array.isArray(r.orders)&&r.orders.some(m=>m.orderNumber&&m.orderNumber.toLowerCase().includes(g));if(!T&&!j&&!p)return!1}return!0}).sort((r,g)=>{const T=n(r),j=n(g);if(T!==j)return T-j;const p=r.fechaAlta?new Date(r.fechaAlta).getTime():1/0,m=g.fechaAlta?new Date(g.fechaAlta).getTime():1/0;return p-m});if(i.length===0&&s.length===0)return e.jsxs("div",{className:"py-16 flex flex-col items-center gap-3 text-slate-400",children:[e.jsx(_,{size:48,strokeWidth:1.5,className:"opacity-40"}),e.jsx("p",{className:"font-semibold",children:"No hay retiros en espera."})]});if(l.length===0)return e.jsx("div",{className:"py-8 flex flex-col items-center gap-2 text-slate-400",children:e.jsx("p",{className:"font-semibold text-sm",children:"No hay retiros con los filtros seleccionados."})});const x=[{prefix:"RT",color:"text-teal-700",dot:"bg-teal-500",badge:"bg-teal-50 border-teal-200 text-teal-700"},{prefix:"RW",color:"text-violet-700",dot:"bg-violet-500",badge:"bg-violet-50 border-violet-200 text-violet-700"},{prefix:"RL",color:"text-amber-700",dot:"bg-amber-500",badge:"bg-amber-50 border-amber-200 text-amber-700"}],u=r=>{const g=(r.ordenDeRetiro||"").match(/^([A-Z]+)/i);return g?g[1].toUpperCase():"OTRO"},b=x,I=(r,g)=>{const T=()=>{r._isWeb?he(r._raw):he({ordenDeRetiro:r.ordenDeRetiro,idcliente:r.idcliente,clienteNombre:r._raw.TClNombre||r.idcliente,monto:parseFloat(r._raw.totalCost)||0,moneda:"UYU",pagorealizado:r.pagorealizado,TClDescripcion:r.TClDescripcion,orders:r.orders})},p=(F=>{if(!F)return null;const U=Math.floor((Date.now()-new Date(F).getTime())/1e3);return U<60?`${U}s`:U<3600?`${Math.floor(U/60)}m`:U<86400?`${Math.floor(U/3600)}h ${Math.floor(U%3600/60)}m`:`${Math.floor(U/86400)}d`})(r.fechaAlta),m=(r.orders||[]).length,ie=(r.fechaAlta?Math.floor((Date.now()-new Date(r.fechaAlta).getTime())/6e4):0)>480?"text-rose-600 font-black":"text-slate-700 font-bold";return e.jsxs("button",{onClick:T,className:"group relative bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 flex flex-col gap-2 overflow-hidden w-full",children:[e.jsx("div",{className:`absolute top-0 left-0 right-0 h-1 ${g.dot} rounded-t-2xl`}),e.jsxs("div",{className:"absolute top-2 right-2 flex items-center gap-1 z-10",children:[e.jsx("div",{role:"button",tabIndex:0,onClick:F=>{F.stopPropagation(),Me(r)},title:"Imprimir etiqueta",className:"w-8 h-8 rounded-lg flex items-center justify-center text-custom-dark hover:text-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer",children:e.jsx(Ue,{size:16})}),e.jsx("div",{role:"button",tabIndex:0,onClick:F=>{F.stopPropagation(),Be(r)},title:"Imprimir hoja de despacho",className:"w-8 h-8 rounded-lg flex items-center justify-center text-custom-dark hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer",children:e.jsx(Ie,{size:16})}),/^RT-/i.test(r.ordenDeRetiro)&&e.jsx("div",{role:"button",tabIndex:0,onClick:F=>{F.stopPropagation(),le("FUERA DE ESTANTE",[{OrdenRetiro:r.ordenDeRetiro,ordenDeRetiro:r.ordenDeRetiro,orders:r.orders||[],pagorealizado:r.pagorealizado,Pagado:r.pagorealizado===1,TClDescripcion:r.TClDescripcion||""}])},title:"Entregar esta orden RT",className:"w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-sm",children:e.jsx(ve,{size:14})})]}),e.jsx("div",{className:"font-black text-slate-800 text-sm tracking-tight leading-tight mt-1",children:r.displayLabel}),r.CliNombre&&e.jsx("div",{className:"text-[11px] font-semibold text-slate-600 truncate",children:r.CliNombre}),e.jsxs("div",{className:"flex flex-wrap items-center gap-1 mt-0.5",children:[e.jsx("span",{className:"text-[9px] font-bold text-slate-400 uppercase",children:r.idcliente}),r.TClDescripcion&&e.jsx("span",{className:"text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-bold",children:r.TClDescripcion})]}),r.lugarRetiro&&r.lugarRetiro!=="Desconocido"&&e.jsx("div",{className:"text-[10px] font-bold text-blue-500 truncate",children:r.agenciaNombre?r.lugarRetiro.replace(/\s*\(.*\)\s*$/g,"")+` (${r.agenciaNombre})`:r.lugarRetiro}),e.jsxs("div",{className:"flex items-center justify-between mt-auto",children:[p&&e.jsxs("span",{className:`flex items-center gap-0.5 text-xs ${ie}`,children:[e.jsx(we,{size:10})," ",p]}),m>0&&e.jsxs("span",{className:"flex items-center gap-0.5 text-[10px] font-bold text-slate-400 ml-auto",children:[e.jsx(_,{size:9})," ",m]})]})]},r._key)};return e.jsx("div",{className:"grid grid-cols-3 gap-5",children:b.map(r=>{const g=l.filter(p=>u(p)===r.prefix),T=[0,1,2,3,4].map(p=>({priority:p,meta:o[p],items:g.filter(m=>n(m)===p)})).filter(p=>p.items.length>0),j=g.length===0;return e.jsxs("div",{className:"flex flex-col gap-3 min-w-0",children:[e.jsxs("div",{className:`flex items-center gap-2 px-3 py-2 rounded-xl border ${r.badge} sticky top-0 z-10`,children:[e.jsx("div",{className:`w-2 h-2 rounded-full ${j?"bg-slate-300":r.dot}`}),e.jsx("span",{className:`text-xs font-black uppercase tracking-widest ${j?"text-slate-400":r.color}`,children:r.prefix}),e.jsx("span",{className:`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full text-white ${j?"bg-slate-300":r.dot}`,children:g.length})]}),e.jsx("div",{className:"flex flex-col gap-4",children:j?e.jsxs("div",{className:"flex flex-col items-center justify-center py-10 gap-2 text-slate-300",children:[e.jsx(_,{size:32,strokeWidth:1.5}),e.jsx("span",{className:"text-[11px] font-bold uppercase tracking-widest",children:"Sin órdenes"})]}):T.map(({priority:p,meta:m,items:C})=>e.jsxs("div",{children:[T.length>1&&e.jsxs("div",{className:"flex items-center gap-1.5 mb-2",children:[e.jsx("div",{className:`w-1.5 h-1.5 rounded-full ${m.dot}`}),e.jsx("span",{className:`text-[9px] font-black uppercase tracking-widest ${m.color}`,children:m.label})]}),e.jsx("div",{className:"flex flex-col gap-2",children:C.map(ie=>I(ie,m))})]},p))})]},r.prefix)})})})()}),f&&(te?e.jsx(Oe,{}):e.jsx(ke,{}))]}):e.jsx("div",{className:"animate-in fade-in duration-300",children:e.jsxs("div",{className:"mt-4",children:[e.jsxs("div",{className:"flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-3 rounded-3xl border border-slate-100 shadow-sm",children:[e.jsxs("div",{className:"relative w-full md:w-96 flex-shrink-0",children:[e.jsx(X,{className:"absolute left-4 top-1/2 -translate-y-1/2 text-slate-400",size:18}),e.jsx("input",{type:"text",placeholder:"Buscar por orden o cliente...",className:"w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all",value:y,onChange:o=>ce(o.target.value)})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsx("button",{onClick:()=>re("ALL"),className:`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${z==="ALL"?"bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200":"bg-transparent text-slate-500 border-transparent hover:bg-slate-50"}`,children:"Ver Todo"}),e.jsx("button",{onClick:()=>re("FUERA"),className:`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${z==="FUERA"?"bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200":"bg-transparent text-slate-500 border-transparent hover:bg-slate-50"}`,children:"Fuera de Estante"}),A.map(o=>e.jsxs("button",{onClick:()=>re(o.id),className:`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${z===o.id?"bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200":"bg-transparent text-slate-500 border-transparent hover:bg-slate-50"}`,children:["Estante ",o.id]},o.id))]})]}),z!=="FUERA"&&e.jsx("div",{className:"grid gap-4",children:A.filter(o=>z==="ALL"||z===o.id).map(o=>e.jsxs("div",{className:"bg-white p-4 rounded-2xl border border-slate-100 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-3 mb-4",children:[e.jsx("div",{className:"w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-base italic shadow-md shadow-blue-200",children:o.id}),e.jsxs("span",{className:"text-base font-black text-slate-800 uppercase italic tracking-tighter",children:["Bloque ",o.id]})]}),e.jsx("div",{className:"space-y-1.5",children:[...Array(o.secciones)].map((n,d)=>e.jsxs("div",{className:"flex gap-2 items-center",children:[e.jsxs("div",{className:"w-10 h-10 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 shrink-0",children:[e.jsx("span",{className:"text-[9px] font-black text-slate-400 uppercase",children:"Sec"}),e.jsx("span",{className:"text-sm font-black text-blue-600",children:d+1})]}),e.jsx("div",{className:"grid grid-cols-5 flex-1 gap-3",children:[...Array(o.posiciones)].map((i,s)=>{const a=`${o.id}-${d+1}-${s+1}`,t=k[a]||[],l=t.length>0,x=t[0],u=y.toLowerCase(),b=l&&t.some(p=>{if(p.OrdenRetiro&&p.OrdenRetiro.toLowerCase().includes(u)||p.CodigoCliente&&String(p.CodigoCliente).toLowerCase().includes(u)||p.ClientName&&p.ClientName.toLowerCase().includes(u))return!0;const m=R.find(C=>C.ordenDeRetiro===p.OrdenRetiro)||N.find(C=>C.ordenDeRetiro===p.OrdenRetiro);return m&&Array.isArray(m.orders)?m.orders.some(C=>C.orderNumber&&C.orderNumber.toLowerCase().includes(u)):!1}),I=y&&l&&!b,r=y&&l&&b,g=x?R.find(p=>p.ordenDeRetiro===x.OrdenRetiro)||N.find(p=>p.ordenDeRetiro===x.OrdenRetiro):null,j=(()=>{if(!l)return{bg:"",border:""};if(r)return{bg:"bg-green-600",border:"border-green-500",subText:"text-green-100",hover:"bg-green-900/85"};const p=g?.pagorealizado===1||g?.pagorealizado===!0||x?.Pagado===!0,m=g?.estadoNumerico===9||g?.OReEstadoActual===9||x?.Autorizado===!0,C=(g?.TClDescripcion||x?.TClDescripcion||"").toLowerCase();return p||C.includes("rollo")?{bg:"bg-emerald-600",border:"border-emerald-700",subText:"text-emerald-200",hover:"bg-emerald-900/85"}:m?{bg:"bg-amber-500",border:"border-amber-600",subText:"text-amber-100",hover:"bg-amber-900/85"}:C.includes("semanal")?{bg:"bg-indigo-600",border:"border-indigo-700",subText:"text-indigo-200",hover:"bg-indigo-900/85"}:{bg:"bg-rose-600",border:"border-rose-700",subText:"text-rose-200",hover:"bg-rose-900/85"}})();return e.jsx(Ne.div,{id:`box-${a}`,initial:l?{opacity:0,scale:.85}:!1,animate:{opacity:1,scale:1},whileHover:{scale:1.08},transition:{duration:.2},draggable:l,onDragStart:l?p=>{oe(!0),xe({...t[0],ubicacionId:a}),p.dataTransfer.effectAllowed="move"}:void 0,onDragEnd:()=>{oe(!1),Y(null)},onDragOver:p=>{p.preventDefault(),p.stopPropagation(),Y(a)},onDragLeave:p=>{p.preventDefault(),Y(m=>m===a?null:m)},onDrop:p=>{p.preventDefault(),p.stopPropagation(),Ae(a),Y(null)},className:`h-14 rounded-xl border-2 transition-colors flex flex-col items-center justify-center gap-0.5 relative group overflow-hidden cursor-pointer
                                        ${l?`${j.bg} ${j.border} shadow-sm`:"bg-white border-dashed border-slate-200"}
                                        ${I?"opacity-20 grayscale":""}
                                        ${r?"ring-4 ring-green-400 scale-[1.02]":""}
                                        ${pe===a&&!l?"border-blue-400 bg-blue-50 scale-105":""}
                                        ${pe===a&&l?"ring-2 ring-blue-400":""}
                                      `,onDoubleClick:()=>{l&&De(a,t)},children:l?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:`text-[7px] font-bold absolute top-0.5 left-1 select-none pointer-events-none ${r?"text-green-100":j.subText||"text-indigo-300"}`,children:a}),t.length>1&&e.jsx("div",{className:"absolute top-0.5 right-1 bg-rose-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center z-20 pointer-events-none",children:t.length}),e.jsx("button",{draggable:!1,onClick:p=>{p.stopPropagation(),Ee(t[0]?.OrdenRetiro,a)},className:`absolute top-0 right-0 w-6 h-6 flex items-center justify-center text-zinc-100 hover:scale-125 z-30 opacity-0 group-hover:opacity-100 transition-all ${je?"pointer-events-none":""}`,children:e.jsx(ze,{size:14,strokeWidth:2.5})}),e.jsx("div",{className:"flex flex-col items-center justify-center gap-0 w-full overflow-hidden px-1 select-none pointer-events-none flex-1",children:t.slice(0,2).map((p,m)=>{const C=t.length===1&&Array.isArray(p.orders)&&p.orders.length===1?p.orders[0].orderNumber:null;return e.jsxs(P.Fragment,{children:[e.jsx("span",{className:"text-[11px] font-black text-white truncate leading-tight text-center w-full",children:p.PagoHandy?p.OrdenRetiro.replace("R-","PW-"):p.OrdenRetiro}),C&&e.jsx("span",{className:`text-[11px] font-black truncate leading-tight text-center w-full ${j.subText||"text-indigo-200"}`,children:C})]},m)})})]}):e.jsxs(e.Fragment,{children:[e.jsxs("span",{className:"text-[9px] font-black text-slate-300",children:["P",s+1]}),e.jsx("div",{className:"w-1 h-1 rounded-full bg-slate-200"})]})},`${s}-${t.map(p=>p.OrdenRetiro).join(",")}`)})})]},d))})]},o.id))}),(z==="ALL"||z==="FUERA")&&N.length>0&&e.jsxs("div",{className:z==="ALL"?"mt-10 pt-8 border-t-2 border-slate-100":"",children:[e.jsxs("div",{className:"flex items-center gap-3 mb-5",children:[e.jsx("h3",{className:"text-lg font-black text-slate-800",children:"Retiros fuera de estante"}),e.jsx("span",{className:"px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold",children:N.filter(o=>{if(!y)return!0;const n=y.toLowerCase();return(o.ordenDeRetiro||"").toLowerCase().includes(n)||(o.CliCodigoCliente||"").toLowerCase().includes(n)}).length})]}),e.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3",children:e.jsx(Te,{children:N.filter(o=>{if(!y)return!0;const n=y.toLowerCase();return(o.ordenDeRetiro||"").toLowerCase().includes(n)||(o.CliCodigoCliente||"").toLowerCase().includes(n)}).sort((o,n)=>{const d=i=>i.pagorealizado===1||i.pagorealizado===!0?0:(i.TClDescripcion||"").toLowerCase().includes("rollo")?1:(i.TClDescripcion||"").toLowerCase().includes("semanal")?2:3;return d(o)!==d(n)?d(o)-d(n):new Date(o.fechaAlta||0)-new Date(n.fechaAlta||0)}).map(o=>{const n=o.pagorealizado===1||o.pagorealizado===!0,d=(o.TClDescripcion||"").toLowerCase(),i=n?"bg-emerald-500":d.includes("rollo")?"bg-amber-500":d.includes("semanal")?"bg-indigo-500":"bg-rose-500",s=o.fechaAlta?Math.floor((Date.now()-new Date(o.fechaAlta).getTime())/6e4):0,a=Math.floor(s/1440),t=Math.floor(s%1440/60),l=s%60,x=a>0?`${a}d`:t>0?`${t}h ${l}m`:`${l}m`;return e.jsxs(Ne.div,{layout:!0,initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.85,y:10},transition:{duration:.25},className:"relative bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2 overflow-hidden",children:[e.jsx("div",{className:`absolute top-0 left-0 right-0 h-1 ${i} rounded-t-2xl`}),e.jsx("div",{className:"font-black text-slate-800 text-sm tracking-tight mt-1",children:o.ordenDeRetiro}),e.jsx("div",{className:"text-[10px] font-bold text-slate-400 uppercase truncate",children:o.CliCodigoCliente||o.CliNombre}),e.jsx("div",{className:`text-xs font-black ${n?"text-emerald-600":"text-rose-500"}`,children:n?"Pagado ✓":"Pend. Pago"}),e.jsxs("div",{className:"flex items-center justify-between mt-auto",children:[e.jsxs("span",{className:"flex items-center gap-0.5 text-[10px] font-bold text-slate-700",children:[e.jsx(we,{size:9})," ",x]}),e.jsxs("span",{className:"flex items-center gap-0.5 text-[10px] font-bold text-slate-400",children:[e.jsx(_,{size:9})," ",(o.orders||[]).length]})]}),e.jsx("button",{onClick:()=>le("FUERA DE ESTANTE",o),className:"mt-1 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl transition-colors",children:"Entregar"})]},o.ordenDeRetiro)})})})]}),z==="FUERA"&&N.length===0&&e.jsxs("div",{className:"py-16 flex flex-col items-center gap-3 text-slate-400",children:[e.jsx(_,{size:48,strokeWidth:1.5,className:"opacity-40"}),e.jsx("p",{className:"font-semibold",children:"No hay retiros fuera de estante."})]})]})}):null,v&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4",onClick:()=>Z(null),children:e.jsxs("div",{className:"bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95",onClick:o=>o.stopPropagation(),children:[e.jsx("h3",{className:"text-2xl font-black text-slate-800 mb-2 tracking-tight",children:"Confirmar Entrega"}),e.jsx("p",{className:"text-slate-500 mb-4 font-medium",children:v.id==="FUERA DE ESTANTE"?e.jsxs(e.Fragment,{children:["Orden de retiro: ",e.jsx("strong",{className:"text-blue-600",children:v.dataList[0]?.ordenDeRetiro||v.dataList[0]?.OrdenRetiro}),e.jsxs("span",{className:"ml-2 text-slate-400",children:["· ",v.dataList[0]?.CliNombre||v.dataList[0]?.idcliente||v.dataList[0]?.CodigoCliente||""]})]}):e.jsxs(e.Fragment,{children:["Ubicación a entregar: ",e.jsx("strong",{className:"text-blue-600",children:v.id})]})}),v.dataList.length>1&&e.jsxs("div",{className:"mb-4 bg-slate-100 p-4 rounded-2xl border border-slate-200",children:[e.jsx("p",{className:"text-xs font-bold text-slate-500 uppercase mb-2",children:"Seleccione las órdenes a retirar:"}),e.jsx("div",{className:"flex flex-col gap-2 max-h-32 overflow-y-auto pr-2",children:v.dataList.map(o=>{const n=o.OrdenRetiro||o.ordenDeRetiro,d=!!H[n];return e.jsxs("label",{className:`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-all ${d?"bg-blue-50/80 border border-blue-200":"hover:bg-slate-200 border border-transparent"}`,children:[e.jsx("input",{type:"checkbox",className:"w-5 h-5 accent-blue-600 rounded",checked:d,onChange:i=>fe(s=>({...s,[n]:i.target.checked}))}),e.jsx("span",{className:"font-bold text-slate-700",children:o.PagoHandy?n.replace("R-","PW-"):n}),e.jsx("span",{className:"text-xs text-slate-500 truncate",children:o.ClientName||o.CodigoCliente||"Cliente"})]},n)})})]}),e.jsxs("form",{onSubmit:o=>{o.preventDefault();const n=me.trim().toUpperCase();if(n)try{let d=[];v.dataList.forEach(s=>{const a=s.OrdenRetiro||s.ordenDeRetiro;H[a]&&(s.BultosJSON?d.push(...JSON.parse(s.BultosJSON)):s.orders&&d.push(...s.orders))});const i=d.find(s=>s.orderNumber&&s.orderNumber.toUpperCase()===n||s.id&&s.id.toString().toUpperCase()===n);i&&ae(s=>({...s,[i.orderNumber||i.id]:!0})),ne("")}catch{}},className:"mb-6 relative",children:[e.jsx("div",{className:"absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none",children:e.jsx(X,{className:"h-5 w-5 text-blue-400"})}),e.jsx("input",{type:"text",value:me,onChange:o=>ne(o.target.value),className:"block w-full pl-12 pr-16 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-medium transition-all text-slate-700",placeholder:"Escanee el bulto aquí (opcional manual)...",autoFocus:!0}),e.jsx("button",{type:"submit",className:"absolute inset-y-1.5 right-1.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700",children:"OK"})]}),e.jsxs("div",{className:"bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 max-h-48 overflow-y-auto",children:[e.jsx("p",{className:"text-xs font-bold text-slate-400 uppercase tracking-widest mb-3",children:"Checklist Bultos a Entregar"}),e.jsx("ul",{className:"space-y-2",children:(()=>{try{let o=[];return v.dataList.forEach(n=>{const d=n.OrdenRetiro||n.ordenDeRetiro;H[d]&&(n.BultosJSON?o.push(...JSON.parse(n.BultosJSON)):n.orders&&o.push(...n.orders))}),o.length===0?e.jsx("li",{className:"text-sm font-medium text-slate-600",children:"No hay bultos u órdenes seleccionadas."}):o.map((n,d)=>{const i=n.orderNumber||n.id||`Desconocido_${d}`,s=!!be[i];return e.jsxs("li",{onClick:()=>ae(a=>({...a,[i]:!s})),className:`flex items-center gap-3 text-sm font-bold cursor-pointer transition-all p-3 rounded-xl border-2 shadow-sm ${s?"bg-green-50/80 border-green-400 text-green-800":"bg-white border-slate-200 text-slate-700"}`,children:[e.jsx("div",{className:`p-1.5 rounded-md ${s?"bg-green-500/10":"bg-slate-100"}`,children:e.jsx(_,{size:16,className:s?"text-green-600":"text-blue-500"})}),i,e.jsx("span",{className:"text-[11px] font-normal opacity-60 ml-auto mr-2 truncate max-w-[120px]",children:n.ordNombreTrabajo||""}),s?e.jsx(ye,{className:"text-green-500",size:20}):e.jsx("div",{className:"w-5 h-5 rounded-full border-2 border-slate-300"})]},d)})}catch{return e.jsx("li",{className:"text-sm font-medium text-slate-600",children:"Error al leer bultos."})}})()})]}),e.jsxs("div",{className:"flex gap-4",children:[e.jsx("button",{onClick:()=>Z(null),className:"flex-[0.8] py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors",children:"Cancelar"}),(()=>{let o=!0;try{let n=[];v.dataList.forEach(i=>{const s=i.OrdenRetiro||i.ordenDeRetiro;H[s]&&(i.BultosJSON?n.push(...JSON.parse(i.BultosJSON)):i.orders&&n.push(...i.orders))}),Object.values(H).some(i=>i)?n.length>0&&(o=n.every(i=>!!be[i.orderNumber||i.id||""])):o=!1}catch{}return e.jsxs("button",{disabled:!o,onClick:Re,className:"flex-[1.2] py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:text-white disabled:shadow-none disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2",children:[e.jsx(Pe,{size:20})," Entregar Ahora"]})})()]})]})})]})};export{qe as default};
