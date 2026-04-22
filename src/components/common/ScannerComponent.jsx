import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ShieldAlert, CheckCircle, AlertCircle, ScanLine } from 'lucide-react';

// ── Beep via Web Audio API ───────────────────────────────────────────────────
function playBeep(type = 'ok') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = type === 'ok' ? 880 : 440;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
}

// ── Parsear código (antes del *, $*, |) ─────────────────────────────────────
function parseCode(raw) {
  if (!raw) return '';
  return raw.split('$*')[0].split('|')[0].split('*')[0].trim().toUpperCase();
}

export default function ScannerComponent({ onScan, onClose, scannedCodes = [] }) {
  const scannedSet     = useRef(new Set(scannedCodes));
  const lastDetected   = useRef(null);
  const scannerRef     = useRef(null);
  const onScanRef      = useRef(onScan); // siempre apunta a la última versión de onScan

  const [status,     setStatus]     = useState('starting');
  const [error,      setError]      = useState(null);
  const [flash,      setFlash]      = useState(null);
  const [recentList, setRecentList] = useState([]);
  const [scanCount,  setScanCount]  = useState(0);
  const [dupCode,    setDupCode]    = useState(null);

  // Mantener onScanRef y scannedSet actualizados sin reiniciar el escáner
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { scannedSet.current = new Set(scannedCodes); }, [scannedCodes]);

  // Callback de detección — definido dentro del effect para captura correcta
  useEffect(() => {
    let cancelled = false;
    let scanner   = null;

    const onDetected = (rawText) => {
      if (cancelled) return;
      const code = parseCode(rawText);
      if (!code) return;
      if (lastDetected.current === code) return;

      if (scannedSet.current.has(code)) {
        // Duplicado
        lastDetected.current = code;
        setFlash('dup');
        setDupCode(code);
        playBeep('dup');
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
        setTimeout(() => { lastDetected.current = null; setFlash(null); }, 2000);
        return;
      }

      // Nuevo ✅
      lastDetected.current = code;
      scannedSet.current.add(code);
      setFlash('ok');
      setDupCode(null);
      setScanCount(c => c + 1);
      setRecentList(prev => [code, ...prev].slice(0, 3));
      playBeep('ok');
      if (navigator.vibrate) navigator.vibrate([60]);
      onScanRef.current(code);
      setTimeout(() => { lastDetected.current = null; setFlash(null); }, 1500);
    };

    const start = async () => {
      if (!window.isSecureContext) {
        setError('Se requiere HTTPS para usar la cámara.');
        setStatus('error');
        return;
      }

      try {
        scanner = new Html5Qrcode('qr-fullscreen-reader', { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          onDetected,
          () => {}
        );

        if (!cancelled) setStatus('running');
        else { try { await scanner.stop(); } catch (_) {} }

      } catch (err) {
        if (cancelled) return;
        const msg = String(err?.message || err);
        setError(
          msg.includes('NotAllowed') || msg.includes('ermission')
            ? 'Permiso de cámara denegado. Habilitalo en ajustes del navegador.'
            : msg.includes('NotFound')
            ? 'No se encontró cámara en este dispositivo.'
            : 'Error al iniciar cámara: ' + msg
        );
        setStatus('error');
      }
    };

    start();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        try {
          const s = scannerRef.current;
          scannerRef.current = null;
          s.stop().then(() => {
            try { s.clear(); } catch (_) {}
            const el = document.getElementById('qr-fullscreen-reader');
            if (el) el.innerHTML = '';
          }).catch(() => {});
        } catch (_) {}
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ touchAction: 'none' }}>

      {/* Flash pantalla completa */}
      {flash && (
        <div
          className="absolute inset-0 z-30 pointer-events-none"
          style={{
            backgroundColor: flash === 'ok'
              ? 'rgba(34,197,94,0.35)'
              : 'rgba(251,146,60,0.45)',
            transition: 'background-color 0.1s',
          }}
        />
      )}

      {/* Header flotante */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-6 pb-4"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }}
      >
        <div className="flex items-center gap-2">
          <ScanLine size={20} className="text-white" />
          <span className="text-white font-bold">Escanear Código</span>
        </div>
        <div className="flex items-center gap-3">
          {scanCount > 0 && (
            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              {scanCount} {scanCount === 1 ? 'escaneado' : 'escaneados'}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* Spinner */}
      {status === 'starting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-300 text-sm">Iniciando cámara...</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black p-8">
          <ShieldAlert size={48} className="text-red-400" />
          <p className="text-red-300 text-sm font-semibold text-center">{error}</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl border border-white/20">
            Cerrar
          </button>
        </div>
      )}

      {/* Visor — siempre en el DOM */}
      <div id="qr-fullscreen-reader" className="w-full h-full" style={{ opacity: status === 'running' ? 1 : 0 }} />

      {/* Overlays sobre el visor */}
      {status === 'running' && (
        <>
          {/* Marco custom */}
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {[
                'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
                'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
                'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
                'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-8 h-8 ${cls} ${
                  flash === 'ok' ? 'border-green-400' :
                  flash === 'dup' ? 'border-orange-400' : 'border-white'
                } transition-colors duration-100`} />
              ))}
              {/* Línea de escaneo */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
                style={{ animation: 'scan-line 2s ease-in-out infinite' }}
              />
            </div>
          </div>

          {/* Panel inferior */}
          <div
            className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-8 pt-6"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
          >
            {recentList.length > 0 && (
              <div className="flex gap-2 justify-center flex-wrap mb-3">
                {recentList.map((code, i) => (
                  <span key={i} className={`flex items-center gap-1 text-xs font-mono font-bold px-3 py-1.5 rounded-full ${
                    i === 0 ? 'bg-green-500/90 text-white' : 'bg-white/15 text-white/60'
                  }`}>
                    {i === 0 && <CheckCircle size={11} />}
                    {code}
                  </span>
                ))}
              </div>
            )}

            {flash === 'dup' && dupCode && (
              <div className="flex items-center justify-center gap-2 mb-3 bg-orange-500/80 backdrop-blur-sm rounded-xl px-4 py-2">
                <AlertCircle size={15} className="text-white" />
                <span className="text-white text-sm font-bold">
                  Ya escaneado: <span className="font-mono">{dupCode}</span>
                </span>
              </div>
            )}

            <p className="text-white/50 text-xs text-center">
              Apuntá la cámara al código de barras o QR
            </p>
          </div>
        </>
      )}

      <style>{`
        @keyframes scan-line {
          0%   { top: 8px; opacity: 1; }
          48%  { top: calc(100% - 8px); opacity: 1; }
          50%  { top: calc(100% - 8px); opacity: 0; }
          52%  { top: 8px; opacity: 0; }
          54%  { top: 8px; opacity: 1; }
          100% { top: 8px; opacity: 1; }
        }
        #qr-fullscreen-reader__scan_region > img,
        #qr-fullscreen-reader__scan_region > svg,
        #qr-shaded-region,
        #qr-fullscreen-reader__scan_region > div { display: none !important; }
        #qr-fullscreen-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
