import React from 'react';

const TicketImpresion = React.forwardRef(({ data }, ref) => {
  if (!data) return <div ref={ref} className="ticket-imprimible" style={{ display: 'none' }}></div>;

  const { empresa, sucursal, rut, direccion, fecha, comprobante, cajero, cliente, items, totales, pagos } = data;

  return (
    <div ref={ref} className="ticket-imprimible" style={{
      width: '80mm',
      background: 'white',
      color: 'black',
      padding: '5mm',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '12px',
      lineHeight: '1.2'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{empresa || 'MACROSOFT LTDA'}</h2>
        {rut && <p style={{ margin: 0 }}>RUT: {rut}</p>}
        {direccion && <p style={{ margin: 0 }}>{direccion}</p>}
        {sucursal && <p style={{ margin: 0 }}>{sucursal}</p>}
      </div>

      <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

      <p style={{ margin: '2px 0' }}><strong>FECHA :</strong> {fecha}</p>
      <p style={{ margin: '2px 0' }}><strong>TICKET:</strong> {comprobante || '----------------'}</p>
      <p style={{ margin: '2px 0' }}><strong>CAJERO:</strong> {cajero || 'CAJA_CENTRAL'}</p>
      <p style={{ margin: '2px 0' }}><strong>CLIENTE:</strong> {cliente || 'Consumidor Final'}</p>

      <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>
      <table style={{ width: '100%', marginBottom: '10px', fontSize: '11px' }}>
        <thead>
           <tr style={{ borderBottom: '1px dotted black' }}>
              <th style={{ textAlign: 'left' }}>Detalle</th>
              <th style={{ textAlign: 'center' }}>Cant</th>
              <th style={{ textAlign: 'right' }}>Total</th>
           </tr>
        </thead>
        <tbody>
           {items?.map((it, idx) => (
             <tr key={idx}>
               <td style={{ padding: '2px 0', verticalAlign: 'top' }}>{it.descripcion}</td>
               <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{it.cantidad || 1}</td>
               <td style={{ textAlign: 'right', verticalAlign: 'top' }}>${Number(it.importe).toFixed(2)}</td>
             </tr>
           ))}
        </tbody>
      </table>
      <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

      {totales?.subtotal !== undefined && <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}><span>SUBTOTAL:</span> <span>${Number(totales.subtotal).toFixed(2)}</span></p>}
      {totales?.descuento !== undefined && <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}><span>DESCUENTO:</span> <span>${Number(totales.descuento).toFixed(2)}</span></p>}
      {totales?.ajuste !== undefined && <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}><span>AJUSTES:</span> <span>${Number(totales.ajuste).toFixed(2)}</span></p>}
      <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}><span>TOTAL:</span> <span>{totales?.moneda || '$'} {Number(totales?.total || 0).toFixed(2)}</span></p>

      <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

      <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Medios de Pago:</p>
      {pagos?.map((p, i) => (
         <p key={i} style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}><span>{p.metodo}</span> <span>{p.moneda} {Number(p.monto).toFixed(2)}</span></p>
      ))}

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px' }}>
         <p style={{ margin: '0' }}>GRACIAS POR SU COMPRA</p>
         <p style={{ margin: '0 0 10px 0' }}>Servicio brindado por Macrosoft ERP</p>
      </div>
      <div style={{ height: '10mm' }}></div>
    </div>
  );
});

export default TicketImpresion;
