import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authService } from "@/features/auth/services/authService"
import { toast } from "sonner"
import { loginSchema } from "@/features/auth/schemas/auth.schema"
import { LogIn } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData({
      ...formData,
      [id]: value,
    })
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = loginSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((err) => {
        const field = err.path[0] as string
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)

    try {
      const response = await authService.login(result.data)
      
      if (response.success) {
        toast.success(response.message || "Đăng nhập thành công!")
        navigate("/")
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Đăng nhập thất bại"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      
      <Card className="overflow-hidden rounded-3xl border-[#dfe8f6] bg-white shadow-lg shadow-[#0b4f9e]/5">
        <CardHeader className="space-y-2 pb-6">
          <div className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-[#0b4f9e]" />
            <CardTitle className="text-2xl font-bold text-slate-900">Đăng nhập</CardTitle>
          </div>
          <CardDescription className="text-slate-500">
            Nhập thông tin tài khoản của bạn để tiếp tục
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email" className="text-slate-700">
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-11 rounded-lg border-[#dfe8f6] bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:border-[#0b4f9e] focus-visible:ring-[#0b4f9e]"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password" className="text-slate-700">
                    Mật khẩu
                  </FieldLabel>
                  <Link
                    to="/auth/reset-password"
                    className="text-xs font-medium text-[#0b4f9e] hover:text-[#093e7e] underline-offset-2 hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-11 rounded-lg border-[#dfe8f6] bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:border-[#0b4f9e] focus-visible:ring-[#0b4f9e]"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </Field>
              <Field>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-lg bg-[#0b4f9e] text-base font-semibold text-white shadow-[0_8px_20px_rgba(11,79,158,0.28)] hover:bg-[#09488f] disabled:opacity-50"
                >
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
                <FieldDescription className="text-center text-sm text-slate-600">
                  Chưa có tài khoản?{" "}
                  <Link
                    to="/auth/register"
                    className="font-semibold text-[#0b4f9e] hover:text-[#093e7e] underline-offset-2 hover:underline"
                  >
                    Đăng ký ngay
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
