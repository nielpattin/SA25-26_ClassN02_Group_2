import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

const SHOW_DEVTOOLS = false

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      {SHOW_DEVTOOLS && <TanStackRouterDevtools />}
    </>
  )
}
