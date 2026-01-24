import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getWorkspaceById, type Workspace } from '@/service/workspaceService'
import { getBoardsByWorkspace, type Board } from '@/service/boardService'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateBoard } from './CreateBoard'
import { Globe, Lock, Users } from 'lucide-react'

export function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBoards = useCallback(async () => {
    if (!id) return
    try {
      const boardsData = await getBoardsByWorkspace(parseInt(id))
      setBoards(boardsData)
    } catch (err) {
      console.error('Error fetching boards:', err)
    }
  }, [id])

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      try {
        const [workspaceData, boardsData] = await Promise.all([
          getWorkspaceById(parseInt(id)),
          getBoardsByWorkspace(parseInt(id)),
        ])
        setWorkspace(workspaceData)
        setBoards(boardsData)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải workspace')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-destructive">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="text-primary hover:underline"
        >
          Quay về trang chủ
        </button>
      </div>
    )
  }

  if (!workspace) {
    return null
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-3 w-3" />
      case 'private':
        return <Lock className="h-3 w-3" />
      default:
        return <Users className="h-3 w-3" />
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{workspace.name}</h1>
        <p className="text-muted-foreground">
          Tạo bởi {workspace.createdBy?.name || 'Unknown'} • {workspace.tier}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Boards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Existing boards */}
            {boards.map((board) => (
              <div
                key={board.idBoard}
                className={`rounded-lg p-4 h-24 cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02] relative group ${
                  board.backgroundUrl || 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                onClick={() => navigate(`/board/${board.idBoard}`)}
              >
                <div className="text-white font-semibold drop-shadow-md">
                  {board.boardName}
                </div>
                <div className="absolute bottom-2 right-2 text-white/80 flex items-center gap-1 text-xs">
                  {getVisibilityIcon(board.visibility)}
                </div>
              </div>
            ))}
            {/* Create new board */}
            <CreateBoard 
              workspaceId={parseInt(id!)} 
              onBoardCreated={fetchBoards}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
