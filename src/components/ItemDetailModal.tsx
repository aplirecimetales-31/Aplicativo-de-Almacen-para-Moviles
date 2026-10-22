import React, { useState } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Layers,
  Clock,
  User,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Minus,
  CheckCircle2,
  Calendar,
  Share2,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.tsx';
import { InventoryItem, MovementType } from '../types.ts';
import { BarcodeCard } from './BarcodeCard.tsx';
import { isLowStock } from '../utils/inventoryLogic.ts';
import confetti from 'canvas-confetti';

interface ItemDetailModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
}) => {
  const { movements, performMovement, deleteItem, currentUser } = useInventory();

  const [activeTab, setActiveTab] = useState<'info' | 'label' | 'history'>('info');
  const [quickQty, setQuickQty] = useState(1);
  const [quickType, setQuickType] = useState<MovementType>('ENTRADA');
  const [quickReason, setQuickReason] = useState('Recepción rápida');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const itemMovements = movements.filter((m) => m.itemId === item.id);
  const critical = isLowStock(item.quantity, item.minQuantity);
  const totalValuation = (item.quantity || 0) * (item.unitPrice || 0);

  const handleQuickMovement = async (type: MovementType) => {
    setIsSubmitting(true);
    setActionSuccess(null);

    const res = await performMovement({
      itemId: item.id,
      type,
      quantity: quickQty,
      reason: quickReason || `Operación de ${type.toLowerCase()} desde ficha técnica`,
    });

    setIsSubmitting(false);

    if (res.success) {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.6 },
      });
      setActionSuccess(res.message);
      setTimeout(() => setActionSuccess(null), 3500);
    } else {
      alert(res.message);
    }
  };

  const handleDelete = async () => {
    if (confirm(`¿Estás seguro de eliminar "${item.name}" del catálogo del almacén?`)) {
      const res = await deleteItem(item.id);
      if (res.success) {
        onClose();
      } else {
        alert(res.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                {item.sku}
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                {item.category}
              </span>
              {critical && (
                <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800 px-2 py-0.5 rounded-md">
                  Stock Bajo
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-white">{item.name}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'info'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Información & Stock
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('label')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'label'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Código & Etiqueta QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Historial ({itemMovements.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-8 space-y-4">
          
          {/* TAB 1: INFO & QUICK DISPATCH */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stock Disponible</span>
                  <p className="text-2xl font-black text-white mt-0.5">
                    {item.quantity} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Mínimo: {item.minQuantity} {item.unit}</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Precio Unitario</span>
                  <p className="text-2xl font-black text-amber-400 mt-0.5">
                    ${item.unitPrice.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Valuación: ${totalValuation.toLocaleString()}</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ubicación Física</span>
                  <p className="text-xs font-bold text-white mt-1 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                    {item.location || 'Sin asignar'}
                  </p>
                </div>
              </div>

              {item.description && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Notas de Almacén:</span>
                  {item.description}
                </div>
              )}

              {/* Quick Operation Stepper Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Registro Rápido de Stock
                </h4>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-slate-400">Cantidad:</span>
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQuickQty((q) => Math.max(1, q - 1))}
                      className="px-2.5 py-1 text-slate-300 hover:text-white"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quickQty}
                      onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value) || 1))}
                      className="w-14 bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickQty((q) => q + 1)}
                      className="px-2.5 py-1 text-slate-300 hover:text-white"
                    >
                      +
                    </button>
                  </div>

                  <input
                    type="text"
                    value={quickReason}
                    onChange={(e) => setQuickReason(e.target.value)}
                    placeholder="Motivo (ej: Despacho, recepción...)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleQuickMovement('ENTRADA')}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Entrada (+{quickQty})
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleQuickMovement('SALIDA')}
                    className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/40 flex items-center justify-center gap-1.5 transition active:scale-98"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    - Salida (-{quickQty})
                  </button>
                </div>

                {actionSuccess && (
                  <p className="text-xs text-emerald-400 font-medium text-center mt-2.5 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {actionSuccess}
                  </p>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Actualizado: {new Date(item.lastUpdated).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {item.updatedBy || 'Sistema'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: BARCODE & QR CARD */}
          {activeTab === 'label' && (
            <div>
              <BarcodeCard
                barcode={item.barcode}
                sku={item.sku}
                name={item.name}
                location={item.location}
              />
            </div>
          )}

          {/* TAB 3: MOVEMENT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {itemMovements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No hay movimientos registrados para este artículo aún.
                </p>
              ) : (
                itemMovements.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                          m.type === 'ENTRADA'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : m.type === 'SALIDA'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {m.type === 'ENTRADA' ? '+' : m.type === 'SALIDA' ? '-' : '='}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {m.type}: {m.quantity} {item.unit}
                        </p>
                        <p className="text-[10px] text-slate-400">{m.reason} • {m.performedBy}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono font-bold text-slate-200">
                        {m.newStock} {item.unit}
                      </span>
                      <p className="text-[10px] text-slate-500">
                        {new Date(m.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div>
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Artículo
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role !== 'operator' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar Ficha
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition"
            >
              Listo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
