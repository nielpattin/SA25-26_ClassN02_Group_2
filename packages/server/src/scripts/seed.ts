import { db } from '../db'
import * as schema from '../db/schema'
import { generatePositions } from '../shared/position'
import { eq, inArray, sql } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

function generateId(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function randomDate(daysAgo: number, daysAhead: number): Date {
  const offset = Math.floor(Math.random() * (daysAhead + daysAgo)) - daysAgo
  return new Date(Date.now() + offset * 24 * 60 * 60 * 1000)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(n, arr.length))
}

const ECOMMERCE_COLUMNS = [
  'Backlog',
  'Sprint Planning',
  'In Development',
  'Code Review',
  'QA Testing',
  'UAT',
  'Ready for Deploy',
  'Done',
]

const ECOMMERCE_LABELS = [
  { name: 'Bug', color: '#e74c3c' },
  { name: 'Feature', color: '#27ae60' },
  { name: 'Enhancement', color: '#3498db' },
  { name: 'UI/UX', color: '#9b59b6' },
  { name: 'Backend', color: '#e67e22' },
  { name: 'Frontend', color: '#1abc9c' },
  { name: 'Database', color: '#34495e' },
  { name: 'Security', color: '#c0392b' },
  { name: 'Performance', color: '#f39c12' },
  { name: 'Documentation', color: '#95a5a6' },
  { name: 'Critical', color: '#8e44ad' },
  { name: 'Low Priority', color: '#bdc3c7' },
]

