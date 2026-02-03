import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/moderation')({
  component: () => <div className="p-12">Moderation (Coming Soon)</div>,
})
