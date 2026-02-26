import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { Download, FileText, Table as TableIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface SalesSummary {
  invoice_number: string
  invoice_date: string
  taxable_amount: number
  gst_rate: number
  gst_amount: number
  total_amount: number
  chassis_no: string
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['sales-summary', dateRange],
    queryFn: async () => {
      const res = await api.get<{ items: SalesSummary[] }>(`/reports/sales-summary?from_date=${dateRange.from}&to_date=${dateRange.to}`)
      // api.get usually returns the data directly if configured so, assuming it returns { items: ... } based on our backend
      return res.items || (res as any)?.data?.items || []
    },
  })

  // We ensure it's an array for safety
  const summaryList: SalesSummary[] = Array.isArray(summaryData) ? summaryData : []

  const handleDownloadSalesRegister = async () => {
    try {
      const response = await api.get<Blob>(`/reports/sales-register?from_date=${dateRange.from}&to_date=${dateRange.to}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(response)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'sales_register.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  const handleDownloadFinanceRegister = async () => {
    try {
      const response = await api.get<Blob>('/reports/finance-register', {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(response)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'finance_register.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate and download reports</p>
      </div>

      {/* Date Range Selection & Downloads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold">Sales Register</h2>
              <p className="text-sm text-gray-600">Export sales data for date range</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <button onClick={handleDownloadSalesRegister} className="btn btn-primary w-full flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Download Sales Register CSV
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold">Finance Register</h2>
              <p className="text-sm text-gray-600">Export finance data</p>
            </div>
          </div>

          <button onClick={handleDownloadFinanceRegister} className="btn btn-primary w-full flex items-center justify-center gap-2">
            <Download className="w-5 h-5" />
            Download Finance Register CSV
          </button>
        </div>
      </div>

      {/* Tabular View */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TableIcon className="w-6 h-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Sales Summary Preview</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading summary data...</p>
          </div>
        ) : summaryList.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No sales records found for this period</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Chassis No</th>
                  <th className="text-right">Taxable</th>
                  <th className="text-right">GST</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {summaryList.map((row, index) => (
                  <tr key={row.invoice_number}>
                    <td>{index + 1}</td>
                    <td className="font-medium">{row.invoice_number}</td>
                    <td>{row.invoice_date ? formatDate(row.invoice_date) : '-'}</td>
                    <td>{row.chassis_no}</td>
                    <td className="text-right">₹{row.taxable_amount.toLocaleString()}</td>
                    <td className="text-right">₹{row.gst_amount.toLocaleString()} ({row.gst_rate}%)</td>
                    <td className="text-right font-semibold">₹{row.total_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