const ECOMMERCE_TASKS: Record<string, { title: string; description: string; labels: string[] }[]> = {
  'Backlog': [
    { title: 'Implement gift card system', description: 'Allow customers to purchase and redeem digital gift cards. Support multiple denominations ($25, $50, $100, $250). Include email delivery with custom messages.', labels: ['Feature', 'Backend', 'Frontend'] },
    { title: 'Add product comparison feature', description: 'Enable customers to compare up to 4 products side-by-side. Show specifications, pricing, ratings, and availability in a comparison table.', labels: ['Feature', 'UI/UX'] },
    { title: 'Integrate with ShipStation API', description: 'Connect order fulfillment system with ShipStation for automated shipping label generation and tracking updates.', labels: ['Feature', 'Backend'] },
    { title: 'Build loyalty points program', description: 'Create a points-based rewards system. 1 point per $1 spent, redeemable at 100 points = $5 discount. Track points history and expiration.', labels: ['Feature', 'Backend', 'Database'] },
    { title: 'Add multi-currency support', description: 'Support USD, EUR, GBP, CAD, AUD. Auto-detect based on IP location. Allow manual currency selection. Update prices in real-time.', labels: ['Feature', 'Backend'] },
    { title: 'Implement abandoned cart emails', description: 'Send automated reminder emails for abandoned carts after 1 hour, 24 hours, and 72 hours. Include cart contents and direct checkout link.', labels: ['Feature', 'Backend'] },
    { title: 'Create mobile app deep linking', description: 'Support deep links from marketing emails and social media to specific products in the mobile app.', labels: ['Feature', 'Enhancement'] },
    { title: 'Add voice search capability', description: 'Integrate Web Speech API for voice-activated product search on desktop and mobile browsers.', labels: ['Feature', 'Frontend', 'UI/UX'] },
  ],
  'Sprint Planning': [
    { title: 'Design new checkout flow wireframes', description: 'Create wireframes for streamlined 3-step checkout: 1) Shipping, 2) Payment, 3) Review & Confirm. Focus on mobile-first design.', labels: ['UI/UX', 'Frontend'] },
    { title: 'Plan database migration for order history', description: 'Design schema changes to support order versioning and audit trail. Plan zero-downtime migration strategy.', labels: ['Database', 'Backend'] },
    { title: 'Scope product recommendation engine', description: 'Define requirements for ML-based product recommendations. Consider collaborative filtering vs content-based approaches.', labels: ['Feature', 'Backend'] },
    { title: 'Architecture review for microservices split', description: 'Evaluate splitting monolith into inventory, orders, and payments microservices. Document pros/cons and migration path.', labels: ['Backend', 'Documentation'] },
  ],
  'In Development': [
    { title: 'Implement Stripe subscription billing', description: 'Add support for recurring subscription products. Handle proration, cancellation, and plan upgrades/downgrades. Webhook integration for payment events.', labels: ['Feature', 'Backend', 'Critical'] },
    { title: 'Build product filtering system', description: 'Create faceted search with filters for price range, brand, size, color, rating, availability. Support URL-based filter state for bookmarking.', labels: ['Feature', 'Frontend', 'Backend'] },
    { title: 'Add real-time inventory updates', description: 'Implement WebSocket-based inventory sync to show live stock counts. Update cart if items become unavailable.', labels: ['Feature', 'Backend', 'Frontend'] },
    { title: 'Create admin dashboard analytics', description: 'Build dashboard showing daily sales, top products, conversion funnel, and customer acquisition metrics. Use Chart.js for visualizations.', labels: ['Feature', 'Frontend', 'UI/UX'] },
    { title: 'Implement product image zoom', description: 'Add hover zoom on desktop and pinch-to-zoom on mobile for product images. Support 360° product view for featured items.', labels: ['Enhancement', 'Frontend', 'UI/UX'] },
    { title: 'Build order tracking page', description: 'Create customer-facing order tracking with timeline view. Show order placed, processing, shipped, out for delivery, delivered statuses.', labels: ['Feature', 'Frontend'] },
  ],
  'Code Review': [
    { title: 'Review PayPal integration PR', description: 'Code review for PayPal Express Checkout integration. Verify error handling, refund flow, and sandbox testing coverage.', labels: ['Backend', 'Security'] },
    { title: 'Review cart persistence implementation', description: 'Verify cart data is correctly stored in localStorage for guests and synced to database for logged-in users.', labels: ['Frontend', 'Backend'] },
    { title: 'Review product search indexing', description: 'Check Elasticsearch indexing logic for product catalog. Verify relevance scoring and typo tolerance implementation.', labels: ['Backend', 'Performance'] },
  ],
  'QA Testing': [
    { title: 'Test checkout flow on all browsers', description: 'Cross-browser testing on Chrome, Firefox, Safari, Edge. Verify payment processing, form validation, and error states.', labels: ['Frontend', 'Critical'] },
    { title: 'Load test product catalog API', description: 'Run k6 load tests simulating 1000 concurrent users browsing products. Target: <200ms p95 response time.', labels: ['Performance', 'Backend'] },
    { title: 'Security audit for payment processing', description: 'Verify PCI DSS compliance. Test for SQL injection, XSS, CSRF vulnerabilities. Review token handling and encryption.', labels: ['Security', 'Critical'] },
    { title: 'Test mobile responsive layouts', description: 'Verify all pages render correctly on iPhone SE, iPhone 14, Pixel 7, Samsung Galaxy. Test touch interactions and gestures.', labels: ['Frontend', 'UI/UX'] },
    { title: 'Regression test user authentication', description: 'Test login, signup, password reset, social auth (Google, Facebook, Apple). Verify session handling and token refresh.', labels: ['Backend', 'Security'] },
  ],
  'UAT': [
    { title: 'UAT: New product detail page', description: 'Business stakeholders to verify new PDP layout, pricing display, variant selection, and add-to-cart flow.', labels: ['UI/UX', 'Frontend'] },
    { title: 'UAT: Refund process workflow', description: 'Customer service team to test refund initiation, approval workflow, and customer notification emails.', labels: ['Backend', 'Feature'] },
    { title: 'UAT: Inventory management updates', description: 'Warehouse team to verify stock count updates, low stock alerts, and reorder point notifications.', labels: ['Backend', 'Feature'] },
  ],
  'Ready for Deploy': [
    { title: 'Deploy: Updated shipping calculator', description: 'New shipping rate calculator with real-time carrier API integration. Supports UPS, FedEx, USPS. Includes dimensional weight calculation.', labels: ['Backend', 'Feature'] },
    { title: 'Deploy: Customer review system', description: 'Product review and rating system with photo uploads, verified purchase badges, and helpful vote sorting.', labels: ['Feature', 'Frontend', 'Backend'] },
  ],
  'Done': [
    { title: 'Implement shopping cart', description: 'Full shopping cart functionality with add, remove, update quantity. Persist across sessions. Calculate subtotal, tax, shipping.', labels: ['Feature', 'Frontend', 'Backend'] },
    { title: 'Build user authentication system', description: 'Email/password auth with email verification. Social login via Google and Facebook. Password reset flow with secure tokens.', labels: ['Feature', 'Backend', 'Security'] },
    { title: 'Create product catalog pages', description: 'Category listing pages with pagination, sorting (price, popularity, newest), and grid/list view toggle.', labels: ['Feature', 'Frontend'] },
    { title: 'Implement search functionality', description: 'Full-text product search with autocomplete, search suggestions, and recent searches. Elasticsearch backend.', labels: ['Feature', 'Backend', 'Frontend'] },
    { title: 'Set up CI/CD pipeline', description: 'GitHub Actions workflow for automated testing, linting, and deployment to staging/production environments.', labels: ['Enhancement', 'Documentation'] },
    { title: 'Configure CDN for static assets', description: 'CloudFront CDN setup for images, CSS, JS. Implement cache invalidation on deployments. 50% reduction in load times.', labels: ['Performance', 'Backend'] },
    { title: 'Add SEO meta tags', description: 'Dynamic meta titles, descriptions, and Open Graph tags for all product and category pages. Structured data for rich snippets.', labels: ['Enhancement', 'Frontend'] },
    { title: 'Implement responsive design', description: 'Mobile-first responsive layouts for all pages. Breakpoints at 640px, 768px, 1024px, 1280px.', labels: ['Frontend', 'UI/UX'] },
  ],
}

