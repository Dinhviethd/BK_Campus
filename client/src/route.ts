
import {App} from "./App";
import AuthLayout from "@/components/layouts/AuthLayout";
import { LoginForm } from "@/components/auth/Login"
import {SignupForm} from '@/components/auth/Register'
import ResetPassword from '@/components/auth/ResetPassword'
import MainLayout from '@/components/layouts/MainLayout'
import {MainPage} from '@/components/MainPage'
import { ProtectedRoute, PublicRoute } from '@/components/auth/ProtectedRoute'

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
              { path: "", Component: MainPage },
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