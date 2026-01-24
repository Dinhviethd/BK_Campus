import { useState } from 'react'
import { createList, type CreateListInput } from '@/service/listService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

interface CreateListProps {
  boardId: number
  onListCreated?: () => void
}

export function CreateList({ boardId, onListCreated }: CreateListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [listName, setListName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!listName.trim()) {
      toast.error('Vui lòng nhập tên list')
      return
    }

    setLoading(true)
    try {
      const data: CreateListInput = {
        listName: listName.trim(),
        idBoard: boardId,
      }
      await createList(data)
      toast.success('Tạo list thành công!')
      setListName('')
      setIsAdding(false)
      onListCreated?.()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tạo list')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsAdding(false)
    setListName('')
  }

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="min-w-[272px] h-fit flex items-center gap-2 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white font-medium transition-colors"
      >
        <Plus className="h-5 w-5" />
        Thêm danh sách
      </button>
    )
  }

  return (
    <div className="min-w-[272px] bg-muted p-2 rounded-xl">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          placeholder="Nhập tiêu đề danh sách..."
          value={listName}
          onChange={(e) => setListName(e.target.value)}
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
            {loading ? 'Đang tạo...' : 'Thêm danh sách'}
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
    </div>
  )
}
