
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { salesApi } from '../../api/salesApi'
import { formatDate } from '@/lib/utils'

export default function PrintChallanPage() {
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
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold uppercase tracking-wide">Delivery Challan</h1>
                    <p className="text-xl font-bold mt-2">Electric Vehicle Showroom</p>
                    <p>123 EV Street, Green City, State - ZIP</p>
                </div>

                {/* Challan Info */}
                <div className="flex justify-between mb-8">
                    <div>
                        <p><span className="font-bold">Challan No:</span> {sale.delivery_challan_number}</p>
                        <p><span className="font-bold">Invoice No:</span> {sale.invoice_number}</p>
                    </div>
                    <div className="text-right">
                        <p><span className="font-bold">Date:</span> {formatDate(new Date().toISOString())}</p>
                        <p><span className="font-bold">Sale Date:</span> {formatDate(sale.sale_date)}</p>
                    </div>
                </div>

                {/* Customer Details */}
                <div className="mb-8 p-4 border border-gray-400 rounded">
                    <h3 className="font-bold border-b border-gray-400 mb-2">Customer Details</h3>
                    <p className="font-semibold text-lg">{sale.customer?.name}</p>
                    <p>{sale.customer?.address_line1}, {sale.customer?.address_line2}</p>
                    <p>{sale.customer?.city}, {sale.customer?.state} - {sale.customer?.pincode}</p>
                    <p>Phone: {sale.customer?.primary_phone}</p>
                </div>

                {/* Vehicle Details */}
                <div className="mb-8">
                    <h3 className="font-bold border-b-2 border-gray-800 mb-4 pb-2">Vehicle Details</h3>
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td className="py-2 font-bold w-1/3">Model:</td>
                                <td className="py-2">{sale.vehicle?.model?.brand?.brand_name} {sale.vehicle?.model?.model_name}</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-bold">Color:</td>
                                <td className="py-2">{sale.vehicle?.color}</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-bold">Chassis Number:</td>
                                <td className="py-2 font-mono">{sale.chassis_no}</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-bold">Motor Number:</td>
                                <td className="py-2 font-mono">{sale.vehicle?.motor_serial_no || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-bold">Battery Serial No:</td>
                                <td className="py-2 font-mono">{sale.vehicle?.battery_serial_no || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-bold">Controller Serial No:</td>
                                <td className="py-2 font-mono">{sale.vehicle?.controller_serial_no || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-bold">Charger Serial No:</td>
                                <td className="py-2 font-mono">{sale.vehicle?.charger_serial_no || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Declaration */}
                <div className="mb-16">
                    <p className="text-sm">
                        Received the above mentioned vehicle in good condition along with Tool Kit, Owner's Manual, First Aid Kit, and Charger.
                    </p>
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end">
                    <div className="text-center pt-8 border-t border-gray-800 w-1/3">
                        <p className="font-bold">Customer Signature</p>
                    </div>
                    <div className="text-center pt-8 border-t border-gray-800 w-1/3">
                        <p className="font-bold">Authorized Signatory</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
