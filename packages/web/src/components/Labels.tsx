import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import './Labels.css'

interface LabelsProps {
  cardLabels?: string[]
  allLabels: { id: string; name: string; color: string }[]
  onToggle: (labelId: string) => void
  onAdd: (name: string, color: string) => void
  onDelete: (labelId: string) => void
}

export function LabelSection({ cardLabels = [], allLabels, onToggle, onAdd, onDelete }: LabelsProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#3498DB')

  const colors = [
    '#3498DB', '#2ECC71', '#F1C40F', '#E67E22', '#E74C3C', 
    '#9B59B6', '#1ABC9C', '#34495E', '#95A5A6', '#D35400'
  ]

  return (
    <div className="label-section">
      <div className="labels-container">
        {allLabels.filter(l => cardLabels.includes(l.id)).map((label) => (
          <div key={label.id} className="label-wrapper">
            <button
              className="label-pill active"
              style={{ '--label-color': label.color } as React.CSSProperties}
              onClick={() => onToggle(label.id)}
            >
              {label.name}
            </button>
            <button className="delete-label-pill-btn" onClick={() => onDelete(label.id)}>
              <X size={10} />
            </button>
          </div>
        ))}
        
        {allLabels.filter(l => !cardLabels.includes(l.id)).map(label => (
          <button
            key={label.id}
            className="label-pill"
            style={{ '--label-color': label.color } as React.CSSProperties}
            onClick={() => onToggle(label.id)}
          >
            {label.name}
          </button>
        ))}

        <Button variant="secondary" size="sm" onClick={() => setIsCreating(true)} className="add-label-btn">
          <Plus size={14} />
        </Button>
      </div>

      {isCreating && (
        <div className="label-creator">
          <Input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name..."
            autoFocus
          />
          <div className="color-picker">
            {colors.map(color => (
              <div
                key={color}
                className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
          <div className="label-creator-actions">
            <Button
              onClick={() => {
                if (newLabelName) {
                  onAdd(newLabelName, selectedColor)
                  setNewLabelName('')
                  setIsCreating(false)
                }
              }}
              disabled={!newLabelName}
            >
              Create
            </Button>
            <Button variant="secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
