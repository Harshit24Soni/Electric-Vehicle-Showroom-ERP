
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { salesApi } from '../../api/salesApi'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function PrintInvoicePage() {
    const { saleId } = useParams<{ saleId: string }>()

    const { data: sale, isLoading } = useQuery({
        queryKey: ['sale', saleId],
        queryFn: () => salesApi.getSaleDetail(Number(saleId)),
        enabled: !!saleId,
    })

    useEffect(() => {
        if (sale && !isLoading) {
            setTimeout(() => {
                window.print()
            }, 500)
        }
    }, [sale, isLoading])

    if (isLoading) return <div>Loading...</div>
    if (!sale) return <div>Sale not found</div>

    return (
        <div className="p-8 max-w-4xl mx-auto bg-white text-black font-sans">
            <div className="border border-gray-800 p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wide">Tax Invoice</h1>
                        <p className="text-sm mt-2">Original for Recipient</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold">Electric Vehicle Showroom</h2>
                        <p>123 EV Street, Green City</p>
                        <p>State, ZIP Code</p>
                        <p>GSTIN: 29ABCDE1234F1Z5</p>
                        <p>Phone: +91 98765 43210</p>
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="font-bold border-b border-gray-400 mb-2">Billed To:</h3>
                        <p className="font-semibold text-lg">{sale.customer?.name}</p>
                        <p>{sale.customer?.address_line1}, {sale.customer?.address_line2}</p>
                        <p>{sale.customer?.city}, {sale.customer?.state} - {sale.customer?.pincode}</p>
                        <p>Phone: {sale.customer?.primary_phone}</p>
                    </div>
                    <div>
                        <h3 className="font-bold border-b border-gray-400 mb-2">Invoice Details:</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <p>Invoice No:</p>
                            <p className="font-mono font-bold">{sale.invoice_number}</p>
                            <p>Date:</p>
                            <p>{formatDate(sale.sale_date)}</p>
                            <p>Place of Supply:</p>
                            <p>{sale.customer?.state}</p>
                        </div>
                    </div>
                </div>

                {/* Vehicle Details Table */}
                <table className="w-full mb-8 border border-gray-800">
                    <thead>
                        <tr className="bg-gray-200 border-b border-gray-800">
                            <th className="p-2 text-left border-r border-gray-800">Description</th>
                            <th className="p-2 text-left border-r border-gray-800">Chassis No</th>
                            <th className="p-2 text-left border-r border-gray-800">HSN/SAC</th>
                            <th className="p-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 border-r border-gray-800">
                                {sale.vehicle?.model?.brand?.brand_name} {sale.vehicle?.model?.model_name}
                                <br />
                                <span className="text-xs text-gray-600">Color: {sale.vehicle?.color}</span>
                            </td>
                            <td className="p-2 border-r border-gray-800 font-mono">{sale.chassis_no}</td>
                            <td className="p-2 border-r border-gray-800">8711</td>
                            <td className="p-2 text-right">{formatCurrency(sale.total_amount)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-gray-800 font-bold">
                            <td colSpan={3} className="p-2 text-right border-r border-gray-800">Total</td>
                            <td className="p-2 text-right">{formatCurrency(sale.total_amount)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer */}
                <div className="mt-16 flex justify-between items-end">
                    <div className="text-sm">
                        <p>Terms & Conditions:</p>
                        <ul className="list-disc pl-4 mt-1">
                            <li>Goods once sold will not be taken back.</li>
                            <li>Warranty as per manufacturer terms.</li>
                        </ul>
                    </div>
                    <div className="text-center">
                        <p className="font-bold">For Electric Vehicle Showroom</p>
                        <div className="h-16 mt-2"></div>
                        <p>Authorized Signatory</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
