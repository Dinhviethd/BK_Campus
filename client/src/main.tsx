import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import routes from './route.ts'
const router = createBrowserRouter(routes)
createRoot(document.getElementById('root')!).render(
    <RouterProvider router={router} />
)
