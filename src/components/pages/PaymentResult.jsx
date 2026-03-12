import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CircleCheckBig, CircleX, Clock, Clock8, ArrowLeft, RotateCcw, CreditCard, Package, Receipt, Download, Copy, Check } from 'lucide-react';
import { Logo } from '../Logo';
import { useAuth } from '../../client-portal/auth/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const statusConfig = {
    Pagado: {
        icon: CircleCheckBig,
        title: '¡Pago realizado con éxito!',
        subtitle: 'Tu pago fue procesado correctamente.',
        color: '#10b981',
        badge: 'PAGADO',
        badgeBg: 'rgba(16, 185, 129, 0.12)',
    },
    Fallido: {
        icon: CircleX,
        title: 'El pago no pudo completarse',
        subtitle: 'Hubo un problema al procesar tu pago.',
        color: '#BD0C7E',
        badge: 'FALLIDO',
        badgeBg: 'rgba(189, 12, 126, 0.12)',
    },
    Pendiente: {
        icon: Clock,
        title: 'Pago pendiente',
        subtitle: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
        color: '#006E97',
        badge: 'PENDIENTE',
        badgeBg: 'rgba(0, 110, 151, 0.12)',
    },
    Creado: {
        icon: Clock8,
        title: 'Procesando pago...',
        subtitle: 'Estamos verificando tu pago con la pasarela.',
        color: '#DCB308',
        badge: 'PROCESANDO',
        badgeBg: 'rgba(220, 179, 8, 0.12)',
    }
};

const defaultConfig = statusConfig.Pendiente;

function formatDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-UY', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
}

