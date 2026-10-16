import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Keyboard, Camera, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

export interface TagScanResult {
  tag_id: number;
  tag_identifier: string;
  tracking_mode: string;
  spare_id: number;
  batch_id?: number;
  serial_id?: number;
  location?: string;
  status: string;
  
  spare_name?: string;
  spare_code?: string;
  batch_number?: string;
  serial_number?: string;
  available_quantity?: number;
  inventory_status?: string;
}

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (tag: TagScanResult) => void;
  title?: string;
}

export default function ScannerModal({ isOpen, onClose, onScanSuccess, title = "Scan Inventory Tag" }: ScannerModalProps) {
  const [mode, setMode] = useState<'hardware' | 'camera'>('hardware');
  const [hardwareInput, setHardwareInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback(async (identifier: string) => {
    if (isProcessingRef.current) return; // Prevent duplicate concurrent processing
    
    const code = identifier.trim();
    if (!code) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      // Call existing Phase 5 API
      const res = await api.get<TagScanResult>(`/inventory/tags/scan/${code}`);
      
      // Handle tag status rules explicitly
      if (res.status === 'REVOKED') {
        setErrorMsg('This inventory tag has been revoked.');
        return;
      }
      
      if (res.status === 'RETIRED') {
        setErrorMsg('This inventory tag is retired.');
        return;
      }
      
      // Proceed on ACTIVE
      toast.success(`Tag Scanned: ${res.tag_identifier}`);
      onScanSuccess(res);
      // Close modal on success (or let parent close it)
      onClose();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      if (axiosError.response?.status === 404) {
        setErrorMsg('Inventory tag not found.');
      } else if (axiosError.response?.status === 403) {
        setErrorMsg('You do not have permission to access this tag.');
      } else {
        setErrorMsg(axiosError.response?.data?.detail || 'An error occurred during scan.');
      }
      // On error, we re-focus the input
      if (mode === 'hardware') {
        setTimeout(() => scanInputRef.current?.focus(), 100);
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setHardwareInput(''); // Clear input for next scan
    }
  }, [mode, onClose, onScanSuccess]);

  useEffect(() => {
    if (isOpen && mode === 'hardware') {
      const timeout = setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isOpen && mode === 'camera') {
      // Delay slightly to ensure modal is rendered
      const timeout = setTimeout(() => {
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
          /* verbose= */ false
        );
        scanner.render(
          (decodedText) => {
            handleScan(decodedText);
          },
          () => {
            // Camera scanner continuously emits errors when no QR is found.
            // We ignore them.
          }
        );
      }, 100);
      
      return () => {
        clearTimeout(timeout);
        if (scanner) {
          scanner.clear().catch(console.error);
        }
      };
    }
  }, [isOpen, mode, handleScan]);

  const handleHardwareKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(e.currentTarget.value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[1050] p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-850/50 p-1 m-4 mb-0 rounded-xl gap-1 flex-shrink-0">
          <button
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              mode === 'hardware'
                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/80 dark:border-slate-700/80'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            onClick={() => setMode('hardware')}
            disabled={isProcessing}
          >
            <Keyboard className="w-4 h-4" />
            Hardware Scanner
          </button>
          <button
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              mode === 'camera'
                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/80 dark:border-slate-700/80'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            onClick={() => setMode('camera')}
            disabled={isProcessing}
          >
            <Camera className="w-4 h-4" />
            Mobile Camera
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">{errorMsg}</p>
            </div>
          )}

          {mode === 'hardware' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ensure your cursor is focused below, then scan the tag with your optical barcode scanner or enter identifier.
              </p>
              
              <div className="relative">
                <input
                  ref={scanInputRef}
                  type="text"
                  className="w-full px-4 py-3 text-base font-mono tracking-wider rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-xs"
                  placeholder="Scan identifier..."
                  value={hardwareInput}
                  onChange={(e) => setHardwareInput(e.target.value)}
                  onKeyDown={handleHardwareKeyDown}
                  disabled={isProcessing}
                  autoComplete="off"
                  autoFocus
                />
                {isProcessing && (
                  <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Allow camera permissions when prompted and aim your device camera at the QR code tag.
              </p>
              
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 min-h-[300px] flex items-center justify-center">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Processing tag verification...</p>
                  </div>
                ) : (
                  <div id="qr-reader" className="w-full"></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
