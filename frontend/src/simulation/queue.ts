import type { Packet, TrafficType } from './types'

type QueueListener = (payload: { nodeId: string; packet: Packet; reason: 'dropped' | 'accepted' }) => void

export class PacketQueue {
  readonly capacity: number
  private items: Packet[] = []
  private listeners: QueueListener[] = []

  constructor(capacity: number) {
    this.capacity = capacity
  }

  onUpdate(listener: QueueListener) {
    this.listeners.push(listener)
  }

  enqueue(nodeId: string, packet: Packet): boolean {
    if (this.items.length >= this.capacity) {
      this.emit(nodeId, packet, 'dropped')
      return false
    }

    this.items.push(packet)
    this.emit(nodeId, packet, 'accepted')
    return true
  }

  process(nodeId: string, maxPackets: number): Packet[] {
    const processed = this.items.splice(0, maxPackets)
    processed.forEach((packet) => this.emit(nodeId, packet, 'accepted'))
    return processed
  }

  drain(): Packet[] {
    return this.items.splice(0, this.items.length)
  }

  depth(): number {
    return this.items.length
  }

  private emit(nodeId: string, packet: Packet, reason: 'dropped' | 'accepted') {
    this.listeners.forEach((listener) => listener({ nodeId, packet, reason }))
  }
}

export function createPacket(type: TrafficType, seed?: Partial<Packet>): Packet {
  return {
    id: crypto.randomUUID(),
    size: Math.max(50, Math.round(Math.random() * 900)),
    createdAt: Date.now(),
    sourceIp: '0.0.0.0',
    type,
    ...seed,
  }
}
