import { PacketQueue, createPacket } from './queue'
import { buildTrafficPlan, type TrafficSeed } from './traffic'
import type {
  AttackMode,
  FirewallRule,
  LinkState,
  NodeState,
  SimulationEvent,
  SimulationEventType,
  SimulationSnapshot,
} from './types'

interface InternalNode extends NodeState {
  queue: PacketQueue
}

interface InternalLink extends LinkState {
  recentBytes: number
}

type EventListener = (event: SimulationEvent) => void

interface InternalFirewallRule extends FirewallRule {
  start: number
  end: number
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function ipToNumber(ip: string): number {
  return ip
    .split('.')
    .map(Number)
    .reduce((acc, value) => (acc << 8) + value, 0)
}

export class NetworkSimulation {
  private nodes: Map<string, InternalNode>
  private links: InternalLink[]
  private listeners: EventListener[] = []
  private events: SimulationEvent[] = []
  private attackMode: AttackMode = 'idle'
  private firewallRules: InternalFirewallRule[] = []
  private appServerCount = 1
  private serviceRotation = 0

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

    this.nodes.forEach((node) => this.attachQueueListener(node))
  }

  private attachQueueListener(node: InternalNode) {
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
    })
  }

  onEvent(listener: EventListener) {
    this.listeners.push(listener)
  }

  setAttackMode(mode: AttackMode) {
    this.attackMode = mode
    this.recordEvent('firewall.updated', {
      detail: `Attack profile switched to ${mode.toUpperCase()}`,
      trafficType: 'attacker',
    })
  }

  addAppServer() {
    this.appServerCount += 1
    const id = `app-${this.appServerCount}`
    const label = `App Server ${this.appServerCount}`
    const processingRate = 5 + Math.floor(Math.random() * 3)
    const queueCapacity = 12 + Math.floor(Math.random() * 6)

    const node: InternalNode = {
      id,
      label,
      role: 'service',
      processingRate,
      queueCapacity,
      queueDepth: 0,
      processedCount: 0,
      droppedCount: 0,
      processing: false,
      queue: new PacketQueue(queueCapacity),
    }

    this.nodes.set(id, node)
    this.attachQueueListener(node)

    this.links.push({
      id: `core-${id}`,
      source: 'core',
      target: id,
      bandwidth: 110 + Math.floor(Math.random() * 30),
      utilization: 0,
      recentBytes: 0,
    })

    this.recordEvent('topology.updated', {
      detail: `${label} added behind the load balancer`,
      trafficType: 'legitimate',
    })
  }

  addFirewallRule(rule: { startIp: string; endIp: string; label?: string }) {
    const normalized: InternalFirewallRule = {
      id: crypto.randomUUID(),
      label: rule.label ?? `${rule.startIp} → ${rule.endIp}`,
      startIp: rule.startIp,
      endIp: rule.endIp,
      start: ipToNumber(rule.startIp),
      end: ipToNumber(rule.endIp),
    }
    this.firewallRules = [normalized, ...this.firewallRules].slice(0, 6)
    this.recordEvent('firewall.updated', {
      detail: `New firewall block: ${normalized.label}`,
      trafficType: 'attacker',
    })
  }

  getFirewallRules(): FirewallRule[] {
    return this.firewallRules.map(({ start, end, ...rule }) => rule)
  }

  getAttackMode() {
    return this.attackMode
  }

  private matchesFirewall(ip: string): boolean {
    const numeric = ipToNumber(ip)
    return this.firewallRules.some((rule) => numeric >= rule.start && numeric <= rule.end)
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
    const ingress = this.nodes.get('ingress')!
    const plan = buildTrafficPlan(this.attackMode)
    const seeds: TrafficSeed[] = [...plan.legitimate, ...plan.attacker]

    seeds.forEach((seed) => {
      const packet = createPacket(seed.type, seed)

      if (packet.type === 'attacker' && this.matchesFirewall(packet.sourceIp)) {
        ingress.droppedCount += 1
        this.recordEvent('packet.filtered', {
          detail: `Firewall dropped attack from ${packet.sourceIp}`,
          nodeId: ingress.id,
          trafficType: packet.type,
        })
        return
      }

      const accepted = ingress.queue.enqueue(ingress.id, packet)
      ingress.queueDepth = ingress.queue.depth()

      this.recordEvent('packet.generated', {
        detail: `${packet.type === 'legitimate' ? 'User' : 'Adversary'} packet (${packet.size}B) from ${packet.sourceIp} arrived at ingress`,
        nodeId: ingress.id,
        trafficType: packet.type,
      })

      if (!accepted) {
        ingress.droppedCount += 1
      }
    })
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

        const chosen = node.id === 'core' ? this.selectBalancedLink(availableLinks) : randomChoice(availableLinks)
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

  private selectBalancedLink(links: InternalLink[]): InternalLink {
    const serviceLinks = links.filter((link) => this.nodes.get(link.target)?.role === 'service')
    if (serviceLinks.length) {
      const useServicePath = Math.random() > 0.12 || links.length === serviceLinks.length
      if (useServicePath) {
        const link = serviceLinks[this.serviceRotation % serviceLinks.length]
        this.serviceRotation += 1
        return link
      }
    }

    return randomChoice(links)
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
      attackMode: this.attackMode,
      firewallRules: this.getFirewallRules(),
    }
  }
}