const ECOMMERCE_COMMENTS = [
  'I have pushed the initial implementation. Ready for review.',
  'Found an edge case with empty cart - will fix today.',
  'Blocked on API documentation from payment provider.',
  'Performance looks good - p95 latency is under 150ms.',
  'Added unit tests covering the main scenarios.',
  'Discussed with product team - they want this for next sprint.',
  'Security review passed, no critical issues found.',
  'Mobile testing complete, works on all target devices.',
  'Updated the PR with requested changes.',
  'Deployed to staging for QA verification.',
  'Customer feedback incorporated into the design.',
  'Database migration script tested successfully.',
  'Integration tests passing in CI.',
  'Reverted due to production incident - investigating.',
  'Fixed the regression, ready for re-review.',
  'Accessibility audit complete - WCAG 2.1 AA compliant.',
  'Added error tracking with Sentry integration.',
  'Cache invalidation logic verified.',
  'API rate limiting implemented and tested.',
  'Documentation updated in Confluence.',
]

const RANDOM_BOARD_NAMES = [
  'Website Redesign',
  'Mobile App Development',
  'Marketing Campaign Q1',
  'Customer Support Tickets',
  'Product Roadmap 2024',
  'Bug Tracker',
  'Content Calendar',
  'Event Planning',
  'Research Projects',
  'Personal Tasks',
  'Team Onboarding',
  'Infrastructure Updates',
  'Feature Requests',
  'Sprint Board',
  'Release Planning',
]

const RANDOM_TASK_TITLES = [
  'Update documentation',
  'Fix navigation menu bug',
  'Optimize database queries',
  'Design new landing page',
  'Implement dark mode',
  'Add email notifications',
  'Create API endpoints',
  'Write unit tests',
  'Review pull request',
  'Update dependencies',
  'Configure monitoring',
  'Set up analytics',
  'Improve error handling',
  'Refactor legacy code',
  'Add input validation',
  'Create user guide',
  'Fix responsive layout',
  'Implement caching',
  'Add search functionality',
  'Create admin panel',
  'Set up backup system',
  'Optimize images',
  'Add loading states',
  'Implement pagination',
  'Create onboarding flow',
  'Add export feature',
  'Fix memory leak',
  'Update API documentation',
  'Add keyboard shortcuts',
  'Implement undo/redo',
]

type Priority = 'low' | 'medium' | 'high' | 'urgent' | 'none'
type Size = 'xs' | 's' | 'm' | 'l' | 'xl' | null
type AdminRole = 'super_admin' | 'moderator' | 'support'

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent', 'none']
const SIZES: Size[] = ['xs', 's', 'm', 'l', 'xl', null]

let cachedPasswordHash: string | null = null

async function getPasswordHash(): Promise<string> {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await hashPassword('password123')
  }
  return cachedPasswordHash
}

