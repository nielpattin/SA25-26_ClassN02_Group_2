import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { api } from '../../api/client'

type ExportFormat = 'json' | 'csv'

type ExportBoardModalProps = {
  boardId: string
  boardName: string
  isOpen: boolean
  onClose: () => void
}

export function ExportBoardModal({ boardId, boardName, isOpen, onClose }: ExportBoardModalProps) {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const response = await api.v1.boards({ id: boardId }).export.get({
        query: {
          format,
          includeArchived: includeArchived ? 'true' : 'false',
        },
      })

      if (response.error) {
        throw response.error
      }

      const data = response.data
      const blob = data instanceof Blob ? data : new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const dateStr = new Date().toISOString().split('T')[0]
      const ext = format === 'json' ? 'json' : 'zip'
      const baseFileName = boardName.replace(/\s+/g, '-').toLowerCase()
      link.setAttribute('download', `${baseFileName}-export-${dateStr}.${ext}`)
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export board. Please try again.')
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
          className="hover:bg-accent absolute top-4 right-4 flex h-8 w-8 items-center justify-center border border-black bg-white transition-all hover:shadow-brutal-sm active:translate-0"
        >
          <X size={18} />
        </button>

        <h2 className="font-heading mb-6 text-2xl font-black text-black uppercase tracking-tight">
          Export Board
        </h2>

        <div className="space-y-6">
          <div>
            <label className="font-heading mb-3 block text-sm font-extrabold text-black uppercase">
              Select Format
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat('json')}
                className={`flex flex-col items-center gap-3 border-2 p-6 transition-all ${
                  format === 'json' 
                    ? 'bg-accent border-black shadow-brutal-md -translate-x-1 -translate-y-1' 
                    : 'bg-white border-black/10 hover:border-black hover:shadow-brutal-sm'
                }`}
              >
                <FileJson size={32} className={format === 'json' ? 'text-black' : 'text-black/40'} />
                <span className={`font-heading text-xs font-black uppercase ${format === 'json' ? 'text-black' : 'text-black/40'}`}>
                  JSON
                </span>
                <span className="text-[10px] text-black/60 font-medium">Recommended for backup</span>
              </button>

              <button
                onClick={() => setFormat('csv')}
                className={`flex flex-col items-center gap-3 border-2 p-6 transition-all ${
                  format === 'csv' 
                    ? 'bg-accent border-black shadow-brutal-md -translate-x-1 -translate-y-1' 
                    : 'bg-white border-black/10 hover:border-black hover:shadow-brutal-sm'
                }`}
              >
                <FileSpreadsheet size={32} className={format === 'csv' ? 'text-black' : 'text-black/40'} />
                <span className={`font-heading text-xs font-black uppercase ${format === 'csv' ? 'text-black' : 'text-black/40'}`}>
                  CSV (ZIP)
                </span>
                <span className="text-[10px] text-black/60 font-medium">For spreadsheets</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 border-2 border-black bg-white p-4 shadow-brutal-sm">
            <Checkbox 
              checked={includeArchived} 
              onChange={setIncludeArchived}
              size={24}
            />
            <div className="flex flex-col">
              <span className="font-heading text-xs font-black text-black uppercase">
                Include archived items
              </span>
              <span className="text-[10px] text-black/60">
                Exports archived columns and cards
              </span>
            </div>
          </div>

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
