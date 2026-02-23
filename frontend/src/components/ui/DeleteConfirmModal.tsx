import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface DeleteConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (hardDelete: boolean) => void
    itemName: string
    isPending?: boolean
}

export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    isPending = false,
}: DeleteConfirmModalProps) {
    const [isHardDelete, setIsHardDelete] = useState(false)
    const { hasRole } = useAuthStore()
    const canHardDelete = hasRole(['ADMIN', 'DEALER'])

    if (!isOpen) return null

    const handleConfirm = () => {
        onConfirm(isHardDelete)
        setIsHardDelete(false)
    }

    const handleClose = () => {
        setIsHardDelete(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    <p className="text-gray-700">
                        Are you sure you want to delete <span className="font-semibold">"{itemName}"</span>?
                    </p>

                    {canHardDelete && (
                        <label className="flex items-start gap-3 p-3 border border-red-200 bg-red-50 rounded-lg cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isHardDelete}
                                onChange={(e) => setIsHardDelete(e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                            />
                            <div>
                                <span className="text-sm font-semibold text-red-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Permanently delete this record
                                </span>
                                <span className="text-xs text-red-600 block mt-0.5">
                                    This action cannot be undone. The record will be permanently removed from the database.
                                </span>
                            </div>
                        </label>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
                    <button
                        onClick={handleClose}
                        className="btn btn-secondary"
                        disabled={isPending}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`btn ${isHardDelete ? 'btn-danger' : 'btn-primary'}`}
                        disabled={isPending}
                    >
                        {isPending
                            ? 'Deleting...'
                            : isHardDelete
                                ? 'Permanently Delete'
                                : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )
}
