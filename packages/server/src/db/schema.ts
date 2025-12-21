import { pgTable, varchar, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core'

export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const columns = pgTable('columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  order: integer('order').notNull(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }),
})

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  columnId: uuid('column_id').references(() => columns.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const table = { boards, columns, tasks } as const