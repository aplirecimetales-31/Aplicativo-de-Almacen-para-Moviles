import React from 'react';
import {
  Package,
  ArrowUpDown,
  Barcode,
  FileText,
  Users,
  Cloud,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.tsx';

export type ActiveTab = 'inventory' | 'movements' | 'reports';

interface MobileNavigationProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenScanner: () => void;
  onOpenRoleModal: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenScanner,
  onOpenRoleModal,
}) => {
  const { currentRole, currentUser, isCloudConnected } = useInventory();

  return (
    <>
      {/* Top Header App Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md shadow-amber-950/50 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Barcode className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-white tracking-tight">
                  ALMACÉN MÓVIL
                </span>
                <span className="text-[9px] font-black uppercase bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-mono">
                  PRO
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium text-slate-300">
                  {isCloudConnected ? 'Nube Sincronizada' : 'Modo Local'}
                </span>
              </div>
            </div>
          </div>

          {/* User Role Badge & Modal Launcher */}
          <button
            type="button"
            onClick={onOpenRoleModal}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition shadow-sm group"
            title="Cambiar rol o cuenta de usuario"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Rol Activo</p>
              <p className="text-xs font-bold text-white capitalize leading-tight">{currentRole}</p>
            </div>
            <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 sm:hidden">
              {currentRole}
            </span>
          </button>

        </div>
      </header>

      {/* Bottom Thumb-Friendly Touch Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 pb-safe shadow-2xl">
        <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-around relative">
          
          {/* Tab 1: Inventario */}
          <button
            type="button"
            onClick={() => onChangeTab('inventory')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeTab === 'inventory' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Inventario</span>
          </button>

          {/* Tab 2: Movimientos */}
          <button
            type="button"
            onClick={() => onChangeTab('movements')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeTab === 'movements' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpDown className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Movimientos</span>
          </button>

          {/* Central Prominent Scanner Button */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              type="button"
              onClick={onOpenScanner}
              className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 border-2 border-slate-950 flex flex-col items-center justify-center transition active:scale-95 hover:scale-105"
              aria-label="Abrir lector de códigos de barras y QR"
            >
              <Barcode className="w-6 h-6 stroke-[2.5]" />
              <span className="text-[8px] uppercase tracking-wider font-extrabold -mt-0.5">Escanear</span>
            </button>
          </div>

          {/* Tab 3: Reportes PDF */}
          <button
            type="button"
            onClick={() => onChangeTab('reports')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeTab === 'reports' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Reportes PDF</span>
          </button>

          {/* Tab 4: Roles / Personal */}
          <button
            type="button"
            onClick={onOpenRoleModal}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition"
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Roles</span>
          </button>

        </div>
      </nav>
    </>
  );
};
