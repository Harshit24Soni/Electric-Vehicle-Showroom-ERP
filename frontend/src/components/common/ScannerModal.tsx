import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Keyboard, Camera, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
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
  const [errorMsg, setErrorMsg] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

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
          (errorMessage) => {
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
  }, [isOpen, mode]);

  const handleScan = async (identifier: string) => {
    if (isProcessing) return; // Prevent duplicate concurrent processing
    
    const code = identifier.trim();
    if (!code) return;

    setIsProcessing(true);
    setErrorMsg('');

    try {
      // Call existing Phase 5 API
      const res = await api.get<TagScanResult>(`/inventory/tags/scan/${code}`);
      
      // Handle tag status rules explicitly
      if (res.status === 'REVOKED') {
        setErrorMsg('This inventory tag has been revoked.');
        setIsProcessing(false);
        return;
      }
      
      if (res.status === 'RETIRED') {
        setErrorMsg('This inventory tag is retired.');
        setIsProcessing(false);
        return;
      }
      
      // Proceed on ACTIVE
      toast.success(`Tag Scanned: ${res.tag_identifier}`);
      onScanSuccess(res);
      // Close modal on success (or let parent close it)
      onClose();
    } catch (error: any) {
      if (error.response?.status === 404) {
        setErrorMsg('Inventory tag not found.');
      } else if (error.response?.status === 403) {
        setErrorMsg('You do not have permission to access this tag.');
      } else {
        setErrorMsg(error.response?.data?.detail || 'An error occurred during scan.');
      }
      // On error, we re-focus the input
      if (mode === 'hardware') {
        setTimeout(() => scanInputRef.current?.focus(), 100);
      }
    } finally {
      setIsProcessing(false);
      setHardwareInput(''); // Clear input for next scan
    }
  };

  const handleHardwareKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(e.currentTarget.value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b flex-shrink-0">
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'hardware' ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setMode('hardware')}
            disabled={isProcessing}
          >
            <Keyboard className="w-4 h-4" />
            Hardware Scanner
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'camera' ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setMode('camera')}
            disabled={isProcessing}
          >
            <Camera className="w-4 h-4" />
            Mobile Camera
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          {mode === 'hardware' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Ensure your cursor is in the field below, then scan the tag with your USB/Bluetooth scanner.
              </p>
              
              <div className="relative">
                <input
                  ref={scanInputRef}
                  type="text"
                  className="input w-full pl-4 pr-10 py-3 text-lg font-mono tracking-wider"
                  placeholder="Scan identifier..."
                  value={hardwareInput}
                  onChange={(e) => setHardwareInput(e.target.value)}
                  onKeyDown={handleHardwareKeyDown}
                  disabled={isProcessing}
                  autoComplete="off"
                  autoFocus
                />
                {isProcessing && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">
                Allow camera permissions when prompted and point your camera at the tag.
              </p>
              
              <div className="relative rounded-lg overflow-hidden border bg-gray-100 min-h-[300px] flex items-center justify-center">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                    <p className="text-sm font-medium text-gray-600">Processing tag...</p>
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
