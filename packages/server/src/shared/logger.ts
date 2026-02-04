type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
}

const RESET = '\x1b[0m'

const isProd = process.env.NODE_ENV === 'production'
const minLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? 'info']

function formatPretty(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level]
  const levelStr = entry.level.toUpperCase().padEnd(5)
  const time = entry.timestamp.split('T')[1].replace('Z', '')
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
  return `${color}[${time}]${RESET} ${color}${levelStr}${RESET} ${entry.message}${ctx}`
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry)
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (LOG_LEVELS[level] < minLevel) return

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  }

  const output = isProd ? formatJson(entry) : formatPretty(entry)

  if (level === 'error') {
    console.error(output)
  } else if (level === 'warn') {
    console.warn(output)
  } else {
    console.log(output)
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),

  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) => log('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) => log('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) => log('warn', message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext) => log('error', message, { ...baseContext, ...context }),
  }),
}

export type Logger = typeof logger
export type ChildLogger = ReturnType<typeof logger.child>
