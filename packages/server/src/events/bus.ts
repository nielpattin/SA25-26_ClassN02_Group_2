import { EventEmitter } from 'node:events'
import type { KyteEvents } from './types'

class KyteEventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(20) 
  }

  emitDomain<K extends keyof KyteEvents>(event: K, payload: KyteEvents[K]): boolean {
    return super.emit(event, payload)
  }

  onDomain<K extends keyof KyteEvents>(event: K, listener: (payload: KyteEvents[K]) => void): this {
    return super.on(event, listener)
  }

  offDomain<K extends keyof KyteEvents>(event: K, listener: (payload: KyteEvents[K]) => void): this {
    return super.off(event, listener)
  }
}

export const eventBus = new KyteEventBus()
