import { useState, useEffect } from 'react'
import { type Card, updateCard, deleteCard } from '@/service/cardService'
import { 
  type Label, 
  getLabelsByBoard, 
  createLabel, 
  addLabelToCard, 
  removeLabelFromCard,
  LABEL_COLORS 
} from '@/service/labelService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label as UILabel } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { X, Tag, AlignLeft, Plus, Check, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface CardDetailModalProps {
  card: Card | null
  boardId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onCardUpdated?: (card: Card) => void
  onCardDeleted?: (cardId: number) => void
}

export function CardDetailModal({ 
  card, 
  boardId, 
  open, 
  onOpenChange, 
  onCardUpdated,
  onCardDeleted 
}: CardDetailModalProps) {
  const [cardName, setCardName] = useState('')
  const [description, setDescription] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [loading, setLoading] = useState(false)
  const [labels, setLabels] = useState<Label[]>([])
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value)
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (card) {
      setCardName(card.cardName)
      setDescription(card.description || '')
    }
  }, [card])

  useEffect(() => {
    if (open && boardId) {
      fetchLabels()
    }
  }, [open, boardId])

  const fetchLabels = async () => {
    try {
      const data = await getLabelsByBoard(boardId)
      setLabels(data)
    } catch (error) {
      console.error('Error fetching labels:', error)
    }
  }

  const handleSaveName = async () => {
    if (!card || !cardName.trim()) return

    setLoading(true)
    try {
      const updated = await updateCard(card.idCard, { cardName: cardName.trim() })
      onCardUpdated?.(updated)
      setIsEditingName(false)
      toast.success('Đã cập nhật tên card')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDescription = async () => {
    if (!card) return

    setLoading(true)
    try {
      const updated = await updateCard(card.idCard, { description })
      onCardUpdated?.(updated)
      setIsEditingDescription(false)
      toast.success('Đã cập nhật mô tả')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleLabel = async (label: Label) => {
    if (!card) return

    const hasLabel = card.labels?.some(l => l.idLabel === label.idLabel)

    try {
      let updated: Card
      if (hasLabel) {
        updated = await removeLabelFromCard(card.idCard, label.idLabel)
        toast.success('Đã xóa label')
      } else {
        updated = await addLabelToCard(card.idCard, label.idLabel)
        toast.success('Đã thêm label')
      }
      onCardUpdated?.(updated)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật label')
    }
  }

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Vui lòng nhập tên label')
      return
    }

    setCreatingLabel(true)
    try {
      const newLabel = await createLabel({
        name: newLabelName.trim(),
        color: newLabelColor,
        idBoard: boardId,
      })
      setLabels([...labels, newLabel])
      setNewLabelName('')
      toast.success('Đã tạo label mới')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tạo label')
    } finally {
      setCreatingLabel(false)
    }
  }

  const handleDeleteCard = async () => {
    if (!card) return

    setDeleting(true)
    try {
      await deleteCard(card.idCard)
      toast.success('Đã xóa card thành công')
      onOpenChange(false)
      onCardDeleted?.(card.idCard)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa card')
    } finally {
      setDeleting(false)
    }
  }

  if (!card) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {/* Labels display */}
            {card.labels && card.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {card.labels.map((label) => (
                  <span
                    key={label.idLabel}
                    className="px-2 py-0.5 text-xs text-white rounded"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Card name */}
          {isEditingName ? (
            <div className="space-y-2">
              <Input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="text-lg font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') {
                    setCardName(card.cardName)
                    setIsEditingName(false)
                  }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveName} disabled={loading}>
                  Lưu
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setCardName(card.cardName)
                    setIsEditingName(false)
                  }}
                >
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <DialogTitle 
              className="cursor-pointer hover:bg-muted p-2 rounded -ml-2"
              onClick={() => setIsEditingName(true)}
            >
              {card.cardName}
            </DialogTitle>
          )}
          
          <p className="text-sm text-muted-foreground">
            trong danh sách <span className="font-medium">{card.list.listName}</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
          {/* Main content */}
          <div className="md:col-span-3 space-y-6">
            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft className="h-4 w-4" />
                <UILabel className="font-medium">Mô tả</UILabel>
              </div>
              
              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[120px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Thêm mô tả chi tiết..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDescription} disabled={loading}>
                      Lưu
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setDescription(card.description || '')
                        setIsEditingDescription(false)
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="min-h-[60px] p-3 bg-muted/50 rounded-md cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {description ? (
                    <p className="text-sm whitespace-pre-wrap">{description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Thêm mô tả chi tiết...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar actions */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                THÊM VÀO THẺ
              </p>
              
              {/* Labels button */}
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowLabelPicker(!showLabelPicker)}
              >
                <Tag className="h-4 w-4 mr-2" />
                Nhãn
              </Button>

              {/* Label picker */}
              {showLabelPicker && (
                <div className="mt-2 p-3 border rounded-md bg-background shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Nhãn</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowLabelPicker(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Existing labels */}
                  <div className="space-y-1 mb-3">
                    {labels.map((label) => {
                      const isSelected = card.labels?.some(l => l.idLabel === label.idLabel)
                      return (
                        <button
                          key={label.idLabel}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors"
                          onClick={() => handleToggleLabel(label)}
                        >
                          <span
                            className="flex-1 h-8 rounded flex items-center px-3 text-white text-sm font-medium"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Create new label */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium mb-2">Tạo nhãn mới</p>
                    <Input
                      placeholder="Tên nhãn..."
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      className="mb-2"
                    />
                    <div className="flex flex-wrap gap-1 mb-2">
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color.value}
                          className={`w-7 h-7 rounded ${
                            newLabelColor === color.value 
                              ? 'ring-2 ring-primary ring-offset-1' 
                              : ''
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setNewLabelColor(color.value)}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleCreateLabel}
                      disabled={creatingLabel}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {creatingLabel ? 'Đang tạo...' : 'Tạo nhãn'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Delete card */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                HÀNH ĐỘNG
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full justify-start"
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleting ? 'Đang xóa...' : 'Xóa thẻ'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa thẻ này?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Hành động này không thể hoàn tác. Thẻ "{card.cardName}" sẽ bị xóa vĩnh viễn.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteCard}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