async function generateReceipt(data, codCliente) {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Load logo
    try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = '/assets/images/logo.png';
        });
        // Aspect ratio: keep height ~12, calculate width
        const ratio = img.width / img.height;
        const h = 12;
        const w = h * ratio;
        doc.addImage(img, 'PNG', 20, 14, w, h);
    } catch {
        // Logo not available, skip
    }
    // Load PAGADO stamp for later use
    let stampImg = null;
    if (data.status === 'Pagado') {
        try {
            stampImg = new Image();
            stampImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                stampImg.onload = resolve;
                stampImg.onerror = reject;
                stampImg.src = '/assets/images/pagado-stamp.png';
            });
        } catch { stampImg = null; }
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140);
    doc.text(`${data.transactionId || ''}`, pageW - 20, 25, { align: 'right' });

    // Separator
    doc.setDrawColor(200);
    doc.line(20, 32, pageW - 20, 32);

    // Comprobante de pago label + date
    let y = 40;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 24, 27);
    doc.text('COMPROBANTE DE PAGO', 20, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(formatDate(data.paidAt) || '', pageW - 20, y, { align: 'right' });

    y += 6;

    // Draw mini cards - each half width
    const drawMiniCard = (x, w, label, value) => {
        const hH = 7;
        const bH = 11;

        // Black header
        doc.setFillColor(25, 24, 27);
        doc.roundedRect(x, y, w, hH, 2, 2, 'F');
        doc.rect(x, y + hH - 2, w, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(label, x + w / 2, y + 5, { align: 'center' });

        // White body
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200);
        doc.rect(x, y + hH, w, bH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(25, 24, 27);
        doc.text(value, x + w / 2, y + hH + 7.5, { align: 'center' });
    };

    const retiroCode = data.status === 'Pagado' ? String(data.ordenRetiro || '').replace('R-', 'PW-') : String(data.ordenRetiro || '-');
    const clientCode = String(codCliente || '-');
    const contentW = pageW - 40;
    const halfW = (contentW - 6) / 2;

    drawMiniCard(20, halfW, 'C\u00d3DIGO DE RETIRO', retiroCode);
    drawMiniCard(20 + halfW + 6, halfW, 'C\u00d3DIGO DE CLIENTE', clientCode);

    y += 18 + 10;

    const details = [
        ['MEDIO DE PAGO', data.paymentMethod || '-'],
    ];

    details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120);
        doc.setFontSize(10);
        doc.text(label, 20, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40);
        doc.setFontSize(10);
        doc.text(String(value).toUpperCase(), pageW - 20, y, { align: 'right' });
        y += 8;
    });

    // Orders list with alternating rows
    if (data.orders?.length > 0) {
        y += 0;
        const rowH = 8;
        // Header
        doc.setFillColor(25, 24, 27);
        doc.rect(20, y, pageW - 40, rowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('PEDIDO', 24, y + 5.5);
        doc.text('IMPORTE', pageW - 24, y + 5.5, { align: 'right' });
        y += rowH;

        data.orders.forEach((o, i) => {
            // Alternate backgrounds: zinc-100 / zinc-300
            if (i % 2 === 0) {
                doc.setFillColor(244, 244, 245); // zinc-100
            } else {
                doc.setFillColor(212, 212, 216); // zinc-300
            }
            doc.rect(20, y, pageW - 40, rowH, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(40);
            doc.text(String(o.id || o.desc), 24, y + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(`${data.currencySymbol} ${Number(o.amount || 0).toFixed(2)}`, pageW - 24, y + 5.5, { align: 'right' });
            y += rowH;
        });
        y += 6;
    }

    // Total - right-aligned as "TOTAL: $amount"
    doc.setDrawColor(200);
    doc.line(20, y, pageW - 20, y);
    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 24, 27);
    const totalAmount = `$ ${Number(data.totalAmount).toFixed(2)}`;
    const totalLabel = 'TOTAL: ';
    const labelW = doc.getTextWidth(totalLabel);
    doc.text(totalLabel, pageW - 20 - doc.getTextWidth(totalAmount), y, { align: 'right' });
    doc.setTextColor(5, 150, 105);
    doc.text(totalAmount, pageW - 20, y, { align: 'right' });

    // PAGADO stamp at total height, left side
    if (stampImg) {
        const stampW = 35;
        const stampH = stampW * (stampImg.height / stampImg.width);
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.5 }));
        doc.addImage(stampImg, 'PNG', pageW / 3 - stampW / 2, y - stampH / 2 + 2, stampW, stampH);
        doc.restoreGraphicsState();
    }

    // UYU below total
    y += 4;
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(10);
    doc.text(data.currency || 'UYU', pageW - 20, y, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text('ESTE COMPROBANTE FUE GENERADO AUTOMATICAMENTE.', pageW / 2, 280, { align: 'center' });



    const code = data.status === 'Pagado' ? String(data.ordenRetiro || '').replace('R-', 'PW-') : data.transactionId;
    doc.save(`comprobante-${code}.pdf`);
}

