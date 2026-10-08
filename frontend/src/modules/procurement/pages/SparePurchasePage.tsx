import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { masterApi } from '../../master/api/masterApi'
import { procurementApi } from '../api/procurementApi'
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SparePurchasePage() {
    const navigate = useNavigate()
    const [vendorId, setVendorId] = useState<string>('')
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [ocrState, setOcrState] = useState<'idle' | 'uploading' | 'processing' | 'extracting' | 'matching' | 'ready'>('idle')

    const { data: vendors = [] } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => masterApi.getVendors(),
    })

    const activeVendors = vendors.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO(Phase1.1 Baseline): Legacy warning
        (v: any) => !v.is_deleted && v.is_active !== false
    )

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0]
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
            if (!validTypes.includes(selectedFile.type)) {
                toast.error('Invalid file type. Only PDF, JPG, and PNG are supported.')
                return
            }
            setFile(selectedFile)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0]
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
            if (!validTypes.includes(droppedFile.type)) {
                toast.error('Invalid file type. Only PDF, JPG, and PNG are supported.')
                return
            }
            setFile(droppedFile)
        }
    }

    const handleUpload = async () => {
        if (!vendorId) {
            toast.error('Please select a vendor first')
            return
        }
        if (!file) {
            toast.error('Please select an invoice file')
            return
        }

        setIsUploading(true)
        setOcrState('uploading')

        try {
            // Fake animation progression to communicate process
            setTimeout(() => setOcrState('processing'), 800)
            setTimeout(() => setOcrState('extracting'), 1600)
            setTimeout(() => setOcrState('matching'), 2400)

            const formData = new FormData()
            formData.append('vendor_id', vendorId)
            formData.append('file', file)

            const response = await procurementApi.uploadOcrInvoice(formData)
            
            setOcrState('ready')
            toast.success('Invoice processed successfully')
            
            // Wait a moment so user sees the success state
            setTimeout(() => {
                navigate(`/procurement/spares/${response.spare_purchase_id}`)
            }, 1000)

        } catch (error: any) {
            console.error('OCR Upload error', error)
            setOcrState('idle')
            toast.error(error.response?.data?.detail || 'Failed to process invoice')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/procurement')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">New Purchase Receipt</h1>
                    <p className="text-gray-500">Upload vendor invoice for automated OCR processing</p>
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO(Phase1.1 Baseline): Legacy warning
                        {activeVendors.map((v: any) => (
                            <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                        ))}
                    </select>
                </div>

                <div 
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${
                        file ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    {file ? (
                        <div className="flex flex-col items-center">
                            <FileText className="w-12 h-12 text-primary-600 mb-3" />
                            <p className="text-lg font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            {!isUploading && (
                                <button 
                                    onClick={() => setFile(null)} 
                                    className="mt-4 text-sm text-red-600 hover:text-red-800"
                                >
                                    Remove File
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-900">Click to upload or drag and drop</p>
                            <p className="text-sm text-gray-500 mt-2">PDF, PNG, JPG up to 10MB</p>
                            <input 
                                type="file" 
                                className="hidden" 
                                id="file-upload" 
                                accept="application/pdf,image/jpeg,image/png"
                                onChange={handleFileChange}
                            />
                            <label 
                                htmlFor="file-upload" 
                                className="mt-6 btn btn-outline cursor-pointer"
                            >
                                Browse Files
                            </label>
                        </>
                    )}
                </div>

                {ocrState !== 'idle' && (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                        <h4 className="font-semibold text-gray-900 mb-4">OCR Processing Status</h4>
                        <div className="space-y-4">
                            <Step 
                                label="Uploading Invoice..." 
                                status={ocrState === 'uploading' ? 'loading' : 'done'} 
                            />
                            <Step 
                                label="Processing Document Structure..." 
                                status={['idle', 'uploading'].includes(ocrState) ? 'pending' : ocrState === 'processing' ? 'loading' : 'done'} 
                            />
                            <Step 
                                label="Extracting Data & Line Items..." 
                                status={['idle', 'uploading', 'processing'].includes(ocrState) ? 'pending' : ocrState === 'extracting' ? 'loading' : 'done'} 
                            />
                            <Step 
                                label="Matching Parts with Master Data..." 
                                status={['idle', 'uploading', 'processing', 'extracting'].includes(ocrState) ? 'pending' : ocrState === 'matching' ? 'loading' : 'done'} 
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                    <button 
                        className="btn btn-primary min-w-[150px]"
                        disabled={!file || !vendorId || isUploading}
                        onClick={handleUpload}
                    >
                        {isUploading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                            </span>
                        ) : 'Process Invoice'}
                    </button>
                </div>
            </div>
            
            <div className="mt-8 bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold">How it works</h4>
                    <p className="text-sm mt-1 text-blue-700">
                        Our intelligent OCR system will extract line items, quantities, and pricing from your vendor invoice.
                        After extraction, you will be able to review the digitized data, resolve any unmatched part codes, 
                        and verify pricing variances before creating the final purchase receipt.
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
