
const routes = [
  {
    path: "/",
    lazy: async () => {
      const { App } = await import("./App");
      return { Component: App };
    },
    children: [
      {
        path: "/",
        lazy: async () => {
          const { ProtectedRoute } = await import("@/features/auth/components/ProtectedRoute");
          return { Component: ProtectedRoute };
        },
        children: [
          {
            lazy: async () => {
              const { default: MainLayout } = await import("@/components/shared/MainLayout");
              return { Component: MainLayout };
            },
            children: [
              {
                path: "",
                lazy: async () => {
                  const { default: HomePage } = await import("@/features/main-page/pages/MainPage");
                  return { Component: HomePage };
                },
              },
            ],
          },
        ],
      },
      {
        path: "auth",
        lazy: async () => {
          const { PublicRoute } = await import("@/features/auth/components/ProtectedRoute");
          return { Component: PublicRoute };
        },
        children: [
          {
            lazy: async () => {
              const { default: AuthLayout } = await import("@/features/auth/layouts/AuthLayout");
              return { Component: AuthLayout };
            },
            children: [
              {
                path: "login",
                lazy: async () => {
                  const { LoginForm } = await import("@/features/auth/components/Login");
                  return { Component: LoginForm };
                },
              },
              {
                path: "register",
                lazy: async () => {
                  const { SignupForm } = await import("@/features/auth/components/Register");
                  return { Component: SignupForm };
                },
              },
              {
                path: "reset-password",
                lazy: async () => {
                  const { default: ResetPassword } = await import("@/features/auth/components/ResetPassword");
                  return { Component: ResetPassword };
                },
              },
            ],
          },
        ],
      },
    ],
  },
];

export default routes;