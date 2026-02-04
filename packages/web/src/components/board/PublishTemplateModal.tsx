import { useState } from 'react'
import { X, Share2, Info } from 'lucide-react'
import { Button } from '../ui/Button'
import { useSubmitTemplate } from '../../hooks/useTemplates'

type PublishTemplateModalProps = {
  boardId: string
  boardName: string
  isOpen: boolean
  onClose: () => void
}

const CATEGORIES = [
  'Engineering',
  'Design',
  'Project Management',
  'Productivity',
  'Agile',
  'Personal',
  'Sales',
  'Marketing',
]

export function PublishTemplateModal({ boardId, boardName, isOpen, onClose }: PublishTemplateModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const submitMutation = useSubmitTemplate()
  const [isSuccess, setIsSuccess] = useState(false)

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    )
  }

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync({
        boardId,
        categories: selectedCategories,
      })
      setIsSuccess(true)
    } catch (error) {
      console.error('Submission failed:', error)
      alert('Failed to submit template. Please try again.')
    }
  }

  if (!isOpen) return null

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md border-2 border-black bg-canvas p-8 text-center shadow-brutal-xl transition-all">
          <h2 className="mb-4 font-heading text-2xl font-black text-black uppercase">Submitted!</h2>
          <p className="mb-8 text-sm font-bold text-gray-600 uppercase">
            Your template has been submitted for review. An admin will check it before it appears in the marketplace.
          </p>
          <Button fullWidth onClick={onClose}>Got it</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg border-2 border-black bg-canvas p-8 shadow-brutal-xl transition-all">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center border border-black bg-white transition-all hover:bg-accent hover:shadow-brutal-sm active:translate-0"
        >
          <X size={18} />
        </button>

        <h2 className="mb-2 font-heading text-2xl font-black tracking-tight text-black uppercase">
          Publish to Market
        </h2>
        <p className="mb-6 text-xs font-bold text-gray-500 uppercase">
          Share "{boardName}" with the community.
        </p>

        <div className="space-y-6">
          <div className="flex items-start gap-3 border border-black bg-accent/10 p-4">
            <Info size={20} className="shrink-0 text-black" />
            <p className="text-[11px] leading-tight font-bold text-black uppercase">
              A snapshot of your columns and labels will be taken. Tasks and members are NOT included.
            </p>
          </div>

          <div>
            <label className="mb-3 block font-heading text-xs font-black text-black uppercase">
              Select Categories (Up to 3)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  disabled={!selectedCategories.includes(category) && selectedCategories.length >= 3}
                  className={`border-2 p-3 text-left text-[11px] font-black uppercase transition-all ${
                    selectedCategories.includes(category)
                      ? '-translate-x-0.5 -translate-y-0.5 border-black bg-accent shadow-brutal-sm'
                      : 'border-black/10 bg-white opacity-60 hover:border-black hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={onClose}
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              fullWidth 
              onClick={handleSubmit}
              disabled={submitMutation.isPending || selectedCategories.length === 0}
              className="group"
            >
              {submitMutation.isPending ? (
                'Submitting...'
              ) : (
                <>
                  <Share2 size={16} />
                  Submit for Review
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
