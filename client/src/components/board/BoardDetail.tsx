import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBoardById, type Board } from '@/service/boardService'
import { getListsByBoard, type List } from '@/service/listService'
import { getCardsByBoard, type Card } from '@/service/cardService'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ListColumn } from './ListColumn'
import { CreateList } from './CreateList'
import { CardDetailModal } from './CardDetailModal'
import { ArrowLeft, Users, Star, MoreHorizontal } from 'lucide-react'

export function BoardDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [board, setBoard] = useState<Board | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [cardModalOpen, setCardModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return

    try {
      const [boardData, listsData, cardsData] = await Promise.all([
        getBoardById(parseInt(id)),
        getListsByBoard(parseInt(id)),
        getCardsByBoard(parseInt(id)),
      ])
      setBoard(boardData)
      setLists(listsData)
      setCards(cardsData)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải board')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getCardsByListId = (listId: number) => {
    return cards.filter(card => card.list.idList === listId)
  }

  const handleCardClick = (card: Card) => {
    setSelectedCard(card)
    setCardModalOpen(true)
  }

  const handleCardUpdated = (updatedCard: Card) => {
    setCards(prevCards => 
      prevCards.map(c => c.idCard === updatedCard.idCard ? updatedCard : c)
    )
    setSelectedCard(updatedCard)
  }

  const handleCardDeleted = (cardId: number) => {
    setCards(prevCards => prevCards.filter(c => c.idCard !== cardId))
    setSelectedCard(null)
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 flex items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex-1 p-4 flex gap-4 overflow-x-auto">
          <Skeleton className="min-w-[272px] h-96" />
          <Skeleton className="min-w-[272px] h-64" />
          <Skeleton className="min-w-[272px] h-80" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          Quay lại
        </Button>
      </div>
    )
  }

  if (!board) {
    return null
  }

  return (
    <div 
      className={`h-full flex flex-col ${
        board.backgroundUrl || 'bg-gradient-to-r from-blue-500 to-blue-600'
      }`}
    >
      {/* Board Header */}
      <div className="p-3 flex items-center gap-3 bg-black/20 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
          onClick={() => navigate(`/workspace/${board.workspace.idWorkspace}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {board.workspace.name}
        </Button>

        <div className="h-6 w-px bg-white/30" />

        <h1 className="text-lg font-bold text-white">{board.boardName}</h1>

        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
          <Star className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
          <Users className="h-4 w-4 mr-2" />
          Chia sẻ
        </Button>

        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Lists Container */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full items-start">
          {lists
            .sort((a, b) => a.position - b.position)
            .map((list) => (
              <ListColumn
                key={list.idList}
                list={list}
                cards={getCardsByListId(list.idList)}
                onCardClick={handleCardClick}
                onRefresh={fetchData}
              />
            ))}
          
          {/* Add List Button */}
          <CreateList boardId={parseInt(id!)} onListCreated={fetchData} />
        </div>
      </div>

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        boardId={parseInt(id!)}
        open={cardModalOpen}
        onOpenChange={setCardModalOpen}
        onCardUpdated={handleCardUpdated}
        onCardDeleted={handleCardDeleted}
      />
    </div>
  )
}
