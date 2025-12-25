import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <div className="viewfinder-corner top-left"></div>
      <div className="viewfinder-corner top-right"></div>
      <div className="viewfinder-corner bottom-left"></div>
      <div className="viewfinder-corner bottom-right"></div>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  )
}
