import { type Card } from '@/service/cardService'
import { Card as UICard } from '@/components/ui/card'
import { Calendar, Paperclip } from 'lucide-react'

interface CardItemProps {
  card: Card
  onClick?: () => void
}

export function CardItem({ card, onClick }: CardItemProps) {
  const formatDate = (date?: Date) => {
    if (!date) return null
    const d = new Date(date)
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const isDueSoon = () => {
    if (!card.dueDate) return false
    const dueDate = new Date(card.dueDate)
    const now = new Date()
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 1 && diffDays >= 0
  }

  const isOverdue = () => {
    if (!card.dueDate) return false
    const dueDate = new Date(card.dueDate)
    const now = new Date()
    return dueDate < now
  }

  return (
    <UICard
      className="p-2 cursor-pointer hover:bg-accent/50 transition-colors group"
      onClick={onClick}
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((label) => (
            <span
              key={label.idLabel}
              className="h-2 w-10 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Card name */}
      <p className="text-sm font-medium">{card.cardName}</p>

      {/* Card metadata */}
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        {card.dueDate && (
          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              isOverdue()
                ? 'bg-red-100 text-red-600'
                : isDueSoon()
                ? 'bg-yellow-100 text-yellow-600'
                : ''
            }`}
          >
            <Calendar className="h-3 w-3" />
            {formatDate(card.dueDate)}
          </span>
        )}
        
        {card.description && (
          <span className="text-muted-foreground" title="Có mô tả">
            ≡
          </span>
        )}

        {card.attachmentUrl && (
          <span className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
          </span>
        )}
      </div>
    </UICard>
  )
}