async function createUsersBatch(users: {
  email: string
  name: string
  adminRole?: AdminRole
  createdAt?: Date
}[]): Promise<string[]> {
  const hashedPassword = await getPasswordHash()

  const userValues = users.map(u => ({
    id: generateId(),
    name: u.name,
    email: u.email,
    emailVerified: true,
    adminRole: u.adminRole,
    createdAt: u.createdAt ?? new Date(),
  }))

  await db.insert(schema.users).values(userValues)

  await db.insert(schema.accounts).values(
    userValues.map(u => ({
      id: generateId(),
      accountId: u.id,
      providerId: 'credential',
      userId: u.id,
      password: hashedPassword,
      createdAt: u.createdAt,
    }))
  )

  const workspaceSlugs = userValues.map(u => `personal-${u.id.slice(0, 8)}`)

  await db.insert(schema.workspaces).values(
    userValues.map((u, i) => ({
      name: 'Personal',
      slug: workspaceSlugs[i],
      personal: true,
      createdAt: u.createdAt,
    }))
  )

  const workspaces = await db.query.workspaces.findMany({
    where: inArray(schema.workspaces.slug, workspaceSlugs),
  })

  const slugToWorkspace = new Map(workspaces.map(w => [w.slug, w.id]))

  await db.insert(schema.members).values(
    userValues.map((u, i) => ({
      workspaceId: slugToWorkspace.get(workspaceSlugs[i])!,
      userId: u.id,
      role: 'owner' as const,
      createdAt: u.createdAt,
    }))
  )

  return userValues.map(u => u.id)
}

async function cleanDatabase() {
  console.log('Cleaning existing data...')
  const tables = [
    schema.notifications,
    schema.commentMentions,
    schema.comments,
    schema.attachments,
    schema.checklistItems,
    schema.checklists,
    schema.taskLabels,
    schema.taskAssignees,
    schema.taskDependencies,
    schema.activities,
    schema.idempotencyKeys,
    schema.starredBoards,
    schema.tasks,
    schema.columns,
    schema.labels,
    schema.boardMembers,
    schema.boards,
    schema.boardTemplates,
    schema.taskTemplates,
    schema.members,
    schema.workspaces,
    schema.sessions,
    schema.accounts,
    schema.verifications,
    schema.users,
  ]

  for (const table of tables) {
    await db.delete(table)
  }
}

async function ensureSearchVectors() {
  console.log('Ensuring search vectors exist...')
  await db.execute(sql`
    ALTER TABLE boards
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED
  `)
  await db.execute(sql`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
    ) STORED
  `)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_boards_search_vector ON boards USING gin(search_vector)`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tasks_search_vector ON tasks USING gin(search_vector)`)
}

