import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AdminLayout } from '../components/layout/AdminLayout'
import { authClient } from '../api/auth'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    
    if (!session?.user?.adminRole) {
      throw redirect({
        to: '/',
      })
    }

    return {
      session,
    }
  },
  component: AdminLayoutComponent,
})

function AdminLayoutComponent() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}
