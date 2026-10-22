import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem, StockMovement, UserProfile } from '../types.ts';
import {
  calculateInventoryValuation,
  filterMovementsByMonthYear,
  summarizeMovements,
  isLowStock,
} from './inventoryLogic.ts';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export interface GenerateReportParams {
  items: InventoryItem[];
  movements: StockMovement[];
  year: number;
  month: number; // 1-12
  generatedBy: UserProfile;
}

export function generateMonthlyInventoryPDF({
  items,
  movements,
  year,
  month,
  generatedBy,
}: GenerateReportParams): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const monthName = MONTH_NAMES[month - 1] || `Mes ${month}`;
  const periodTitle = `${monthName.toUpperCase()} ${year}`;
  const currentDateStr = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Filter movements for this specific month
  const monthMovements = filterMovementsByMonthYear(movements, year, month);
  const movSummary = summarizeMovements(monthMovements);
  const totalValuation = calculateInventoryValuation(items);
  const lowStockItems = items.filter((it) => isLowStock(it.quantity, it.minQuantity));

  // --- HEADER SECTION ---
  // Primary brand banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Accent colored bar
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 32, 210, 2.5, 'F');

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ALMACÉN MÓVIL PRO - GESTIÓN DE INVENTARIOS', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`INFORME MENSUAL OFICIAL DE AUDITORÍA & MOVIMIENTOS`, 14, 21);
  doc.text(`Período de Liquidación: ${periodTitle}`, 14, 27);

  // Header metadata (right aligned)
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Fecha de Emisión: ${currentDateStr}`, 196, 14, { align: 'right' });
  doc.text(`Generado por: ${generatedBy.displayName} (${generatedBy.role.toUpperCase()})`, 196, 20, { align: 'right' });
  doc.text(`ID Cuenta: ${generatedBy.email}`, 196, 26, { align: 'right' });

  let currentY = 42;

  // --- KPI CARDS SUMMARY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('RESUMEN EJECUTIVO DEL MES', 14, currentY);
  currentY += 4;

  const cardWidth = 43;
  const cardHeight = 18;
  const gap = 3.5;
  const startX = 14;

  const kpis = [
    { label: 'Valuación Total', val: `$${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [16, 185, 129] }, // emerald
    { label: 'Total de SKUs', val: `${items.length} artículos`, color: [59, 130, 246] }, // blue
    { label: 'Entradas (Mes)', val: `+${movSummary.totalQuantityIn.toLocaleString()} uds`, color: [34, 197, 94] }, // green
    { label: 'Salidas (Mes)', val: `-${movSummary.totalQuantityOut.toLocaleString()} uds`, color: [239, 68, 68] }, // red
  ];

  kpis.forEach((kpi, idx) => {
    const x = startX + idx * (cardWidth + gap);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    // color strip
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(x, currentY, 3, cardHeight, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 6, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 6, currentY + 13);
  });

  currentY += cardHeight + 8;

  // --- LOW STOCK ALERT NOTICE IF ANY ---
  if (lowStockItems.length > 0) {
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(252, 165, 165); // red-300
    doc.roundedRect(14, currentY, 182, 10, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(
      `ALERTA DE SEGURIDAD: Se registran ${lowStockItems.length} artículos en nivel crítico o por debajo del stock mínimo.`,
      18,
      currentY + 6.5
    );
    currentY += 14;
  }

  // --- TABLE 1: INVENTORY ITEMS SNAPSHOT ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`1. ESTADO DE EXISTENCIAS Y VALORIZACIÓN (${items.length} ÍTEMS)`, 14, currentY);
  currentY += 3;

  const itemTableRows = items.map((it) => {
    const isCritical = isLowStock(it.quantity, it.minQuantity);
    const itemTotalVal = (it.quantity || 0) * (it.unitPrice || 0);
    return [
      it.sku,
      it.name,
      it.barcode,
      it.location,
      `${it.quantity} ${it.unit}`,
      `${it.minQuantity} ${it.unit}`,
      isCritical ? 'CRÍTICO' : 'NORMAL',
      `$${it.unitPrice.toFixed(2)}`,
      `$${itemTotalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['SKU', 'Descripción', 'Cód. Barras', 'Ubicación', 'Stock', 'Mín.', 'Estado', 'P. Unit', 'Valor Total']],
    body: itemTableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 44 },
      2: { cellWidth: 23 },
      3: { cellWidth: 24 },
      4: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 14, halign: 'right' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 12, halign: 'right' },
      8: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw === 'CRÍTICO') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [16, 185, 129];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Get position after first table
  const finalY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || currentY + 40;

  // --- TABLE 2: MONTHLY MOVEMENTS LOG ---
  let nextY = finalY1 + 10;

  // Add new page if not enough space for header and table
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. BITÁCORA DE MOVIMIENTOS REGISTRADOS EN ${periodTitle} (${monthMovements.length} MOVIMIENTOS)`, 14, nextY);
  nextY += 3;

  const movementRows = monthMovements.length > 0
    ? monthMovements.map((m) => {
        const d = new Date(m.timestamp);
        const dateFormatted = isNaN(d.getTime()) ? m.timestamp : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return [
          dateFormatted,
          m.type,
          m.itemName,
          m.type === 'ENTRADA' ? `+${m.quantity}` : (m.type === 'SALIDA' ? `-${m.quantity}` : `${m.quantity}`),
          `${m.newStock}`,
          `${m.reason}${m.reference ? ` (${m.reference})` : ''}`,
          m.performedBy,
        ];
      })
    : [['-', 'SIN MOVIMIENTOS', 'No se registraron movimientos en este mes seleccionado', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: nextY,
    head: [['Fecha / Hora', 'Tipo', 'Artículo', 'Cant.', 'Nuevo Stock', 'Motivo / Referencia', 'Operario / Rol']],
    body: movementRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 44 },
      3: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 42 },
      6: { cellWidth: 27 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        if (data.cell.raw === 'ENTRADA') {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (data.cell.raw === 'SALIDA') {
          data.cell.styles.textColor = [239, 68, 68];
        } else if (data.cell.raw === 'AJUSTE') {
          data.cell.styles.textColor = [59, 130, 246];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  const finalY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || nextY + 40;

  // --- SIGNATURE SECTION ---
  let sigY = finalY2 + 14;
  if (sigY > 240) {
    doc.addPage();
    sigY = 30;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('VALIDACIÓN Y FIRMAS DE CONFORMIDAD', 14, sigY);
  sigY += 12;

  const colWidth = 55;
  const colGap = 9;

  // Signature box 1: Operador
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY + 12, 14 + colWidth, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Firma Operario / Despachador', 14, sigY + 16);
  doc.text('Nombre: ____________________', 14, sigY + 20);

  // Signature box 2: Supervisor
  const sigX2 = 14 + colWidth + colGap;
  doc.line(sigX2, sigY + 12, sigX2 + colWidth, sigY + 12);
  doc.text('Firma Supervisor de Almacén', sigX2, sigY + 16);
  doc.text('Nombre: ____________________', sigX2, sigY + 20);

  // Signature box 3: Admin / Gerente
  const sigX3 = sigX2 + colWidth + colGap;
  doc.line(sigX3, sigY + 12, sigX3 + colWidth, sigY + 12);
  doc.text('Firma Jefe de Operaciones', sigX3, sigY + 16);
  doc.text('Nombre: ____________________', sigX3, sigY + 20);

  // --- FOOTER FOR ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 287, 196, 287);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Almacén Móvil Pro | Documento oficial de trazabilidad de inventarios | Generado digitalmente', 14, 292);
    doc.text(`Página ${i} de ${totalPages}`, 196, 292, { align: 'right' });
  }

  return doc;
}
