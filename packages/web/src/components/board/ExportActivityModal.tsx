import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, X, Calendar } from 'lucide-react'
import { Button } from '../ui/Button'
import { api } from '../../api/client'
import { format as formatDate, subDays } from 'date-fns'

type ExportFormat = 'json' | 'csv'

type ExportActivityModalProps = {
  boardId: string
  boardName: string
  isOpen: boolean
  onClose: () => void
}

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 365 days', days: 365 },
]

export function ExportActivityModal({ boardId, boardName, isOpen, onClose }: ExportActivityModalProps) {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [dateFrom, setDateFrom] = useState(() => formatDate(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(() => formatDate(new Date(), 'yyyy-MM-dd'))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePresetClick = (days: number) => {
    const end = new Date()
    const start = subDays(end, days)
    setDateFrom(formatDate(start, 'yyyy-MM-dd'))
    setDateTo(formatDate(end, 'yyyy-MM-dd'))
    setError(null)
  }

  const validateDates = (): boolean => {
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    
    if (from > to) {
      setError('Start date cannot be after end date')
      return false
    }
    
    const diffTime = Math.abs(to.getTime() - from.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays > 365) {
      setError('Date range cannot exceed 365 days')
      return false
    }
    
    setError(null)
    return true
  }

  const handleExport = async () => {
    if (!validateDates()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.v1.activities.board({ boardId }).export.get({
        query: {
          dateFrom,
          dateTo,
          format,
        },
      })

      if (response.error) {
        throw response.error
      }

      const data = response.data
      const blob = data instanceof Blob ? data : new Blob([JSON.stringify(data, null, 2)], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const ext = format
      const baseFileName = boardName.replace(/\s+/g, '-').toLowerCase()
      const dateRange = `${dateFrom}_to_${dateTo}`
      link.setAttribute('download', `${baseFileName}-activities-${dateRange}.${ext}`)
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      onClose()
    } catch (err: any) {
      console.error('Export failed:', err)
      if (err?.status === 403) {
        setError('You do not have permission to export activities. Only board admins can export.')
      } else if (err?.message) {
        setError(err.message)
      } else {
        setError('Failed to export activities. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="bg-canvas shadow-brutal-xl relative w-full max-w-md border-2 border-black p-8 transition-all">
        <button 
          onClick={onClose}
          className="hover:bg-accent hover:shadow-brutal-sm absolute top-4 right-4 flex h-8 w-8 items-center justify-center border border-black bg-white transition-all active:translate-0"
        >
          <X size={18} />
        </button>

        <h2 className="font-heading mb-6 text-2xl font-black tracking-tight text-black uppercase">
          Export Activity Log
        </h2>

        <div className="space-y-6">
          {/* Date Range Selection */}
          <div>
            <label className="font-heading mb-3 block text-sm font-extrabold text-black uppercase">
              Date Range
            </label>
            
            {/* Presets */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => handlePresetClick(preset.days)}
                  className="font-heading hover:bg-accent border border-black bg-white px-3 py-2 text-xs font-bold uppercase transition-all hover:-translate-px hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-black/60">
                  From
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value)
                      setError(null)
                    }}
                    className="w-full border-2 border-black bg-white px-3 py-2 pl-9 text-sm font-medium outline-none focus:bg-accent"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-black/60">
                  To
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value)
                      setError(null)
                    }}
                    className="w-full border-2 border-black bg-white px-3 py-2 pl-9 text-sm font-medium outline-none focus:bg-accent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="font-heading mb-3 block text-sm font-extrabold text-black uppercase">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat('json')}
                className={`flex flex-col items-center gap-3 border-2 p-6 transition-all ${
                  format === 'json' 
                    ? 'bg-accent shadow-brutal-md -translate-x-1 -translate-y-1 border-black' 
                    : 'hover:shadow-brutal-sm border-black/10 bg-white hover:border-black'
                }`}
              >
                <FileJson size={32} className={format === 'json' ? 'text-black' : 'text-black/40'} />
                <span className={`font-heading text-xs font-black uppercase ${format === 'json' ? 'text-black' : 'text-black/40'}`}>
                  JSON
                </span>
                <span className="text-[10px] font-medium text-black/60">For data processing</span>
              </button>

              <button
                onClick={() => setFormat('csv')}
                className={`flex flex-col items-center gap-3 border-2 p-6 transition-all ${
                  format === 'csv' 
                    ? 'bg-accent shadow-brutal-md -translate-x-1 -translate-y-1 border-black' 
                    : 'hover:shadow-brutal-sm border-black/10 bg-white hover:border-black'
                }`}
              >
                <FileSpreadsheet size={32} className={format === 'csv' ? 'text-black' : 'text-black/40'} />
                <span className={`font-heading text-xs font-black uppercase ${format === 'csv' ? 'text-black' : 'text-black/40'}`}>
                  CSV
                </span>
                <span className="text-[10px] font-medium text-black/60">For spreadsheets</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              fullWidth 
              onClick={handleExport}
              disabled={isLoading}
              className="group"
            >
              {isLoading ? (
                'Exporting...'
              ) : (
                <>
                  <Download size={16} className="transition-transform group-hover:translate-y-0.5" />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
