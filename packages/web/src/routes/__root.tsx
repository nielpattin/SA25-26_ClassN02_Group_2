import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { SearchProvider } from '../context/SearchContext'
import { SearchModal } from '../components/search'
import { authClient } from '../api/auth'

const SHOW_DEVTOOLS = false

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Skip guard for public routes and recovery hub itself
    const publicPaths = ['/', '/verify-email', '/reset-password', '/account/recovery']
    if (publicPaths.includes(location.pathname)) {
      return
    }

    const { data: session } = await authClient.getSession()
    
    // Redirect to recovery hub if account is scheduled for deletion
    if (session?.user && (session.user as any).deletedAt) {
      throw redirect({
        to: '/account/recovery',
      })
    }
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <SearchProvider>
      <Outlet />
      <SearchModal />
      {SHOW_DEVTOOLS && <TanStackRouterDevtools />}
    </SearchProvider>
  )
}
