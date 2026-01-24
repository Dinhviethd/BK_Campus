import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWorkspace } from '@/service/workspaceService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export function CreateWorkspace() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên workspace')
      return
    }

    setLoading(true)
    try {
      const workspace = await createWorkspace({ name: formData.name })
      toast.success('Tạo workspace thành công!')
      navigate(`/workspace/${workspace.idWorkspace}`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tạo workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tạo Workspace mới</CardTitle>
          <CardDescription>
            Workspace là nơi chứa các board và thành viên của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên Workspace</Label>
              <Input
                id="name"
                placeholder="VD: Công ty ABC, Dự án XYZ..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo Workspace'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
