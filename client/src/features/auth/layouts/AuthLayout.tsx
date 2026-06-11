import { Outlet } from "react-router-dom"

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-[#f3f6fc] p-6 md:p-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#0b4f9e]/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#0b4f9e]/6 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
