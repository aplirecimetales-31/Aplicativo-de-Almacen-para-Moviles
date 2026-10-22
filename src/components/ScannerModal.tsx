import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  Camera,
  Flashlight,
  Volume2,
  VolumeX,
  Smartphone,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PackagePlus,
  Barcode,
  QrCode,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.tsx';
import { InventoryItem, MovementType } from '../types.ts';
import { cleanBarcode } from '../utils/inventoryLogic.ts';
import { playScanSuccessSound, playScanErrorSound, triggerHaptic } from '../utils/feedback.ts';
import confetti from 'canvas-confetti';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateItemWithCode?: (code: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateItemWithCode,
}) => {
  const { items, findItemByCode, performMovement, currentUser } = useInventory();

  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [foundItem, setFoundItem] = useState<InventoryItem | null>(null);
  const [isUnknownCode, setIsUnknownCode] = useState(false);

  // Scanner hardware state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);

  // Movement action states
  const [actionType, setActionType] = useState<MovementType>('ENTRADA');
  const [actionQty, setActionQty] = useState<number>(1);
  const [actionReason, setActionReason] = useState<string>('Recepción de almacén');
  const [actionReference, setActionReference] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'qr-reader-viewport';

  // Quick preset test codes for realistic testing
  const demoCodes = [
    { label: 'Tubo Cobre 1/2"', code: '750102030401' },
    { label: 'Cable THW Cal.12', code: '750102030402' },
    { label: 'Placa Acero 304', code: '750102030403' },
    { label: 'Tornillo Grado 5', code: '750102030404' },
    { label: 'Lingote Aluminio', code: '750102030405' },
    { label: 'Discos de Corte', code: '750102030408' },
  ];

  // Initialize or stop scanner when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      stopCameraScanner();
      resetScanState();
      return;
    }

    if (activeTab === 'camera') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }

    return () => {
      stopCameraScanner();
    };
  }, [isOpen, activeTab]);

  const startCameraScanner = async () => {
    setCameraError(null);
    try {
      // Clean previous instance if any
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
      }

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
      ];

      const html5QrCode = new Html5Qrcode(qrRegionId, {
        formatsToSupport,
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleCodeDetected(decodedText);
        },
        () => {
          // Scanning frame callback (no code found in frame)
        }
      );

      setCameraActive(true);

      // Check torch support
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as unknown as { torch?: boolean }).torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setCameraError('Permiso de cámara denegado. Puedes usar la pestaña de Entrada Manual o códigos demo.');
      } else {
        setCameraError('No se pudo acceder a la cámara en este dispositivo. Puedes usar la entrada manual.');
      }
      setCameraActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as MediaTrackConstraintSet],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  const resetScanState = () => {
    setScannedCode(null);
    setFoundItem(null);
    setIsUnknownCode(false);
    setFeedbackMessage(null);
    setActionQty(1);
    setManualCode('');
  };

  const handleCodeDetected = (rawCode: string) => {
    const code = cleanBarcode(rawCode);
    if (!code) return;

    if (soundEnabled) playScanSuccessSound();
    triggerHaptic('success');

    setScannedCode(code);

    const item = findItemByCode(code);
    if (item) {
      setFoundItem(item);
      setIsUnknownCode(false);
      setActionType('ENTRADA');
      setActionReason('Recepción de almacén');
      setFeedbackMessage(null);

      // If continuous mode is on, we don't necessarily stop camera
      if (!continuousMode && html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.pause(true);
      }
    } else {
      setFoundItem(null);
      setIsUnknownCode(true);
      if (soundEnabled) playScanErrorSound();
      triggerHaptic('error');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeDetected(manualCode.trim());
  };

  const executeMovement = async () => {
    if (!foundItem) return;
    setIsSubmitting(true);
    setFeedbackMessage(null);

    const res = await performMovement({
      itemId: foundItem.id,
      type: actionType,
      quantity: actionQty,
      reason: actionReason,
      reference: actionReference || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.7 },
        colors: actionType === 'ENTRADA' ? ['#10b981', '#34d399'] : ['#f59e0b', '#ef4444'],
      });

      setFeedbackMessage({ text: res.message, type: 'success' });

      // Refresh item locally in card
      const updated = items.find((i) => i.id === foundItem.id);
      if (updated) {
        setFoundItem({ ...updated, quantity: res.newStock ?? updated.quantity });
      }

      if (continuousMode) {
        setTimeout(() => {
          resetScanState();
          if (html5QrCodeRef.current && !html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.resume();
          }
        }, 1200);
      }
    } else {
      setFeedbackMessage({ text: res.message, type: 'error' });
    }
  };

  const handleScanNext = () => {
    resetScanState();
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.resume();
      } catch {
        startCameraScanner();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Escáner de Almacén
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  1D / QR
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lector de códigos de barras, cajas y repisas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Silenciar beeps' : 'Activar beeps'}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Alternar sonido"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Cerrar escáner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector & Quick Presets */}
        <div className="px-5 pt-3 pb-2 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                resetScanState();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'camera'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Cámara Móvil
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                stopCameraScanner();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'manual'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Entrada Manual / Pistola
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
            <input
              type="checkbox"
              checked={continuousMode}
              onChange={(e) => setContinuousMode(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-800 border-slate-700"
            />
            <span className="font-medium text-[11px] text-slate-300">Modo Continuo</span>
          </label>
        </div>

        {/* Demo Fast Codes Pill Bar */}
        <div className="px-5 py-2 bg-slate-950/60 border-b border-slate-800/40 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Códigos Demo:
          </span>
          {demoCodes.map((d) => (
            <button
              key={d.code}
              type="button"
              onClick={() => handleCodeDetected(d.code)}
              className="px-2.5 py-1 text-[11px] font-mono bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 border border-slate-700 text-slate-300 rounded-lg whitespace-nowrap transition"
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-8 space-y-4">
          
          {/* CAMERA VIEWPORT */}
          {activeTab === 'camera' && !foundItem && !isUnknownCode && (
            <div className="flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-[340px] rounded-2xl overflow-hidden bg-black border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                
                {/* HTML5 QR Code Mount Node */}
                <div id={qrRegionId} className="w-full h-full" />

                {/* Laser scan animation overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                    {/* Targeting reticle corners */}
                    <div className="flex justify-between w-full">
                      <div className="w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                      <div className="w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                    </div>

                    {/* Animated horizontal laser beam */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse" />

                    <div className="flex justify-between w-full">
                      <div className="w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                      <div className="w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                    </div>
                  </div>
                )}

                {/* Torch control button if supported */}
                {hasTorch && cameraActive && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`absolute bottom-3 right-3 p-2.5 rounded-full backdrop-blur-md shadow-lg transition ${
                      torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-black/60 text-white hover:bg-black/80'
                    }`}
                    aria-label="Linterna"
                  >
                    <Flashlight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {cameraError && (
                <div className="mt-3 p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-200 text-xs flex items-center gap-2 max-w-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p>{cameraError}</p>
                </div>
              )}

              <p className="text-xs text-slate-400 text-center mt-3 max-w-xs">
                Apunta la cámara al código de barras 1D (EAN/UPC/Code128) o código QR del artículo o estantería.
              </p>
            </div>
          )}

          {/* MANUAL CODE INPUT TAB */}
          {activeTab === 'manual' && !foundItem && !isUnknownCode && (
            <div className="max-w-md mx-auto space-y-4 py-2">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label htmlFor="barcode-manual-input" className="block text-xs font-semibold text-slate-300 mb-1">
                    Código de Barras, SKU o QR
                  </label>
                  <div className="relative">
                    <input
                      id="barcode-manual-input"
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Ej: 750102030401 o TUB-COB-050L"
                      autoFocus
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!manualCode.trim()}
                      className="absolute right-2 top-2 bottom-2 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                    >
                      Buscar
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Compatible con pistolas lectoras USB/Bluetooth en modo emulador de teclado.
                  </p>
                </div>
              </form>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  Artículos Frecuentes en Almacén:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.slice(0, 6).map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => handleCodeDetected(it.barcode)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-left transition flex items-center justify-between"
                    >
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-white truncate">{it.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{it.barcode} • {it.location}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-400 shrink-0 ml-2">
                        {it.quantity} {it.unit}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RESULT: PRODUCT FOUND & QUICK ACTIONS */}
          {foundItem && (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-200">
              
              {/* Product Header Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                        {foundItem.sku}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                        {foundItem.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{foundItem.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      Ubicación: <span className="text-slate-200">{foundItem.location}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stock Actual</span>
                    <span className="text-xl font-extrabold text-white">
                      {foundItem.quantity}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">{foundItem.unit}</span>
                  </div>
                </div>

                {foundItem.quantity <= foundItem.minQuantity && (
                  <div className="mt-2.5 p-2 bg-red-950/40 border border-red-800/40 rounded-lg text-red-200 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Nivel crítico: Stock actual menor o igual al mínimo de seguridad ({foundItem.minQuantity}).</span>
                  </div>
                )}
              </div>

              {/* ACTION TYPE BUTTONS (ENTRADA / SALIDA / AJUSTE) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Tipo de Operación a Registrar:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('ENTRADA');
                      setActionReason('Recepción de proveedor');
                    }}
                    className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition ${
                      actionType === 'ENTRADA'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400/40'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    + ENTRADA
                    <span className="text-[9px] font-normal opacity-80">(Recepción)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionType('SALIDA');
                      setActionReason('Despacho a taller/cliente');
                    }}
                    className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition ${
                      actionType === 'SALIDA'
                        ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-950/50 ring-2 ring-rose-400/40'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    - SALIDA
                    <span className="text-[9px] font-normal opacity-80">(Despacho)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionType('AJUSTE');
                      setActionReason('Auditoría física de inventario');
                      setActionQty(foundItem.quantity);
                    }}
                    disabled={currentUser.role === 'operator'}
                    title={currentUser.role === 'operator' ? 'Requiere rol Supervisor' : ''}
                    className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition ${
                      actionType === 'AJUSTE'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-950/50 ring-2 ring-blue-400/40'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    = AJUSTE
                    <span className="text-[9px] font-normal opacity-80">(Auditoría)</span>
                  </button>
                </div>
              </div>

              {/* QUANTITY PICKER & STEPPERS */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    {actionType === 'AJUSTE' ? 'Nuevo Stock Real:' : 'Cantidad a Registrar:'}
                  </label>
                  <span className="text-xs text-amber-400 font-mono font-bold">
                    {actionQty} {foundItem.unit}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActionQty((q) => Math.max(1, q - 1))}
                    className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold text-lg flex items-center justify-center transition active:scale-95"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min={1}
                    value={actionQty}
                    onChange={(e) => setActionQty(Math.max(1, Number(e.target.value) || 1))}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-center text-white font-mono font-extrabold text-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />

                  <button
                    type="button"
                    onClick={() => setActionQty((q) => q + 1)}
                    className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold text-lg flex items-center justify-center transition active:scale-95"
                  >
                    +
                  </button>
                </div>

                {/* Quick Step Preset Buttons */}
                <div className="flex items-center justify-between gap-2 mt-3">
                  {[1, 5, 10, 25, 50].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setActionQty(step)}
                      className="flex-1 py-1.5 text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition"
                    >
                      {step}
                    </button>
                  ))}
                </div>
              </div>

              {/* REASON & REFERENCE FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Motivo / Observación
                  </label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Ej: Recepción OC-891, Despacho obra"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Doc. Referencia (Opcional)
                  </label>
                  <input
                    type="text"
                    value={actionReference}
                    onChange={(e) => setActionReference(e.target.value)}
                    placeholder="Ej: OC-4491, Remisión #12"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* FEEDBACK BANNER */}
              {feedbackMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    feedbackMessage.type === 'success'
                      ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-200'
                      : 'bg-red-950/60 border border-red-800/80 text-red-200'
                  }`}
                >
                  {feedbackMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <p className="font-medium">{feedbackMessage.text}</p>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Escanear Otro
                </button>

                <button
                  type="button"
                  onClick={executeMovement}
                  disabled={isSubmitting}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl text-white shadow-xl transition flex items-center justify-center gap-2 ${
                    actionType === 'ENTRADA'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
                      : actionType === 'SALIDA'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-950'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Guardando...' : `Confirmar ${actionType}`}
                </button>
              </div>
            </div>
          )}

          {/* RESULT: CODE NOT FOUND IN INVENTORY */}
          {isUnknownCode && (
            <div className="bg-slate-950 border border-amber-900/40 rounded-2xl p-5 text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Código no registrado</h3>
                <p className="text-xs text-slate-400 mt-1">
                  El código <span className="text-amber-400 font-mono font-bold">{scannedCode}</span> no coincide con ningún artículo del catálogo actual.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Volver a escanear
                </button>

                {currentUser.role !== 'operator' && onOpenCreateItemWithCode && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreateItemWithCode(scannedCode || '');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <PackagePlus className="w-4 h-4" />
                    Dar de alta nuevo producto con este código
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
