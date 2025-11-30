import { describe, expect, it } from 'vitest'
import { PacketQueue } from './queue'
import type { Packet } from './types'

const packet = (overrides: Partial<Packet> = {}): Packet => ({
  id: overrides.id ?? 'p-' + crypto.randomUUID(),
  size: overrides.size ?? 200,
  createdAt: overrides.createdAt ?? Date.now(),
  type: overrides.type ?? 'legitimate',
  sourceIp: overrides.sourceIp ?? '10.0.0.1',
})

describe('PacketQueue', () => {
  it('drops packets that exceed capacity and reports depth', () => {
    const queue = new PacketQueue(2)
    const events: { reason: 'dropped' | 'accepted'; packet: Packet }[] = []

    queue.onUpdate(({ packet, reason }) => events.push({ packet, reason }))

    const first = packet({ id: 'first' })
    const second = packet({ id: 'second' })
    const overflow = packet({ id: 'overflow' })

    expect(queue.enqueue('ingress', first)).toBe(true)
    expect(queue.enqueue('ingress', second)).toBe(true)
    expect(queue.enqueue('ingress', overflow)).toBe(false)
    expect(queue.depth()).toBe(2)

    const processed = queue.process('ingress', 5)

    expect(processed.map((pkt) => pkt.id)).toEqual(['first', 'second'])
    expect(events.filter((evt) => evt.reason === 'accepted')).toHaveLength(4)
    expect(events.filter((evt) => evt.reason === 'dropped')).toHaveLength(1)
  })
})
