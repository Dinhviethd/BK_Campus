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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

interface OTPFormProps extends React.ComponentProps<typeof Card> {
  email: string
  otp: string
  setOtp: (otp: string) => void
  onSubmit: (e: React.FormEvent) => void
  onResend: () => void
  loading?: boolean
}

export function OTPForm({ 
  email, 
  otp, 
  setOtp, 
  onSubmit, 
  onResend,
  loading = false,
  ...props 
}: OTPFormProps) {
  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Enter verification code</CardTitle>
        <CardDescription>
          We have sent a 6-digit code to the email <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
              <InputOTP 
                maxLength={6} 
                id="otp" 
                value={otp}
                onChange={setOtp}
                disabled={loading}
              >
                <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <FieldDescription>
                Enter the 6-digit code sent to your email.
              </FieldDescription>
            </Field>
            <FieldGroup>
              <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
                {loading ? "Verifying..." : "Verify"}
              </Button>
              <FieldDescription className="text-center">
                Didn't receive the code?{" "}
                <button 
                  type="button" 
                  onClick={onResend}
                  disabled={loading}
                  className="underline hover:text-primary disabled:opacity-50"
                >
                  Gửi lại
                </button>
              </FieldDescription>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
