import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Layers,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.tsx';
import {
  filterMovementsByMonthYear,
  summarizeMovements,
  calculateInventoryValuation,
  isLowStock,
} from '../utils/inventoryLogic.ts';
import { generateMonthlyInventoryPDF } from '../utils/pdfGenerator.ts';

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export const ReportsView: React.FC = () => {
  const { items, movements, currentUser, currentRole, switchRole } = useInventory();

  // Current date is 2026-10-15
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfBlobUrl, setGeneratedPdfBlobUrl] = useState<string | null>(null);

  const monthMovements = filterMovementsByMonthYear(movements, selectedYear, selectedMonth);
  const movSummary = summarizeMovements(monthMovements);
  const totalValuation = calculateInventoryValuation(items);
  const lowStockCount = items.filter((i) => isLowStock(i.quantity, i.minQuantity)).length;

  const currentMonthName = MONTHS.find((m) => m.value === selectedMonth)?.label || '';

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    try {
      const doc = generateMonthlyInventoryPDF({
        items,
        movements,
        year: selectedYear,
        month: selectedMonth,
        generatedBy: currentUser,
      });

      const fileName = `Reporte-Inventario-Almacen-${currentMonthName}-${selectedYear}.pdf`;
      doc.save(fileName);

      // Also create object URL for preview
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setGeneratedPdfBlobUrl(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar el documento PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const isOperator = currentRole === 'operator';

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-150">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Reportes Mensuales de Inventario
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Formato PDF
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Auditorías oficiales, valuación económica de almacén y bitácora de movimientos
              </p>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* Operator role note if restricted */}
      {isOperator && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-200">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Actualmente estás como <strong>Operario</strong>. La descarga de reportes PDF oficiales está reservada para Supervisores y Administradores.
            </span>
          </div>
          <button
            type="button"
            onClick={() => switchRole('supervisor')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs whitespace-nowrap transition"
          >
            Cambiar a Supervisor
          </button>
        </div>
      )}

      {/* Executive Metrics Overview */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Resumen Ejecutivo: {currentMonthName} {selectedYear}
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valuación Total</span>
            <p className="text-xl font-black text-emerald-400 mt-1">
              ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{items.length} artículos en almacén</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Entradas en el Mes</span>
            <p className="text-xl font-black text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              +{movSummary.totalQuantityIn.toLocaleString()} <span className="text-xs font-normal text-slate-400">uds</span>
            </p>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{movSummary.totalEntries} recepciones</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Salidas en el Mes</span>
            <p className="text-xl font-black text-rose-400 mt-1 flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              -{movSummary.totalQuantityOut.toLocaleString()} <span className="text-xs font-normal text-slate-400">uds</span>
            </p>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{movSummary.totalExits} despachos</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stock Crítico</span>
            <p className="text-xl font-black text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {lowStockCount} <span className="text-xs font-normal text-slate-400">artículos</span>
            </p>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Requieren reposición</span>
          </div>
        </div>
      </div>

      {/* PDF Export Action Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Descargar Documento Oficial en PDF
          </h3>
          <p className="text-xs text-slate-400 max-w-lg">
            Incluye membrete formal de almacén, tabla completa de existencias, bitácora detallada de movimientos de {currentMonthName} {selectedYear} y bloques para firmas de conformidad.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGenerating || isOperator}
            className="w-full sm:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? 'Generando PDF...' : `Descargar PDF de ${currentMonthName}`}
          </button>
        </div>
      </div>

      {/* Monthly Movements Preview Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Transacciones Registradas en {currentMonthName} {selectedYear}
            </h3>
            <p className="text-xs text-slate-400">
              {monthMovements.length} movimientos de inventario en este período
            </p>
          </div>
        </div>

        {monthMovements.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              No se registran movimientos para {currentMonthName} de {selectedYear}.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Prueba seleccionando Octubre o Septiembre 2026 en el selector superior.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Artículo</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">Nuevo Stock</th>
                  <th className="px-4 py-3">Motivo / Referencia</th>
                  <th className="px-4 py-3">Operario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {monthMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                      {new Date(m.timestamp).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.type === 'ENTRADA'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : m.type === 'SALIDA'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-semibold max-w-[200px] truncate">
                      {m.itemName}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-bold ${
                        m.type === 'ENTRADA' ? 'text-emerald-400' : m.type === 'SALIDA' ? 'text-rose-400' : 'text-blue-400'
                      }`}
                    >
                      {m.type === 'ENTRADA' ? `+${m.quantity}` : m.type === 'SALIDA' ? `-${m.quantity}` : `${m.quantity}`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {m.newStock}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">
                      {m.reason} {m.reference && <span className="text-slate-500 font-mono">({m.reference})</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {m.performedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
