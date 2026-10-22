import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Layers,
  User,
  Clock,
  FileCheck,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.tsx';
import { StockMovement, MovementType } from '../types.ts';

export const MovementsView: React.FC = () => {
  const { movements, items } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | MovementType>('ALL');

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (typeFilter !== 'ALL' && m.type !== typeFilter) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        m.itemName.toLowerCase().includes(q) ||
        m.barcode.toLowerCase().includes(q) ||
        m.performedBy.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        (m.reference && m.reference.toLowerCase().includes(q))
      );
    });
  }, [movements, searchQuery, typeFilter]);

  const counts = useMemo(() => {
    let entradas = 0;
    let salidas = 0;
    let ajustes = 0;
    movements.forEach((m) => {
      if (m.type === 'ENTRADA') entradas += m.quantity;
      if (m.type === 'SALIDA') salidas += m.quantity;
      if (m.type === 'AJUSTE') ajustes++;
    });
    return { entradas, salidas, ajustes };
  }, [movements]);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-150">
      
      {/* Overview Stat Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Entradas</span>
          <p className="text-lg font-black text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowDownLeft className="w-4 h-4 shrink-0" />
            +{counts.entradas.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500">Unidades ingresadas</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Salidas</span>
          <p className="text-lg font-black text-rose-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4 shrink-0" />
            -{counts.salidas.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500">Unidades despachadas</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Movimientos</span>
          <p className="text-lg font-black text-white mt-1">
            {movements.length}
          </p>
          <span className="text-[10px] text-slate-500">Registros en historial</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por artículo, motivo, responsable o referencia..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
              typeFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('ENTRADA')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
              typeFilter === 'ENTRADA'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border border-slate-800'
            }`}
          >
            + Entradas
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('SALIDA')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
              typeFilter === 'SALIDA'
                ? 'bg-rose-600 text-white font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
            }`}
          >
            - Salidas
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('AJUSTE')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
              typeFilter === 'AJUSTE'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-blue-300 border border-slate-800'
            }`}
          >
            = Ajustes
          </button>
        </div>
      </div>

      {/* Movements Stream */}
      {filteredMovements.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">Sin movimientos encontrados</h3>
          <p className="text-xs text-slate-400 mt-1">
            Usa el botón de Escáner o los botones rápidos para registrar operaciones.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredMovements.map((mov) => {
            const isEntry = mov.type === 'ENTRADA';
            const isExit = mov.type === 'SALIDA';
            const isAdjust = mov.type === 'AJUSTE';

            return (
              <div
                key={mov.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
              >
                <div className="flex items-start gap-3">
                  {/* Badge Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isEntry
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : isExit
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {isEntry && <ArrowDownLeft className="w-5 h-5" />}
                    {isExit && <ArrowUpRight className="w-5 h-5" />}
                    {isAdjust && <RefreshCw className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isEntry
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isExit
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        {mov.type}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {mov.barcode}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{mov.itemName}</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {mov.reason} {mov.reference && <span className="text-slate-400 font-mono">({mov.reference})</span>}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(mov.timestamp).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <User className="w-3 h-3 text-slate-500" />
                        {mov.performedBy} ({mov.performedByRole})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stock Delta Details */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80 shrink-0">
                  <span
                    className={`text-lg font-black font-mono ${
                      isEntry ? 'text-emerald-400' : isExit ? 'text-rose-400' : 'text-blue-400'
                    }`}
                  >
                    {isEntry ? `+${mov.quantity}` : isExit ? `-${mov.quantity}` : `${mov.quantity}`}
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono text-right">
                    Stock: {mov.previousStock} → <span className="font-bold text-white">{mov.newStock}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
