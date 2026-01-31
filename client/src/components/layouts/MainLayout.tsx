import { Navbar } from "../mainPage/Navbar"
import { Outlet } from "react-router-dom"
export default function MainLayout() {
  return (
    <div className="fixed inset-0">
      <Navbar />
              <Outlet />
    </div>

  )
}