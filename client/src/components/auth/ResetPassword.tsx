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
import { OTPForm } from "./OTPForm"
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authService } from "@/services/authService"
import { toast } from "sonner"

type Step = "email" | "otp" | "reset"

export default function ResetPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>("email")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  })

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authService.forgotPassword({ email })
      
      if (response.success) {
        toast.success(response.message || "Verification code has been sent to your email")
        setStep("otp")
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to send OTP"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authService.verifyOTP({ email, otp })
      
      if (response.success) {
        toast.success(response.message || "OTP is valid")
        setStep("reset")
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Invalid OTP"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setLoading(true)

    try {
      const response = await authService.forgotPassword({ email })
      
      if (response.success) {
        toast.success("A new OTP has been sent to your email")
        setOtp("")
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to resend OTP"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Confirm password does not match")
      return
    }

    setLoading(true)

    try {
      const response = await authService.resetPassword({
        email,
        otp,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword,
      })
      
      if (response.success) {
        toast.success(response.message || "Password reset successful!")
        navigate("/auth/login")
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Password reset failed"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (step === "email") {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email to receive a verification code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendOTP}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <FieldDescription>
                    We will send a 6-digit verification code to this email.
                  </FieldDescription>
                </Field>
                <Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending..." : "Send Verification Code"}
                  </Button>
                  <FieldDescription className="text-center">
                    <Link to="/auth/login" className="underline">
                      Back to Login
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

  if (step === "otp") {
    return (
      <div className="flex flex-col gap-6">
        <OTPForm
          email={email}
          otp={otp}
          setOtp={setOtp}
          onSubmit={handleVerifyOTP}
          onResend={handleResendOTP}
          loading={loading}
        />
        <Button 
          variant="ghost" 
          onClick={() => setStep("email")}
          className="w-full"
        >
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                  disabled={loading}
                />
                <FieldDescription>
                  At least 6 characters, including uppercase, lowercase, and numbers.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  required
                  disabled={loading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Processing..." : "Reset Password"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