export default function PaymentResult() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [txData, setTxData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        const txId = searchParams.get('TransactionExternalId') || searchParams.get('transactionId') || searchParams.get('txId');

        if (!txId) {
            setLoading(false);
            setError('No se encontró información del pago.');
            return;
        }

        const fetchStatus = async () => {
            try {
                const res = await fetch(`${API_BASE}/web-orders/payment-status/${txId}`);
                if (!res.ok) throw new Error('Transacción no encontrada');
                const data = await res.json();
                setTxData(data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();

        // Poll cada 5s si está en Creado o Pendiente (esperando webhook)
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/web-orders/payment-status/${txId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTxData(data);
                    if (data.status === 'Pagado' || data.status === 'Fallido') {
                        clearInterval(interval);
                    }
                }
            } catch { /* silently retry */ }
        }, 5000);

        return () => clearInterval(interval);
    }, [searchParams]);

    const config = txData ? (statusConfig[txData.status] || defaultConfig) : defaultConfig;
    const Icon = config.icon;
    const showDate = txData?.status === 'Pagado' || txData?.status === 'Fallido';
    const absoluteTime = showDate ? formatDate(txData?.status === 'Pagado' ? txData.paidAt : txData?.createdAt) : null;

    return (
        <div style={{
            minHeight: '100vh',
            background: '#19181B',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            padding: '20px',
            gap: '24px',
        }}>
            {/* Logo + Card */}
            <div className="payment-card" style={{
                background: '#f4f4f5',
                borderRadius: '16px',
                padding: '40px',
                maxWidth: '520px',
                width: '100%',
                position: 'relative',
            }}>
                {/* Card content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{
                            width: '40px', height: '40px', border: '3px solid rgba(25,24,27,0.15)',
                            borderTopColor: '#006E97', borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
                        }} />
                        <p style={{ color: '#52525b', fontSize: '14px' }}>Consultando estado del pago...</p>
                    </div>
                ) : error && !txData ? (
                    <div style={{ textAlign: 'center' }}>
                        <CircleX size={48} color="#BD0C7E" style={{ marginBottom: 16 }} />
                        <h2 style={{ color: '#19181B', fontSize: '20px', margin: '0 0 8px' }}>No se encontró la transacción</h2>
                        <p style={{ color: '#52525b', fontSize: '14px', margin: '0 0 24px' }}>{error}</p>
                        <button onClick={() => navigate('/portal/pickup')} style={btnDark}>
                            <ArrowLeft size={16} /> Volver al Portal
                        </button>
                    </div>
                ) : txData && (
                    <>
                        {/* Status Header */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '50%',
                                background: '#fff', border: '1px solid #e4e4e7',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 20px',
                            }}>
                                <Icon size={36} color={config.color} />
                            </div>
                            <h1 style={{ color: '#19181B', fontSize: '18px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {config.title}
                            </h1>
                            <p style={{ color: '#52525b', fontSize: '12px', margin: '0 0 12px', lineHeight: 1.5, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {config.subtitle}
                            </p>

                            {/* Status Badge */}
                            <span style={{
                                display: 'inline-block',
                                marginTop: '14px',
                                padding: '5px 18px',
                                borderRadius: '20px',
                                background: config.badgeBg,
                                color: config.color,
                                fontSize: '12px',
                                fontWeight: 700,
                                letterSpacing: '0.8px',
                            }}>
                                {config.badge}
                            </span>

                            {/* 3. Timestamp — only on Pagado/Fallido */}
                            {absoluteTime && (
                                <p style={{ color: '#71717a', fontSize: '12px', marginTop: '8px' }}>
                                    {absoluteTime}
                                </p>
                            )}
                        </div>

                        {/* Amount Section */}
                        <div style={{
                            background: '#fff', borderRadius: '12px',
                            padding: '20px', marginBottom: '16px',
                            border: '1px solid #e4e4e7',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#71717a', fontSize: '13px' }}>Total pagado</span>
                                <span style={{ color: config.color, fontSize: '28px', fontWeight: 700 }}>
                                    {txData.currencySymbol} {Number(txData.totalAmount).toFixed(2)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                <span style={{ color: '#71717a', fontSize: '12px' }}>Moneda</span>
                                <span style={{ color: '#3f3f46', fontSize: '13px' }}>{txData.currency}</span>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="payment-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                            {txData.ordenRetiro && (
                                <CopyableInfoCard icon={<Receipt size={14} />} label="Código de Retiro"
                                    value={txData.status === 'Pagado' ? String(txData.ordenRetiro).replace('R-', 'PW-') : String(txData.ordenRetiro)} />
                            )}
                            {txData.paymentMethod && (
                                <InfoCard icon={<CreditCard size={14} />} label="Medio de pago" value={txData.paymentMethod} />
                            )}
                        </div>

                        {/* Orders List */}
                        {txData.orders?.length > 0 && (
                            <div style={{
                                background: '#fff', borderRadius: '12px',
                                padding: '14px', marginBottom: '24px',
                                border: '1px solid #e4e4e7',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                    <Package size={14} color="#71717a" />
                                    <span style={{ color: '#71717a', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Pedidos ({txData.orders.length})
                                    </span>
                                </div>
                                {txData.orders.map((order, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '8px 0', borderTop: i > 0 ? '1px solid #e4e4e7' : 'none'
                                    }}>
                                        <span style={{ color: '#19181B', fontSize: '13px' }}>
                                            {order.id || order.desc}
                                        </span>
                                        <span style={{ color: '#52525b', fontSize: '13px', fontFamily: 'monospace' }}>
                                            {txData.currencySymbol} {Number(order.amount || 0).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Transaction ID */}
                        <div style={{
                            background: '#fff', borderRadius: '8px', border: '1px solid #e4e4e7',
                            padding: '10px 14px', textAlign: 'center'
                        }}>
                            <span style={{ color: '#52525b', fontSize: '11px' }}>ID: </span>
                            <span style={{ color: '#71717a', fontSize: '11px', fontFamily: 'monospace' }}>
                                {txData.transactionId}
                            </span>
                        </div>

                        {/* 4. Separator */}
                        <div style={{ borderTop: '1px solid #d4d4d8', margin: '24px 0' }} />

                        {/* Action Buttons */}
                        <div className="payment-actions" style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => navigate('/portal/pickup')}
                                style={btnDark}
                                onMouseOver={e => e.target.style.opacity = '0.85'}
                                onMouseOut={e => e.target.style.opacity = '1'}
                            >
                                <ArrowLeft size={16} />
                                Volver al Portal
                            </button>

                            {txData.status === 'Pagado' && (
                                <button
                                    onClick={() => generateReceipt(txData, user?.codCliente)}
                                    style={btnOutline}
                                    onMouseOver={e => e.target.style.background = '#f4f4f5'}
                                    onMouseOut={e => e.target.style.background = 'transparent'}
                                >
                                    <Download size={16} />
                                    Comprobante
                                </button>
                            )}

                            {txData.status === 'Fallido' && (
                                <button
                                    onClick={() => navigate('/portal/pickup')}
                                    style={{ ...btnOutline, color: '#BD0C7E', borderColor: '#BD0C7E' }}
                                    onMouseOver={e => e.target.style.background = 'rgba(189,12,126,0.06)'}
                                    onMouseOut={e => e.target.style.background = 'transparent'}
                                >
                                    <RotateCcw size={16} />
                                    Reintentar
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 480px) {
                    .payment-card {
                        padding: 20px !important;
                        border-radius: 12px !important;
                    }
                    .payment-card h1 {
                        font-size: 15px !important;
                    }
                    .payment-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .payment-actions {
                        flex-direction: column !important;
                    }
                }

                @media (min-width: 481px) and (max-width: 768px) {
                    .payment-card {
                        padding: 28px !important;
                    }
                }
            `}</style>
        </div>
    );
}


function InfoCard({ icon, label, value }) {
    return (
        <div style={{
            background: '#fff', borderRadius: '12px', padding: '14px',
            border: '1px solid #e4e4e7',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: '#71717a' }}>{icon}</span>
                <span style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            </div>
            <span style={{ color: '#19181B', fontSize: '14px', fontWeight: 600 }}>{value}</span>
        </div>
    );
}

function CopyableInfoCard({ icon, label, value }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div style={{
            background: '#fff', borderRadius: '12px', padding: '14px',
            border: '1px solid #e4e4e7',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: '#71717a' }}>{icon}</span>
                <span style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#19181B', fontSize: '14px', fontWeight: 600 }}>{value}</span>
                <button onClick={handleCopy} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: copied ? '#10b981' : '#a1a1aa', transition: 'color 0.2s',
                    display: 'flex', alignItems: 'center',
                }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            </div>
        </div>
    );
}

const btnDark = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    flex: 1, padding: '14px 20px',
    background: '#19181B',
    color: '#d4d4d8', border: 'none', borderRadius: '12px',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s ease'
};

const btnOutline = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    flex: 1, padding: '14px 20px',
    background: 'transparent',
    color: '#3f3f46', border: '1px solid #a1a1aa', borderRadius: '12px',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s ease'
};
