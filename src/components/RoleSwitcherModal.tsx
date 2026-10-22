import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Users,
  LogIn,
  LogOut,
  Cloud,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.tsx';
import { UserRole } from '../types.ts';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    currentRole,
    switchRole,
    firebaseUser,
    loginWithGoogle,
    logout,
    isCloudConnected,
    users,
  } = useInventory();

  if (!isOpen) return null;

  const rolesConfig: Array<{
    role: UserRole;
    title: string;
    description: string;
    badgeColor: string;
    permissions: string[];
  }> = [
    {
      role: 'operator',
      title: 'Operario / Almacenista',
      description: 'Diseñado para trabajo táctico y dinámico en pasillos con escáner.',
      badgeColor: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
      permissions: [
        'Lectura y escaneo de códigos de barras y QR',
        'Registro ágil de Entradas y Salidas de material',
        'Consulta rápida de existencias y ubicación física',
      ],
    },
    {
      role: 'supervisor',
      title: 'Supervisor de Operaciones',
      description: 'Control de inventario, auditorías de conteo y altas de catálogo.',
      badgeColor: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
      permissions: [
        'Todas las funciones del Operario',
        'Alta y modificación de artículos en catálogo',
        'Ajustes de inventario y registro de mermas',
        'Generación y descarga de Reportes Mensuales PDF',
      ],
    },
    {
      role: 'admin',
      title: 'Jefe de Almacén (Administrador)',
      description: 'Acceso irrestricto, gestión de personal, auditoría y borrado.',
      badgeColor: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
      permissions: [
        'Acceso y control total del sistema',
        'Eliminación de artículos y reversión de errores',
        'Gestión de roles y acceso de empleados',
        'Auditoría y exportación de reportes directivos',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Acceso Multiusuario & Roles</h2>
              <p className="text-xs text-slate-400">
                Selecciona el rol activo o inicia sesión con tu cuenta
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

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-8 space-y-4">
          
          {/* Cloud & User Authentication Status */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isCloudConnected
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}
              >
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {firebaseUser ? firebaseUser.email : currentUser.displayName}
                  </span>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      isCloudConnected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isCloudConnected ? 'Nube Sincronizada' : 'Modo Local / Demo'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Rol activo: <span className="text-amber-400 font-semibold uppercase">{currentRole}</span>
                </p>
              </div>
            </div>

            {firebaseUser ? (
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg flex items-center gap-1 transition"
              >
                <LogOut className="w-3.5 h-3.5" /> Salir
              </button>
            ) : (
              <button
                type="button"
                onClick={loginWithGoogle}
                className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center gap-1 transition shadow"
              >
                <LogIn className="w-3.5 h-3.5" /> Conectar Google
              </button>
            )}
          </div>

          {/* Role selector cards */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Cambiar Rol de Operación:
            </span>

            {rolesConfig.map((r) => {
              const isCurrent = currentRole === r.role;
              return (
                <div
                  key={r.role}
                  onClick={() => switchRole(r.role)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    isCurrent
                      ? 'bg-slate-950 border-amber-500/70 ring-2 ring-amber-500/30 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${r.badgeColor}`}>
                        {r.role}
                      </span>
                      <h4 className="text-sm font-bold text-white">{r.title}</h4>
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Activo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mb-2">{r.description}</p>

                  <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Permisos clave:</span>
                    {r.permissions.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition"
          >
            Aceptar y Continuar
          </button>
        </div>

      </div>
    </div>
  );
};
