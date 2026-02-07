import { useEffect } from 'react'
import { useCrmStore } from '@/store/crmStore'
import { formatDate } from '@/lib/utils'

export default function EnquiryList() {
    const { enquiries, fetchEnquiries, isLoading } = useCrmStore()

    useEffect(() => {
        fetchEnquiries()
    }, [])

    return (
        <div className="card">
            <div className="p-4 border-b">
                <h3 className="text-lg font-medium">Enquiries</h3>
            </div>
            {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading Enquiries...</div>
            ) : enquiries.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No Enquiries Found</div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enquiries.map((e: any) => (
                                <tr key={e.enquiry_id}>
                                    <td>{e.enquiry_id}</td>
                                    <td>{e.enquiry_source}</td>
                                    <td>{e.enquiry_status_id}</td>
                                    <td>{formatDate(e.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