async function createEcommerceBoard(
  workspaceId: string,
  ownerId: string,
  memberIds: string[],
  position: string
) {
  console.log('Creating e-commerce board with realistic data...')

  const [board] = await db.insert(schema.boards).values({
    name: 'ShopFlow E-Commerce Platform',
    description: 'Complete e-commerce website development project. Building a modern, scalable online shopping platform with React frontend and Node.js backend.',
    workspaceId,
    ownerId,
    position,
    visibility: 'private',
  }).returning()

  await db.insert(schema.boardMembers).values(
    memberIds.map((id, index) => ({
      boardId: board.id,
      userId: id,
      role: (index === 0 ? 'admin' : 'member') as 'admin' | 'member',
    }))
  )

  const labels = await db.insert(schema.labels).values(
    ECOMMERCE_LABELS.map(l => ({ ...l, boardId: board.id }))
  ).returning()

  const labelMap = new Map(labels.map(l => [l.name, l.id]))

  const colPositions = generatePositions(null, null, ECOMMERCE_COLUMNS.length)
  const columns = await db.insert(schema.columns).values(
    ECOMMERCE_COLUMNS.map((name, i) => ({
      name,
      boardId: board.id,
      position: colPositions[i],
    }))
  ).returning()

  const taskLabelsToInsert: { taskId: string; labelId: string }[] = []
  const taskAssigneesToInsert: { taskId: string; userId: string; assignedBy: string }[] = []
  const commentsToInsert: { taskId: string; userId: string; content: string }[] = []
  const checklistsToInsert: { taskId: string; title: string; position: string }[] = []

  for (const col of columns) {
    const tasksForColumn = ECOMMERCE_TASKS[col.name] || []
    if (tasksForColumn.length === 0) continue

    const taskPositions = generatePositions(null, null, tasksForColumn.length)
    const tasks = await db.insert(schema.tasks).values(
      tasksForColumn.map((t, i) => {
        const hasDates = Math.random() > 0.3
        const startDate = hasDates ? randomDate(-14, 7) : null
        const dueDate = startDate ? new Date(startDate.getTime() + (Math.random() * 14 + 3) * 24 * 60 * 60 * 1000) : null

        return {
          title: t.title,
          description: t.description,
          columnId: col.id,
          position: taskPositions[i],
          priority: pick(PRIORITIES) as Priority,
          size: pick(SIZES) as Size,
          startDate,
          dueDate,
        }
      })
    ).returning()

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      const taskData = tasksForColumn[i]

      for (const labelName of taskData.labels) {
        const labelId = labelMap.get(labelName)
        if (labelId) {
          taskLabelsToInsert.push({ taskId: task.id, labelId })
        }
      }

      const numAssignees = Math.floor(Math.random() * 3) + 1
      const assignees = pickN(memberIds, numAssignees)
      for (const userId of assignees) {
        taskAssigneesToInsert.push({ taskId: task.id, userId, assignedBy: ownerId })
      }

      const numComments = Math.floor(Math.random() * 4) + 1
      for (let j = 0; j < numComments; j++) {
        commentsToInsert.push({
          taskId: task.id,
          userId: pick(memberIds),
          content: pick(ECOMMERCE_COMMENTS),
        })
      }

      if (Math.random() > 0.5) {
        checklistsToInsert.push({
          taskId: task.id,
          title: pick(['Acceptance Criteria', 'Technical Tasks', 'QA Checklist', 'Deploy Checklist']),
          position: 'a',
        })
      }
    }
  }

  if (taskLabelsToInsert.length > 0) await db.insert(schema.taskLabels).values(taskLabelsToInsert)
  if (taskAssigneesToInsert.length > 0) await db.insert(schema.taskAssignees).values(taskAssigneesToInsert)
  if (commentsToInsert.length > 0) await db.insert(schema.comments).values(commentsToInsert)

  if (checklistsToInsert.length > 0) {
    const checklists = await db.insert(schema.checklists).values(checklistsToInsert).returning()
    const checklistItems: { checklistId: string; content: string; isCompleted: boolean; position: string }[] = []

    for (const cl of checklists) {
      const numItems = Math.floor(Math.random() * 5) + 3
      const itemPositions = generatePositions(null, null, numItems)
      const itemTemplates = [
        'Write unit tests for new functionality',
        'Update API documentation',
        'Code review completed',
        'QA sign-off obtained',
        'Performance benchmarks meet requirements',
        'Security review passed',
        'Accessibility compliance verified',
        'Cross-browser testing done',
        'Mobile responsiveness verified',
        'Error handling implemented',
        'Logging and monitoring added',
        'Database migrations tested',
      ]

      for (let i = 0; i < numItems; i++) {
        checklistItems.push({
          checklistId: cl.id,
          content: itemTemplates[i % itemTemplates.length],
          isCompleted: Math.random() > 0.4,
          position: itemPositions[i],
        })
      }
    }

    if (checklistItems.length > 0) await db.insert(schema.checklistItems).values(checklistItems)
  }

  return board.id
}

async function createRandomBoard(
  workspaceId: string,
  ownerId: string,
  memberIds: string[],
  position: string,
  boardName: string
) {
  const [board] = await db.insert(schema.boards).values({
    name: boardName,
    workspaceId,
    ownerId,
    position,
    visibility: Math.random() > 0.7 ? 'public' : 'private',
  }).returning()

  await db.insert(schema.boardMembers).values(
    memberIds.slice(0, Math.floor(Math.random() * memberIds.length) + 1).map((id, index) => ({
      boardId: board.id,
      userId: id,
      role: (index === 0 ? 'admin' : 'member') as 'admin' | 'member',
    }))
  )

  const labelData = pickN(ECOMMERCE_LABELS, Math.floor(Math.random() * 6) + 3)
  const labels = await db.insert(schema.labels).values(
    labelData.map(l => ({ ...l, boardId: board.id }))
  ).returning()

  const colNames = pickN(['To Do', 'In Progress', 'Review', 'Done', 'Backlog', 'Testing', 'Blocked'], Math.floor(Math.random() * 4) + 3)
  const colPositions = generatePositions(null, null, colNames.length)
  const columns = await db.insert(schema.columns).values(
    colNames.map((name, i) => ({
      name,
      boardId: board.id,
      position: colPositions[i],
    }))
  ).returning()

  const taskLabelsToInsert: { taskId: string; labelId: string }[] = []
  const taskAssigneesToInsert: { taskId: string; userId: string; assignedBy: string }[] = []

  for (const col of columns) {
    const numTasks = Math.floor(Math.random() * 8) + 2
    const taskPositions = generatePositions(null, null, numTasks)

    const tasks = await db.insert(schema.tasks).values(
      Array.from({ length: numTasks }).map((_, i) => {
        const hasDates = Math.random() > 0.5
        const startDate = hasDates ? randomDate(-30, 14) : null
        const dueDate = startDate ? new Date(startDate.getTime() + (Math.random() * 21 + 1) * 24 * 60 * 60 * 1000) : null

        return {
          title: pick(RANDOM_TASK_TITLES),
          columnId: col.id,
          position: taskPositions[i],
          priority: pick(PRIORITIES) as Priority,
          size: pick(SIZES) as Size,
          startDate,
          dueDate,
        }
      })
    ).returning()

    for (const task of tasks) {
      const numLabels = Math.floor(Math.random() * 3)
      for (const label of pickN(labels, numLabels)) {
        taskLabelsToInsert.push({ taskId: task.id, labelId: label.id })
      }

      if (Math.random() > 0.6) {
        taskAssigneesToInsert.push({
          taskId: task.id,
          userId: pick(memberIds),
          assignedBy: ownerId,
        })
      }
    }
  }

  if (taskLabelsToInsert.length > 0) await db.insert(schema.taskLabels).values(taskLabelsToInsert)
  if (taskAssigneesToInsert.length > 0) await db.insert(schema.taskAssignees).values(taskAssigneesToInsert)

  return board.id
}

