import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { masterApi, Vendor } from '../../master/api/masterApi'
import { procurementApi } from '../api/procurementApi'
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Trash2, Plus, Layers } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SparePurchasePage() {
    const navigate = useNavigate()
    const [vendorId, setVendorId] = useState<string>('')
    const [files, setFiles] = useState<File[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [ocrState, setOcrState] = useState<'idle' | 'uploading' | 'processing' | 'extracting' | 'matching' | 'ready'>('idle')

    const { data: vendors = [] } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => masterApi.getVendors(),
    })

    const activeVendors = vendors.filter(
        (v: Vendor) => !v.is_deleted && v.is_active !== false
    )

    const validateAndAddFiles = (newFiles: FileList | File[]) => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
        const added: File[] = []
        let invalidCount = 0

        Array.from(newFiles).forEach((f) => {
            if (!validTypes.includes(f.type)) {
                invalidCount++
            } else {
                // Avoid duplicate by name and size
                const exists = files.some(existing => existing.name === f.name && existing.size === f.size)
                if (!exists) {
                    added.push(f)
                }
            }
        })

        if (invalidCount > 0) {
            toast.error(`${invalidCount} file(s) ignored. Only PDF, JPG, and PNG are supported.`)
        }

        if (added.length > 0) {
            setFiles(prev => [...prev, ...added])
            toast.success(`Added ${added.length} page(s)/file(s)`)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndAddFiles(e.target.files)
            e.target.value = ''
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndAddFiles(e.dataTransfer.files)
        }
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleUpload = async () => {
        if (!vendorId) {
            toast.error('Please select a vendor first')
            return
        }
        if (files.length === 0) {
            toast.error('Please select at least one invoice file/page')
            return
        }

        setIsUploading(true)
        setOcrState('uploading')

        try {
            // Simulated stage progression to communicate OCR phases
            setTimeout(() => setOcrState('processing'), 1000)
            setTimeout(() => setOcrState('extracting'), 2200)
            setTimeout(() => setOcrState('matching'), 3500)

            const formData = new FormData()
            formData.append('vendor_id', vendorId)
            
            // Append all files under 'files' key, and first file under 'file' for backwards compatibility
            files.forEach((f) => {
                formData.append('files', f)
            })
            if (files.length > 0) {
                formData.append('file', files[0])
            }

            const response = await procurementApi.uploadOcrInvoice(formData)
            
            setOcrState('ready')
            toast.success('All invoice pages accumulated and processed successfully')
            
            setTimeout(() => {
                navigate(`/procurement/spares/${response.spare_purchase_id}`)
            }, 1200)

        } catch (error: unknown) {
            console.error('OCR Upload error', error)
            setOcrState('idle')
            const axiosError = error as AxiosError<{ detail?: string }>;
            toast.error(axiosError.response?.data?.detail || 'Failed to process invoice')
        } finally {
            setIsUploading(false)
        }
    }

    const totalBytes = files.reduce((acc, f) => acc + f.size, 0)

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/procurement')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">New Purchase Receipt (OCR)</h1>
                    <p className="text-gray-500">Accumulate single or multi-page invoices & photos into one consolidated receipt</p>
                </div>
            </div>

            <div className="card space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor <span className="text-red-500">*</span></label>
                    <select 
                        value={vendorId} 
                        onChange={(e) => setVendorId(e.target.value)} 
                        className="input max-w-md" 
                        disabled={isUploading}
                    >
                        <option value="">Select Vendor</option>
                        {activeVendors.map((v: Vendor) => (
                            <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                        ))}
                    </select>
                </div>

                {/* Dropzone */}
                <div 
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${
                        files.length > 0 ? 'border-primary-400 bg-primary-50/30' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    <Upload className="w-10 h-10 text-primary-600 mb-2" />
                    <p className="text-base font-semibold text-gray-900">
                        {files.length === 0 ? 'Click or drag files here to upload' : 'Drag more invoice pages / photos here'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Upload multi-page PDFs or multiple images (front/back photos, continuation sheets). They will be accumulated into one purchase.
                    </p>
                    
                    <input 
                        type="file" 
                        className="hidden" 
                        id="file-upload" 
                        multiple
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    <label 
                        htmlFor="file-upload" 
                        className="mt-4 btn btn-outline btn-sm cursor-pointer flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        {files.length === 0 ? 'Browse Invoices / Photos' : 'Add More Files / Pages'}
                    </label>
                </div>

                {/* Selected Files List */}
                {files.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                            <span className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-primary-600" />
                                Invoice Pages & Attachments ({files.length} {files.length === 1 ? 'file' : 'files'} • {(totalBytes / 1024 / 1024).toFixed(2)} MB)
                            </span>
                            {!isUploading && (
                                <button 
                                    onClick={() => setFiles([])}
                                    className="text-xs text-red-600 hover:text-red-700 underline"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                            {files.map((f, idx) => {
                                const isPdf = f.type === 'application/pdf'
                                return (
                                    <div 
                                        key={`${f.name}-${idx}`} 
                                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg flex-shrink-0">
                                                {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                                            </div>
                                            <div className="truncate">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                                        Page {idx + 1}
                                                    </span>
                                                    <p className="text-sm font-medium text-gray-900 truncate" title={f.name}>
                                                        {f.name}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {(f.size / 1024).toFixed(0)} KB • {isPdf ? 'PDF Document' : 'Image'}
                                                </p>
                                            </div>
                                        </div>
                                        {!isUploading && (
                                            <button 
                                                onClick={() => removeFile(idx)}
                                                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                                title="Remove this page"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Progress Status */}
                {ocrState !== 'idle' && (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary-600" />
                            Multi-Page OCR & Consolidation Pipeline
                        </h4>
                        <div className="space-y-4">
                            <Step 
                                label={`Uploading ${files.length} document page(s)...`} 
                                status={ocrState === 'uploading' ? 'loading' : 'done'} 
                            />
                            <Step 
                                label="Processing Document Geometry & Multi-Page Vision OCR..." 
                                status={['idle', 'uploading'].includes(ocrState) ? 'pending' : ocrState === 'processing' ? 'loading' : 'done'} 
                            />
                            <Step 
                                label="Accumulating Line Items, GSTINs, IRN, HSN & Tax Breakdown..." 
                                status={['idle', 'uploading', 'processing'].includes(ocrState) ? 'pending' : ocrState === 'extracting' ? 'loading' : 'done'} 
                            />
                            <Step 
                                label="Matching OEM Part Codes with Spare Inventory Master..." 
                                status={['idle', 'uploading', 'processing', 'extracting'].includes(ocrState) ? 'pending' : ocrState === 'matching' ? 'loading' : 'done'} 
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-xs text-gray-500">
                        {files.length > 0 ? `${files.length} file(s) will be accumulated into 1 unified purchase` : 'No files selected'}
                    </p>
                    <button 
                        className="btn btn-primary min-w-[170px]"
                        disabled={files.length === 0 || !vendorId || isUploading}
                        onClick={handleUpload}
                    >
                        {isUploading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Processing OCR...
                            </span>
                        ) : `Process ${files.length > 1 ? `All ${files.length} Pages` : 'Invoice'}`}
                    </button>
                </div>
            </div>
            
            <div className="mt-8 bg-blue-50 text-blue-900 p-4 rounded-xl flex items-start gap-3 border border-blue-200">
                <AlertCircle className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
                <div className="text-sm">
                    <h4 className="font-semibold text-blue-900">Consolidated Multi-Page & GST Compliance Processing</h4>
                    <p className="mt-1 text-blue-800">
                        • <strong>Multiple Pages & Images:</strong> If an invoice has multiple pages or photos, upload them all together. The OCR engine merges all pages and line items into a single purchase receipt.
                    </p>
                    <p className="mt-1 text-blue-800">
                        • <strong>Complete Data Capture:</strong> We extract and structure GSTINs (Supplier & Buyer), PAN numbers, E-Invoice IRN, Date/Time of Supply, Incoterms, Dispatch Plant, Sales Office, Bank Virtual Account, HSN Codes, GST rates (18%), and exact tax amounts without omitting any compliance detail.
                    </p>
                </div>
            </div>
        </div>
    )
}

function Step({ label, status }: { label: string, status: 'pending' | 'loading' | 'done' }) {
    return (
        <div className="flex items-center gap-3">
            {status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-gray-200" />}
            {status === 'loading' && <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />}
            {status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            <span className={`text-sm ${status === 'pending' ? 'text-gray-400' : status === 'loading' ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>
                {label}
            </span>
        </div>
    )
}
