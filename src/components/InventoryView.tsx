import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  AlertTriangle,
  Barcode,
  Layers,
  ArrowUpDown,
  Package,
  CheckCircle2,
  QrCode,
  DollarSign,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.tsx';
import { InventoryItem } from '../types.ts';
import { isLowStock, calculateInventoryValuation } from '../utils/inventoryLogic.ts';

interface InventoryViewProps {
  onSelectItem: (item: InventoryItem) => void;
  onOpenCreateItem: () => void;
  onOpenScanner: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  onSelectItem,
  onOpenCreateItem,
  onOpenScanner,
}) => {
  const { items, performMovement, currentRole } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'in_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc' | 'updated'>('name');

  // Categories list extracted dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return ['TODAS', ...Array.from(set)];
  }, [items]);

  const lowStockCount = useMemo(() => {
    return items.filter((it) => isLowStock(it.quantity, it.minQuantity)).length;
  }, [items]);

  const totalValuation = useMemo(() => {
    return calculateInventoryValuation(items);
  }, [items]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Query filter
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        it.name.toLowerCase().includes(q) ||
        it.sku.toLowerCase().includes(q) ||
        it.barcode.toLowerCase().includes(q) ||
        it.location.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q);

      if (!matchQuery) return false;

      // Category filter
      if (selectedCategory !== 'TODAS' && it.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'low') {
        return isLowStock(it.quantity, it.minQuantity);
      }
      if (statusFilter === 'in_stock') {
        return it.quantity > 0;
      }
      if (statusFilter === 'out_of_stock') {
        return it.quantity === 0;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock_asc') return a.quantity - b.quantity;
      if (sortBy === 'stock_desc') return b.quantity - a.quantity;
      if (sortBy === 'updated') return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      return 0;
    });
  }, [items, searchQuery, selectedCategory, statusFilter, sortBy]);

  const handleQuickAdd = async (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    await performMovement({
      itemId: item.id,
      type: 'ENTRADA',
      quantity: 1,
      reason: 'Recepción rápida de 1 unidad desde inventario',
    });
  };

  const handleQuickSubtract = async (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    if (item.quantity <= 0) return;
    await performMovement({
      itemId: item.id,
      type: 'SALIDA',
      quantity: 1,
      reason: 'Despacho rápido de 1 unidad desde inventario',
    });
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-150">
      
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por artículo, SKU, código de barras o ubicación..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentRole !== 'operator' && (
            <button
              type="button"
              onClick={onOpenCreateItem}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Artículo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenScanner}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition"
            title="Abrir Escáner"
          >
            <Barcode className="w-4 h-4" />
            <span className="hidden sm:inline">Escanear</span>
          </button>
        </div>
      </div>

      {/* Filter Chips & Stock Alert Pills */}
      <div className="space-y-2">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('low')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
              statusFilter === 'low'
                ? 'bg-rose-500 text-white font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Stock Bajo ({lowStockCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'in_stock'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border border-slate-800'
            }`}
          >
            En Existencia
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'out_of_stock'
                ? 'bg-slate-700 text-white font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Agotados
          </button>

          {/* Sort Selector Dropdown */}
          <div className="ml-auto pl-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="name">Nombre (A-Z)</option>
              <option value="stock_asc">Menor Stock</option>
              <option value="stock_desc">Mayor Stock</option>
              <option value="updated">Reciente</option>
            </select>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">No se encontraron artículos</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Prueba ajustando el filtro de búsqueda o da de alta un nuevo producto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const isCritical = isLowStock(item.quantity, item.minQuantity);
            const stockPct = item.minQuantity > 0 ? Math.min(100, Math.round((item.quantity / (item.minQuantity * 2)) * 100)) : 100;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 shadow-md transition cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
              >
                <div>
                  {/* Top tags row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold bg-slate-950 text-amber-400 border border-slate-800 px-2 py-0.5 rounded-md">
                        {item.sku}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800/80 truncate max-w-[130px]">
                        {item.category}
                      </span>
                    </div>

                    {isCritical ? (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Bajo
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    )}
                  </div>

                  {/* Item Name */}
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition line-clamp-2">
                    {item.name}
                  </h3>

                  {/* Location & Barcode */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-2 font-mono">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Layers className="w-3 h-3 text-slate-500" />
                      {item.location || 'Sin ubicación'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Barcode className="w-3 h-3 text-slate-500" />
                      {item.barcode}
                    </span>
                  </div>
                </div>

                {/* Stock Gauge & Quick Stepper */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span className="text-slate-400 text-[11px]">Existencias:</span>
                      <span className="font-extrabold text-white font-mono text-sm">
                        {item.quantity}{' '}
                        <span className="text-[11px] font-normal text-slate-400">{item.unit}</span>
                      </span>
                    </div>

                    {/* Stock level bar */}
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCritical ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${stockPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick +/- Action Stepper */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleQuickSubtract(e, item)}
                      disabled={item.quantity <= 0}
                      className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-rose-600 disabled:opacity-40 disabled:hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center transition active:scale-95"
                      title="Despachar -1 unidad"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(e, item)}
                      className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center transition active:scale-95"
                      title="Recibir +1 unidad"
                    >
                      +1
                    </button>
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
