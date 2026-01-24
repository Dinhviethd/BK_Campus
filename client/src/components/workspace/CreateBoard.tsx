import { useState } from 'react'
import { createBoard, type CreateBoardInput } from '@/service/boardService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Globe, Lock, Users } from 'lucide-react'

// Background colors/gradients for boards
const backgroundOptions = [
  { value: 'bg-gradient-to-r from-blue-500 to-blue-600', label: 'Xanh dương', color: 'bg-blue-500' },
  { value: 'bg-gradient-to-r from-green-500 to-green-600', label: 'Xanh lá', color: 'bg-green-500' },
  { value: 'bg-gradient-to-r from-purple-500 to-purple-600', label: 'Tím', color: 'bg-purple-500' },
  { value: 'bg-gradient-to-r from-pink-500 to-pink-600', label: 'Hồng', color: 'bg-pink-500' },
  { value: 'bg-gradient-to-r from-orange-500 to-orange-600', label: 'Cam', color: 'bg-orange-500' },
  { value: 'bg-gradient-to-r from-red-500 to-red-600', label: 'Đỏ', color: 'bg-red-500' },
  { value: 'bg-gradient-to-r from-cyan-500 to-cyan-600', label: 'Cyan', color: 'bg-cyan-500' },
  { value: 'bg-gradient-to-r from-gray-600 to-gray-700', label: 'Xám', color: 'bg-gray-600' },
]

const visibilityOptions = [
  { 
    value: 'workspace', 
    label: 'Workspace', 
    description: 'Tất cả thành viên workspace có thể xem',
    icon: Users 
  },
  { 
    value: 'private', 
    label: 'Riêng tư', 
    description: 'Chỉ thành viên board mới xem được',
    icon: Lock 
  },
  { 
    value: 'public', 
    label: 'Công khai', 
    description: 'Bất kỳ ai cũng có thể xem',
    icon: Globe 
  },
]

interface CreateBoardProps {
  workspaceId: number
  onBoardCreated?: () => void
}

export function CreateBoard({ workspaceId, onBoardCreated }: CreateBoardProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<{
    boardName: string
    visibility: 'workspace' | 'private' | 'public'
    backgroundUrl: string
  }>({
    boardName: '',
    visibility: 'workspace',
    backgroundUrl: backgroundOptions[0].value,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.boardName.trim()) {
      toast.error('Vui lòng nhập tên board')
      return
    }

    setLoading(true)
    try {
      const data: CreateBoardInput = {
        boardName: formData.boardName,
        idWorkspace: workspaceId,
        visibility: formData.visibility,
        backgroundUrl: formData.backgroundUrl,
      }
      await createBoard(data)
      toast.success('Tạo board thành công!')
      setOpen(false)
      setFormData({
        boardName: '',
        visibility: 'workspace',
        backgroundUrl: backgroundOptions[0].value,
      })
      onBoardCreated?.()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tạo board')
    } finally {
      setLoading(false)
    }
  }

  const selectedVisibility = visibilityOptions.find(v => v.value === formData.visibility)
  const VisibilityIcon = selectedVisibility?.icon || Users

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="bg-muted/50 rounded-lg p-4 h-24 flex items-center justify-center text-muted-foreground border-2 border-dashed cursor-pointer hover:bg-muted transition-colors gap-2">
          <Plus className="h-5 w-5" />
          Tạo board mới
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo Board mới</DialogTitle>
          <DialogDescription>
            Board là nơi chứa các list và card để quản lý công việc
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Background Preview */}
          <div 
            className={`w-full h-28 rounded-lg ${formData.backgroundUrl} flex items-center justify-center`}
          >
            <span className="text-white font-semibold text-lg drop-shadow-md">
              {formData.boardName || 'Tên Board'}
            </span>
          </div>

          {/* Board Name */}
          <div className="space-y-2">
            <Label htmlFor="boardName">Tên Board <span className="text-destructive">*</span></Label>
            <Input
              id="boardName"
              placeholder="VD: Dự án Website, Marketing Q1..."
              value={formData.boardName}
              onChange={(e) => setFormData({ ...formData, boardName: e.target.value })}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Background Selection */}
          <div className="space-y-2">
            <Label>Màu nền</Label>
            <div className="flex flex-wrap gap-2">
              {backgroundOptions.map((bg) => (
                <button
                  key={bg.value}
                  type="button"
                  className={`w-10 h-8 rounded ${bg.color} transition-all ${
                    formData.backgroundUrl === bg.value 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : 'hover:scale-110'
                  }`}
                  onClick={() => setFormData({ ...formData, backgroundUrl: bg.value })}
                  title={bg.label}
                />
              ))}
            </div>
          </div>

          {/* Visibility Selection */}
          <div className="space-y-2">
            <Label>Quyền xem</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value: 'workspace' | 'private' | 'public') => 
                setFormData({ ...formData, visibility: value })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <VisibilityIcon className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo Board'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
