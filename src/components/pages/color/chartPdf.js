import { jsPDF } from 'jspdf';
import { CHART_PATCHES, CHART_COLS, CHART_ROWS, hexToRgb } from './chartData';

// Genera y descarga el PDF imprimible de la chart de calibración (A4).
// El batchId queda impreso para poder asociar después la medición del espectro.
export function generateChartPDF(batchId) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;

    const patch = 28; // mm
    const gap = 3;    // mm
    const gridW = CHART_COLS * patch + (CHART_COLS - 1) * gap;
    const gridH = CHART_ROWS * patch + (CHART_ROWS - 1) * gap;
    const startX = (pageW - gridW) / 2;
    const startY = 45;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Chart de calibración de color', pageW / 2, 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text('24 parches · fotografiar junto a la muestra', pageW / 2, 29, { align: 'center' });
    doc.setTextColor(0);

    CHART_PATCHES.forEach((p, i) => {
        const row = Math.floor(i / CHART_COLS);
        const col = i % CHART_COLS;
        const x = startX + col * (patch + gap);
        const y = startY + row * (patch + gap);
        const { r, g, b } = hexToRgb(p.hex);
        doc.setFillColor(r, g, b);
        doc.setDrawColor(150);
        doc.setLineWidth(0.2);
        doc.rect(x, y, patch, patch, 'FD');
        // Etiqueta con el número del parche (caja blanca chica abajo-izquierda)
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y + patch - 5, 7, 5, 'F');
        doc.setFontSize(8);
        doc.setTextColor(40);
        doc.text(String(p.id), x + 3.5, y + patch - 1.4, { align: 'center' });
    });

    drawCornerMarks(doc, startX, startY, gridW, gridH);

    const footY = startY + gridH + 14;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Tirada: ${batchId || '—'}`, startX, footY);
    doc.setFontSize(9);
    doc.setTextColor(110);
    const tips = [
        'En la app, marcá las 4 esquinas en orden: 1, 2, 3, 4.',
        'Luz pareja y difusa (sin flash directo ni reflejos sobre la chart).',
        'Chart y muestra en la misma foto, lo más planas posible.',
        'No recortar: deben verse las 4 esquinas de la grilla.',
    ];
    tips.forEach((t, i) => doc.text(`• ${t}`, startX, footY + 7 + i * 5));

    doc.save(`chart-calibracion-${batchId || 'sin-tirada'}.pdf`);
}

// Círculos numerados en las 4 esquinas, en el ORDEN de marcado (horario desde arriba-izquierda):
// 1 = arriba-izq, 2 = arriba-der, 3 = abajo-der, 4 = abajo-izq. Centrados en la esquina real de la grilla.
function drawCornerMarks(doc, x, y, w, h) {
    const corners = [
        { cx: x, cy: y, n: 1 },
        { cx: x + w, cy: y, n: 2 },
        { cx: x + w, cy: y + h, n: 3 },
        { cx: x, cy: y + h, n: 4 },
    ];
    corners.forEach(({ cx, cy, n }) => {
        doc.setFillColor(17, 17, 17);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.8);
        doc.circle(cx, cy, 3.8, 'FD');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(String(n), cx, cy + 1.6, { align: 'center' });
    });
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
}
