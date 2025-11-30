export type TrafficType = 'legitimate' | 'attacker'

export interface Packet {
  id: string
  size: number
  createdAt: number
  type: TrafficType
}

export interface NodeState {
  id: string
  label: string
  role: 'gateway' | 'router' | 'db' | 'service'
  processingRate: number
  queueCapacity: number
  queueDepth: number
  processedCount: number
  droppedCount: number
  processing: boolean
}

export interface LinkState {
  id: string
  source: string
  target: string
  bandwidth: number
  utilization: number
}

export interface SimulationSnapshot {
  nodes: NodeState[]
  links: LinkState[]
  events: SimulationEvent[]
}

export type SimulationEventType = 'packet.dropped' | 'packet.forwarded' | 'packet.generated'

export interface SimulationEvent {
  id: string
  at: number
  type: SimulationEventType
  detail: string
  nodeId?: string
  linkId?: string
  trafficType?: TrafficType
}
