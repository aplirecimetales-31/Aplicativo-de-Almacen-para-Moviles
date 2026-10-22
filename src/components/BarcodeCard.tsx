import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Barcode, Printer, Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface BarcodeCardProps {
  barcode: string;
  sku: string;
  name: string;
  location?: string;
}

export const BarcodeCard: React.FC<BarcodeCardProps> = ({ barcode, sku, name, location }) => {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'qr' | 'barcode'>('qr');

  useEffect(() => {
    if (qrCanvasRef.current && barcode) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        barcode,
        {
          width: 180,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error rendering QR:', error);
        }
      );
    }
  }, [barcode, format]);

  const copyCode = () => {
    navigator.clipboard.writeText(barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!qrCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `etiqueta-${sku || barcode}.png`;
    link.href = qrCanvasRef.current.toDataURL();
    link.click();
  };

  // Generate deterministic 1D barcode lines for display
  const generate1DBars = (code: string) => {
    const bars: boolean[] = [];
    // Start guard
    bars.push(true, false, true);
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const bin = (charCode * 7).toString(2).slice(-6);
      for (const bit of bin) {
        bars.push(bit === '1');
      }
      bars.push(false);
    }
    // Stop guard
    bars.push(true, false, true);
    return bars;
  };

  const barcodeBars = generate1DBars(barcode);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center shadow-lg">
      <div className="flex items-center justify-between w-full mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Etiqueta de Identificación
        </span>
        <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setFormat('qr')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
              format === 'qr' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Código QR
          </button>
          <button
            type="button"
            onClick={() => setFormat('barcode')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
              format === 'barcode' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            Cód. Barras 1D
          </button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-inner flex flex-col items-center justify-center my-2 max-w-full">
        {format === 'qr' ? (
          <div className="flex flex-col items-center">
            <canvas ref={qrCanvasRef} className="rounded-md" />
            <span className="text-slate-900 font-mono text-xs font-bold mt-1 tracking-wider">
              {barcode}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center px-4 py-2">
            <div className="flex items-end h-16 gap-[1.5px] max-w-[260px] overflow-hidden">
              {barcodeBars.map((isBlack, idx) => (
                <div
                  key={idx}
                  className={`${isBlack ? 'bg-slate-950' : 'bg-transparent'} w-[2px] ${
                    idx % 7 === 0 ? 'h-16' : 'h-14'
                  }`}
                />
              ))}
            </div>
            <span className="text-slate-900 font-mono text-xs font-bold mt-1 tracking-widest">
              {barcode}
            </span>
          </div>
        )}

        <div className="text-center mt-2 border-t border-slate-200 pt-1.5 w-full">
          <p className="text-[11px] font-bold text-slate-900 truncate max-w-[220px]">{name}</p>
          <p className="text-[10px] text-slate-600 font-mono">{sku} • {location || 'Almacén Central'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 w-full justify-center">
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        <button
          type="button"
          onClick={downloadQR}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
        >
          <Download className="w-3.5 h-3.5" />
          Descargar PNG
        </button>
      </div>
    </div>
  );
};