async function seed() {
  console.log('=== KYTE SEED SCRIPT ===')
  console.log('')

  await ensureSearchVectors()
  await cleanDatabase()

  console.log('Pre-hashing password...')
  await getPasswordHash()

  console.log('Creating admin users (admin, mod, support)...')
  const [adminId, modId, supportId] = await createUsersBatch([
    { email: 'admin@kyte.dev', name: 'Admin User', adminRole: 'super_admin' },
    { email: 'mod_1@kyte.dev', name: 'Moderator One', adminRole: 'moderator' },
    { email: 'support_1@kyte.dev', name: 'Support Agent', adminRole: 'support' },
  ])

  console.log('Creating dev team (dev_1@ to dev_10@)...')
  const devIds = await createUsersBatch(
    Array.from({ length: 10 }, (_, i) => ({
      email: `dev_${i + 1}@kyte.dev`,
      name: `Developer ${i + 1}`,
      createdAt: randomDate(14, 0),
    }))
  )
  const leadDevId = devIds[0]

  console.log('Creating many regular users (user_1@ to user_500@)...')
  const BATCH_SIZE = 100
  const totalRegularUsers = 500
  const userIds: string[] = []

  for (let i = 0; i < totalRegularUsers; i += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, totalRegularUsers - i) }, (_, j) => {
      const idx = i + j + 1
      return {
        email: `user_${idx}@kyte.dev`,
        name: `User ${idx}`,
        createdAt: randomDate(14, 0),
      }
    })
    const ids = await createUsersBatch(batch)
    userIds.push(...ids)
  }

  console.log('')
  console.log('Creating dev team workspace...')
  const [devWorkspace] = await db.insert(schema.workspaces).values({
    name: 'ShopFlow Development Team',
    slug: `shopflow-dev-${Date.now()}`,
    personal: false,
    createdAt: randomDate(14, 0),
  }).returning()

  await db.insert(schema.members).values(
    devIds.map((id, index) => ({
      workspaceId: devWorkspace.id,
      userId: id,
      role: (index === 0 ? 'owner' : 'member') as 'owner' | 'member',
      createdAt: randomDate(14, 0),
    }))
  )

  const devBoardPositions = generatePositions(null, null, 2)
  await createEcommerceBoard(devWorkspace.id, leadDevId, devIds, devBoardPositions[0])

  const [devBoard2] = await db.insert(schema.boards).values({
    name: 'Team Sprint Board',
    description: 'Current sprint tasks and bug fixes',
    workspaceId: devWorkspace.id,
    ownerId: leadDevId,
    position: devBoardPositions[1],
    visibility: 'private',
    createdAt: randomDate(14, 0),
  }).returning()

  await db.insert(schema.boardMembers).values(
    devIds.map((id, index) => ({
      boardId: devBoard2.id,
      userId: id,
      role: (index === 0 ? 'admin' : 'member') as 'admin' | 'member',
      createdAt: randomDate(14, 0),
    }))
  )

  const sprintCols = ['To Do', 'In Progress', 'Done']
  const sprintColPositions = generatePositions(null, null, 3)
  await db.insert(schema.columns).values(
    sprintCols.map((name, i) => ({
      name,
      boardId: devBoard2.id,
      position: sprintColPositions[i],
      createdAt: randomDate(14, 0),
    }))
  )

  console.log('')
  console.log('Creating random boards for regular users...')
  let boardCount = 0
  const totalRandomBoards = 100

  const ownerMemberships = await db
    .select({ userId: schema.members.userId, workspaceId: schema.members.workspaceId })
    .from(schema.members)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.members.workspaceId))
    .where(eq(schema.workspaces.personal, true))

  const userToWorkspace = new Map(ownerMemberships.map(m => [m.userId, m.workspaceId]))

  for (let i = 0; i < totalRandomBoards; i++) {
    const ownerId = pick(userIds)
    const ownerWorkspaceId = userToWorkspace.get(ownerId)
    if (!ownerWorkspaceId) continue

    const boardPosition = generatePositions(null, null, 1)[0]
    const potentialMembers = pickN(userIds.filter(id => id !== ownerId), Math.floor(Math.random() * 5) + 1)

    await createRandomBoard(
      ownerWorkspaceId,
      ownerId,
      [ownerId, ...potentialMembers],
      boardPosition,
      pick(RANDOM_BOARD_NAMES)
    )

    boardCount++
  }
  console.log(`  Created ${boardCount} random boards`)

  console.log('')
  console.log('Creating fake admin audit logs...')
  const ADMIN_ACTIONS = [
    'USER_PROMOTED', 'USER_DEMOTED', 'TEMPLATE_APPROVED', 'TEMPLATE_REJECTED',
    'USER_SESSIONS_REVOKED', 'USER_PASSWORD_RESET', 'USER_EXPORTED', 'USER_DELETION_CANCELED'
  ]
  const TARGET_TYPES = ['user', 'template', 'board']
  
  await db.insert(schema.adminAuditLog).values(
    Array.from({ length: 50 }, () => ({
      adminId: pick([adminId, modId, supportId]),
      action: pick(ADMIN_ACTIONS),
      targetType: pick(TARGET_TYPES),
      targetId: generateId(),
      createdAt: randomDate(7, 0),
      metadata: { note: 'Generated by seed script' }
    }))
  )

  console.log('Creating pending templates for moderation...')
  await db.insert(schema.boardTemplates).values(
    Array.from({ length: 15 }, (_, i) => ({
      name: `Template ${i + 1}: ${pick(RANDOM_BOARD_NAMES)}`,
      description: 'Useful starting point for new projects.',
      createdBy: pick(userIds),
      columnDefinitions: [
        { name: 'To Do', position: 'a' },
        { name: 'Doing', position: 'b' },
        { name: 'Done', position: 'c' }
      ],
      status: (i < 5 ? 'pending' : i < 10 ? 'approved' : 'rejected') as 'pending' | 'approved' | 'rejected',
      isPublic: true,
      createdAt: randomDate(5, 0),
      submittedAt: randomDate(5, 0)
    }))
  )

  console.log('')
  console.log('Verifying seed data...')
  const userCount = await db.select({ count: sql`count(*)` }).from(schema.users)
  const boardCountActual = await db.select({ count: sql`count(*)` }).from(schema.boards)
  const logCount = await db.select({ count: sql`count(*)` }).from(schema.adminAuditLog)
  const templateCount = await db.select({ count: sql`count(*)` }).from(schema.boardTemplates)

  console.log(`  Users: ${userCount[0].count}`)
  console.log(`  Boards: ${boardCountActual[0].count}`)
  console.log(`  Audit Logs: ${logCount[0].count}`)
  console.log(`  Templates: ${templateCount[0].count}`)

  console.log('')
  console.log('=== SEED COMPLETE ===')
  console.log('')
  console.log('Created users:')
  console.log('  - admin@kyte.dev (super_admin)')
  console.log('  - mod_1@kyte.dev (moderator)')
  console.log('  - support_1@kyte.dev (support)')
  console.log(`  - dev team and ${totalRegularUsers} regular users`)
  console.log('')
  console.log('Password for all users: password123')
  console.log('')
  console.log('Featured board:')
  console.log('  - ShopFlow E-Commerce Platform (owned by dev_1@kyte.dev)')
  console.log('')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
