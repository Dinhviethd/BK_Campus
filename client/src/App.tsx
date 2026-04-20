import { Outlet } from 'react-router-dom'
import { Toaster } from "@/components/ui/sonner"

export function App() {
  return (
    <div>
      <Outlet />
      <Toaster position="top-right" richColors />
    </div>
  );
}
