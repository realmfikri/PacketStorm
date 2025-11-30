import { PacketQueue, createPacket } from './queue'
import type { LinkState, NodeState, SimulationEvent, SimulationEventType, SimulationSnapshot, TrafficType } from './types'

interface InternalNode extends NodeState {
  queue: PacketQueue
}

interface InternalLink extends LinkState {
  recentBytes: number
}

type EventListener = (event: SimulationEvent) => void

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export class NetworkSimulation {
  private nodes: Map<string, InternalNode>
  private links: InternalLink[]
  private listeners: EventListener[] = []
  private events: SimulationEvent[] = []

  constructor() {
    this.nodes = new Map(
      [
        { id: 'ingress', label: 'Edge Gateway', role: 'gateway', processingRate: 8, queueCapacity: 24 },
        { id: 'core', label: 'Core Router', role: 'router', processingRate: 10, queueCapacity: 32 },
        { id: 'app', label: 'App Service', role: 'service', processingRate: 6, queueCapacity: 14 },
        { id: 'db', label: 'DB Cluster', role: 'db', processingRate: 4, queueCapacity: 16 },
      ].map((node) => [
        node.id,
        {
          ...node,
          queue: new PacketQueue(node.queueCapacity),
          queueDepth: 0,
          processedCount: 0,
          droppedCount: 0,
          processing: false,
        },
      ]),
    )

    this.links = [
      { id: 'ingress-core', source: 'ingress', target: 'core', bandwidth: 150, utilization: 0, recentBytes: 0 },
      { id: 'core-app', source: 'core', target: 'app', bandwidth: 120, utilization: 0, recentBytes: 0 },
      { id: 'core-db', source: 'core', target: 'db', bandwidth: 90, utilization: 0, recentBytes: 0 },
    ]

    this.nodes.forEach((node) =>
      node.queue.onUpdate(({ nodeId, packet, reason }) => {
        if (reason === 'dropped') {
          node.droppedCount += 1
          this.recordEvent('packet.dropped', {
            detail: `Queue full on ${node.label}; dropped ${packet.type} packet (${packet.size}B)`,
            nodeId,
            trafficType: packet.type,
          })
        } else {
          node.queueDepth = node.queue.depth()
        }
      }),
    )
  }

  onEvent(listener: EventListener) {
    this.listeners.push(listener)
  }

  private recordEvent(type: SimulationEventType, data: Omit<SimulationEvent, 'id' | 'at' | 'type'>) {
    const event: SimulationEvent = {
      id: crypto.randomUUID(),
      at: Date.now(),
      type,
      ...data,
    }
    this.events = [event, ...this.events].slice(0, 25)
    this.listeners.forEach((listener) => listener(event))
  }

  tick() {
    this.generateTraffic()
    this.forwardPackets()
    this.decayUtilization()
  }

  private generateTraffic() {
    const trafficBurst = Math.floor(Math.random() * 5) + 2
    for (let i = 0; i < trafficBurst; i += 1) {
      const type: TrafficType = Math.random() > 0.75 ? 'attacker' : 'legitimate'
      const packet = createPacket(type)
      const ingress = this.nodes.get('ingress')!
      const accepted = ingress.queue.enqueue(ingress.id, packet)
      ingress.queueDepth = ingress.queue.depth()

      this.recordEvent('packet.generated', {
        detail: `${type === 'legitimate' ? 'User' : 'Adversary'} packet (${packet.size}B) arrived at ingress`,
        nodeId: ingress.id,
        trafficType: packet.type,
      })

      if (!accepted) {
        ingress.droppedCount += 1
      }
    }
  }

  private forwardPackets() {
    this.nodes.forEach((node) => {
      const processed = node.queue.process(node.id, node.processingRate)
      node.queueDepth = node.queue.depth()
      node.processing = processed.length > 0
      node.processedCount += processed.length

      processed.forEach((packet) => {
        const availableLinks = this.links.filter((link) => link.source === node.id)
        if (!availableLinks.length) return

        const chosen = randomChoice(availableLinks)
        const destination = this.nodes.get(chosen.target)
        if (!destination) return

        const accepted = destination.queue.enqueue(destination.id, packet)
        destination.queueDepth = destination.queue.depth()
        chosen.recentBytes += packet.size

        if (!accepted) {
          destination.droppedCount += 1
        } else {
          this.recordEvent('packet.forwarded', {
            detail: `${packet.type} packet forwarded from ${node.label} to ${destination.label}`,
            nodeId: destination.id,
            linkId: chosen.id,
            trafficType: packet.type,
          })
        }
      })
    })
  }

  private decayUtilization() {
    this.links.forEach((link) => {
      const utilization = Math.min(1, link.recentBytes / (link.bandwidth * 10))
      link.utilization = Math.max(utilization, link.utilization * 0.35)
      link.recentBytes = 0
    })
  }

  snapshot(): SimulationSnapshot {
    return {
      nodes: Array.from(this.nodes.values()).map((node) => ({
        id: node.id,
        label: node.label,
        role: node.role,
        processingRate: node.processingRate,
        queueCapacity: node.queueCapacity,
        queueDepth: node.queueDepth,
        processedCount: node.processedCount,
        droppedCount: node.droppedCount,
        processing: node.processing,
      })),
      links: this.links.map((link) => ({
        id: link.id,
        source: link.source,
        target: link.target,
        bandwidth: link.bandwidth,
        utilization: link.utilization,
      })),
      events: this.events,
    }
  }
}
