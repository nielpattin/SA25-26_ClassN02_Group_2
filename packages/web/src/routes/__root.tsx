import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { SearchProvider } from '../context/SearchContext'
import { SearchModal } from '../components/search'

const SHOW_DEVTOOLS = false

export const Route = createRootRoute({
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
