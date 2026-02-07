import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { Download, FileText } from 'lucide-react'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })

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
            <button onClick={handleDownloadSalesRegister} className="btn btn-primary w-full flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Download Sales Register
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
            Download Finance Register
          </button>
        </div>
      </div>
    </div>
  )
}
