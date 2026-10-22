import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Barcode, Save, Sparkles, Layers, DollarSign } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.tsx';
import { InventoryItem } from '../types.ts';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBarcode?: string;
  editItem?: InventoryItem | null;
}

const CATEGORIES = [
  'Metales & Tubería',
  'Material Eléctrico',
  'Fijación & Tornillería',
  'Soldadura & Consumibles',
  'EPP & Seguridad',
  'Herramientas',
  'Embalaje & Almacén',
  'Materia Prima Reciclada',
  'General',
];

const UNITS = ['piezas', 'kg', 'metros', 'rollos', 'cajas', 'lingotes', 'litros', 'hojas', 'pares'];

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  initialBarcode = '',
  editItem = null,
}) => {
  const { createItem, updateItem } = useInventory();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [minQuantity, setMinQuantity] = useState<number>(5);
  const [unit, setUnit] = useState(UNITS[0]);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [description, setDescription] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setSku(editItem.sku);
      setBarcode(editItem.barcode);
      setCategory(editItem.category || CATEGORIES[0]);
      setLocation(editItem.location || '');
      setQuantity(editItem.quantity);
      setMinQuantity(editItem.minQuantity);
      setUnit(editItem.unit || UNITS[0]);
      setUnitPrice(editItem.unitPrice || 0);
      setDescription(editItem.description || '');
    } else {
      setName('');
      setSku(`SKU-${Math.floor(10000 + Math.random() * 90000)}`);
      setBarcode(initialBarcode || `750${Math.floor(100000000 + Math.random() * 900000000)}`);
      setCategory(CATEGORIES[0]);
      setLocation('Pasillo A - Estante 01');
      setQuantity(20);
      setMinQuantity(5);
      setUnit(UNITS[0]);
      setUnitPrice(15.0);
      setDescription('');
    }
    setError(null);
  }, [editItem, initialBarcode, isOpen]);

  const generateRandomBarcode = () => {
    setBarcode(`750${Math.floor(100000000 + Math.random() * 900000000)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor ingresa el nombre del artículo.');
      return;
    }
    if (!barcode.trim()) {
      setError('El código de barras o QR es obligatorio.');
      return;
    }

    setIsSubmitting(true);

    if (editItem) {
      const res = await updateItem(editItem.id, {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        category,
        location: location.trim(),
        minQuantity: Number(minQuantity) || 0,
        unit,
        unitPrice: Number(unitPrice) || 0,
        description: description.trim(),
      });
      setIsSubmitting(false);
      if (res.success) {
        onClose();
      } else {
        setError(res.message || 'Error al actualizar artículo.');
      }
    } else {
      const res = await createItem({
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        category,
        location: location.trim(),
        quantity: Number(quantity) || 0,
        minQuantity: Number(minQuantity) || 0,
        unit,
        unitPrice: Number(unitPrice) || 0,
        description: description.trim(),
      });
      setIsSubmitting(false);
      if (res.success) {
        onClose();
      } else {
        setError(res.message || 'Error al crear artículo.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editItem ? 'Editar Artículo' : 'Nuevo Artículo en Inventario'}
              </h2>
              <p className="text-xs text-slate-400">
                {editItem ? 'Modificar datos de catálogo' : 'Asignar código de barras, ubicación y stock'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 pb-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre del Artículo / Descripción Comercial *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Tubo de Cobre 1/2 pulgada x 6m"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Código SKU
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU-10293"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Código de Barras / QR *
                </label>
                <button
                  type="button"
                  onClick={generateRandomBarcode}
                  className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3" /> Auto
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="750102030401"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Barcode className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ubicación en Almacén
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Pasillo B - Rack 02"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            {!editItem && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Stock Inicial
                </label>
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Mínimo Seguridad
              </label>
              <input
                type="number"
                min={0}
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Unidad
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Precio Unit. ($)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notas o Especificaciones Técnicas (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Especificaciones, proveedor habitual, calibre o material..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : editItem ? 'Actualizar Artículo' : 'Crear Artículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
