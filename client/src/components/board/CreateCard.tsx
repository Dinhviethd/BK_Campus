import { useState } from 'react'
import { createCard, type CreateCardInput } from '@/service/cardService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

interface CreateCardProps {
  listId: number
  onCardCreated?: () => void
}

export function CreateCard({ listId, onCardCreated }: CreateCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [cardName, setCardName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cardName.trim()) {
      toast.error('Vui lòng nhập tên card')
      return
    }

    setLoading(true)
    try {
      const data: CreateCardInput = {
        cardName: cardName.trim(),
        idList: listId,
      }
      await createCard(data)
      toast.success('Tạo card thành công!')
      setCardName('')
      setIsAdding(false)
      onCardCreated?.()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tạo card')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsAdding(false)
    setCardName('')
  }

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center gap-2 p-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
      >
        <Plus className="h-4 w-4" />
        Thêm thẻ
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input
        placeholder="Nhập tiêu đề thẻ..."
        value={cardName}
        onChange={(e) => setCardName(e.target.value)}
        disabled={loading}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleCancel()
          }
        }}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? 'Đang tạo...' : 'Thêm thẻ'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
