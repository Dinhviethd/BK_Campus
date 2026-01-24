import { useState } from 'react'
import { type List } from '@/service/listService'
import { type Card } from '@/service/cardService'
import { CardItem } from './CardItem'
import { CreateCard } from './CreateCard'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

interface ListColumnProps {
  list: List
  cards: Card[]
  onCardClick?: (card: Card) => void
  onRefresh?: () => void
}

export function ListColumn({ list, cards, onCardClick, onRefresh }: ListColumnProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [listName, setListName] = useState(list.listName)

  const handleNameSubmit = () => {
    // TODO: Implement update list name
    setIsEditing(false)
  }

  return (
    <div className="min-w-[272px] max-w-[272px] bg-muted rounded-xl flex flex-col max-h-full">
      {/* List Header */}
      <div className="p-2 flex items-center justify-between">
        {isEditing ? (
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit()
              if (e.key === 'Escape') {
                setListName(list.listName)
                setIsEditing(false)
              }
            }}
            autoFocus
            className="flex-1 px-2 py-1 text-sm font-semibold bg-background rounded border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        ) : (
          <h3
            className="flex-1 px-2 py-1 text-sm font-semibold cursor-pointer hover:bg-background/50 rounded"
            onClick={() => setIsEditing(true)}
          >
            {list.listName}
          </h3>
        )}
        
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Thêm thẻ</ContextMenuItem>
            <ContextMenuItem>Sao chép danh sách</ContextMenuItem>
            <ContextMenuItem>Di chuyển danh sách</ContextMenuItem>
            <ContextMenuItem className="text-destructive">
              Xóa danh sách
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto px-2 space-y-2 pb-2">
        {cards.map((card) => (
          <CardItem
            key={card.idCard}
            card={card}
            onClick={() => onCardClick?.(card)}
          />
        ))}
      </div>

      {/* Add Card */}
      <div className="p-2 pt-0">
        <CreateCard listId={list.idList} onCardCreated={onRefresh} />
      </div>
    </div>
  )
}
