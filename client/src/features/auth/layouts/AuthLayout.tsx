import { Outlet } from "react-router-dom"
export default function Page() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-blue-50 p-6 md:p-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-blue-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-72 w-72 rounded-full bg-blue-100/80 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
