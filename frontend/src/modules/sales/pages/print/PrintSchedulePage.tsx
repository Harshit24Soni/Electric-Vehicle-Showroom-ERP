
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { salesApi } from '../../api/salesApi'
import { formatDate } from '@/lib/utils'

export default function PrintSchedulePage() {
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
                    <h1 className="text-3xl font-bold uppercase tracking-wide">Service Schedule</h1>
                    <p className="text-xl font-bold mt-2">Electric Vehicle Showroom</p>
                    <p>123 EV Street, Green City, State - ZIP</p>
                </div>

                {/* Customer & Vehicle Info */}
                <div className="flex justify-between mb-8">
                    <div>
                        <h3 className="font-bold">Customer:</h3>
                        <p>{sale.customer?.name}</p>
                        <p>{sale.customer?.primary_phone}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="font-bold">Vehicle:</h3>
                        <p>{sale.vehicle?.model?.model_name}</p>
                        <p className="font-mono">{sale.chassis_no}</p>
                    </div>
                </div>

                {/* Schedule Table */}
                <div className="mb-8">
                    <h3 className="font-bold border-b-2 border-gray-800 mb-4 pb-2">Scheduled Services</h3>
                    {sale.service_schedules && sale.service_schedules.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-400">
                                    <th className="py-2 px-4">Service No</th>
                                    <th className="py-2 px-4">Type</th>
                                    <th className="py-2 px-4">Due Date</th>
                                    <th className="py-2 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.service_schedules.map((schedule) => (
                                    <tr key={schedule.schedule_id} className="border-b border-gray-200">
                                        <td className="py-3 px-4">{schedule.service_number}</td>
                                        <td className="py-3 px-4">{schedule.service_type}</td>
                                        <td className="py-3 px-4">{formatDate(schedule.due_date)}</td>
                                        <td className="py-3 px-4">{schedule.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="p-4 text-center text-gray-500">No service schedule generated.</p>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-16 text-center text-sm text-gray-600">
                    <p>Please bring this schedule for your service appointments.</p>
                    <p>Service Center Contact: +91 98765 43210</p>
                </div>
            </div>
        </div>
    )
}
