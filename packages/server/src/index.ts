import { createApp } from './app'
import { wsManager } from './websocket/manager'
import { initWebSocketBridge } from './websocket/bridge'
import { initActivitySubscriber } from './modules/activities/activity.subscriber'
import { initNotificationSubscriber } from './modules/notifications/notification.subscriber'
import { runReminderJob } from './jobs/reminder-job'
import { logger } from './shared/logger'

initWebSocketBridge()
initActivitySubscriber()
initNotificationSubscriber()

export const app = createApp().listen(3000)

wsManager.setServer(app.server!)

logger.info('Kyte API running', { port: 3000, url: 'http://localhost:3000' })

if (process.env.NODE_ENV !== 'test') {
  logger.info('Initializing reminder job', { interval: '15m' })
  setInterval(runReminderJob, 15 * 60 * 1000)
  setTimeout(runReminderJob, 10000)
}

export type { App } from './app'

export type {
  Priority,
  Size,
  Reminder,
  BoardRole,
  WorkspaceRole,
  Label,
  TaskAssignee,
  ChecklistProgress,
  Task,
  TaskWithLabels,
  Column,
  Board,
  BoardMember,
  Workspace,
  Comment,
  Activity,
  ChecklistItem,
  Checklist,
  Attachment,
} from './types/domain'
