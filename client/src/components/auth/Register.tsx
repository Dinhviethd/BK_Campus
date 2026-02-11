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
import { authService } from "@/services/authService"
import { toast } from "sonner"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Confirm password does not match")
      return
    }

    setLoading(true)

    try {
      const response = await authService.register(formData)
      
      if (response.success) {
        toast.success(response.message || "Registration successful!")
        navigate("/")
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Registration failed"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Tạo tài khoản</CardTitle>
        <CardDescription>
          Nhập thông tin của bạn để tạo tài khoản mới
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Họ và tên</FieldLabel>
              <Input 
                id="name" 
                type="text" 
                value={formData.name}
                onChange={handleChange}
                required 
                disabled={loading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Số điện thoại (tùy chọn)</FieldLabel>
              <Input 
                id="phone" 
                type="tel" 
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
              <Input 
                id="password" 
                type="password" 
                value={formData.password}
                onChange={handleChange}
                required 
                disabled={loading}
              />
              <FieldDescription>
                Ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">
                Xác nhận mật khẩu
              </FieldLabel>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={formData.confirmPassword}
                onChange={handleChange}
                required 
                disabled={loading}
              />
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                </Button>
                <FieldDescription className="px-6 text-center">
                  Đã có tài khoản?{" "}
                  <Link to="/auth/login" className="underline">
                    Đăng nhập
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
