
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sale, DeliveryChecklist, salesApi } from '../api/salesApi'

interface Props {
    sale: Sale
}

export default function PostDeliveryChecklist({ sale }: Props) {
    const queryClient = useQueryClient()
    const [checklist, setChecklist] = useState<Partial<DeliveryChecklist>>({})

    useEffect(() => {
        if (sale.delivery_checklist) {
            setChecklist(sale.delivery_checklist)
        }
    }, [sale.delivery_checklist])

    const updateMutation = useMutation({
        mutationFn: (data: Partial<DeliveryChecklist>) =>
            salesApi.updateChecklist(sale.sale_id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sale', String(sale.sale_id)] })
            alert("Checklist updated successfully")
        },
        onError: (error: any) => {
            alert("Failed to update checklist: " + (error?.response?.data?.detail || error.message))
        }
    })

    const handleChange = (field: keyof DeliveryChecklist, value: any) => {
        setChecklist(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        updateMutation.mutate(checklist)
    }

    const sections = [
        {
            title: "Insurance",
            checked: checklist.insurance_completed,
            onCheck: (v: boolean) => handleChange('insurance_completed', v),
            details: checklist.insurance_details,
            onDetails: (v: string) => handleChange('insurance_details', v),
            detailsLabel: "Policy Details"
        },
        {
            title: "Subsidy Portal",
            checked: checklist.subsidy_completed,
            onCheck: (v: boolean) => handleChange('subsidy_completed', v),
            details: checklist.subsidy_details,
            onDetails: (v: string) => handleChange('subsidy_details', v),
            detailsLabel: "Application Details"
        },
        {
            title: "RTO Portal",
            checked: checklist.rto_completed,
            onCheck: (v: boolean) => handleChange('rto_completed', v),
            details: checklist.rto_details,
            onDetails: (v: string) => handleChange('rto_details', v),
            detailsLabel: "Registration Details"
        },
        {
            title: "Celex Portal (Number Plate)",
            checked: checklist.celex_plate_ordered,
            onCheck: (v: boolean) => handleChange('celex_plate_ordered', v),
            details: checklist.celex_details,
            onDetails: (v: string) => handleChange('celex_details', v),
            detailsLabel: "Order Details"
        },
        {
            title: "Celex Portal (Subsidy Papers)",
            checked: checklist.celex_subsidy_completed,
            onCheck: (v: boolean) => handleChange('celex_subsidy_completed', v),
            // No details for this one specifically requested, but maybe share celex_details? 
            // Or leave details specific to this task out if not needed.
            // Let's hide details input for this one if unnecessary.
            details: undefined,
            onDetails: undefined,
        }
    ]

    return (
        <div className="card mt-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">Post-Delivery Compliance</h2>
            <p className="text-sm text-gray-600 mb-4">
                Track optional compliance tasks. These do not block delivery.
            </p>

            <div className="space-y-6">
                {sections.map((section, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center gap-3 mb-3">
                            <input
                                type="checkbox"
                                checked={!!section.checked}
                                onChange={(e) => section.onCheck(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className={`font-medium ${section.checked ? 'text-green-700' : 'text-gray-700'}`}>
                                {section.title}
                            </span>
                            {section.checked && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Completed</span>}
                        </div>
                        {section.onDetails && (
                            <div className="ml-8">
                                <label className="text-xs text-gray-500 block mb-1">{section.detailsLabel}</label>
                                <textarea
                                    value={section.details || ''}
                                    onChange={(e) => section.onDetails!(e.target.value)}
                                    className="w-full text-sm p-2 border rounded"
                                    placeholder={`Enter ${section.detailsLabel.toLowerCase()}...`}
                                    rows={2}
                                />
                            </div>
                        )}
                    </div>
                ))}

                <div className="p-4 bg-gray-50 rounded border border-gray-200">
                    <h3 className="font-medium mb-3">Number Plate Fixation</h3>
                    <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-600">Date of Fixation:</label>
                        <input
                            type="date"
                            value={checklist.plate_fixation_date || ''}
                            onChange={(e) => handleChange('plate_fixation_date', e.target.value)}
                            className="p-2 border rounded"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="btn btn-primary"
                    >
                        {updateMutation.isPending ? 'Saving...' : 'Save Compliance Details'}
                    </button>
                </div>
            </div>
        </div>
    )
}
