
import {App} from "./App";
import AuthLayout from "@/features/auth/layouts/AuthLayout";
import { LoginForm } from "@/features/auth/components/Login"
import {SignupForm} from '@/features/auth/components/Register'
import ResetPassword from '@/features/auth/components/ResetPassword'
import MainLayout from '@/components/shared/MainLayout'
import HomePage from '@/features/main-page/pages/MainPage'
import { ProtectedRoute, PublicRoute } from '@/features/auth/components/ProtectedRoute'

const routes = [
  {
    path: "/",
    Component: App,
    children: [
      {
        path: "/",
        Component: ProtectedRoute, 
        children: [
          {
            Component: MainLayout,
            children: [
              { path: "", Component: HomePage },
            ],
          },
        ],
      },
      {
        path: "auth",
        Component: PublicRoute, 
        children: [
          {
            Component: AuthLayout,
            children: [
              { path: "login", Component: LoginForm },
              { path: "register", Component: SignupForm },
              { path: "reset-password", Component: ResetPassword },
            ],
          },
        ],
      },
     
    ],
  },
];

export default routes;