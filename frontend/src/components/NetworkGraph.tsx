import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import * as d3 from 'd3'
import { NetworkSimulation } from '../simulation/network'
import type { LinkState, SimulationEvent, SimulationSnapshot } from '../simulation/types'

interface PositionedNode {
  id: string
  x: number
  y: number
  vx?: number
  vy?: number
  label: string
  role: string
  processing: boolean
  queueDepth: number
  queueCapacity: number
  processedCount: number
  droppedCount: number
}

interface GraphState {
  snapshot: SimulationSnapshot
  positionedNodes: PositionedNode[]
}

const width = 960
const height = 520

const roleColor: Record<string, string> = {
  gateway: '#4c6fff',
  router: '#30bced',
  service: '#22c55e',
  db: '#f97316',
}

function initializePositions(snapshot: SimulationSnapshot): PositionedNode[] {
  const angleStep = (2 * Math.PI) / snapshot.nodes.length
  return snapshot.nodes.map((node, index) => {
    const angle = index * angleStep
    return {
      ...node,
      x: width / 2 + Math.cos(angle) * 220,
      y: height / 2 + Math.sin(angle) * 220,
    }
  })
}

export function NetworkGraph() {
  const simulationRef = useRef(new NetworkSimulation())
  const [graphState, setGraphState] = useState<GraphState>(() => {
    const snapshot = simulationRef.current.snapshot()
    return { snapshot, positionedNodes: initializePositions(snapshot) }
  })
  const [events, setEvents] = useState<SimulationEvent[]>([])

  useEffect(() => {
    const sim = simulationRef.current
    const interval = setInterval(() => {
      sim.tick()
      const snapshot = sim.snapshot()
      setGraphState((prev) => ({
        snapshot,
        positionedNodes: mergeNodeState(prev.positionedNodes, snapshot.nodes),
      }))
      setEvents(snapshot.events)
    }, 900)

    return () => clearInterval(interval)
  }, [])

  useForceLayout(graphState, setGraphState)

  return (
    <div className="network-graph">
      <div className="graph-panel">
        <h2>Network flow simulation</h2>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Network graph">
          {graphState.snapshot.links.map((link) => (
            <LinkPath key={link.id} link={link} nodes={graphState.positionedNodes} />
          ))}
          {graphState.positionedNodes.map((node) => (
            <NodeCircle key={node.id} node={node} />
          ))}
        </svg>
      </div>
      <div className="graph-sidebar" aria-label="Simulation insights">
        <EventFeed events={events} />
        <NodeQueueList nodes={graphState.snapshot.nodes} />
      </div>
    </div>
  )
}

function useForceLayout(graphState: GraphState, setGraphState: Dispatch<SetStateAction<GraphState>>) {
  const nodesRef = useRef<PositionedNode[]>(graphState.positionedNodes)
  const linksRef = useRef<LinkState[]>(graphState.snapshot.links)

  useEffect(() => {
    nodesRef.current = mergeNodeState(nodesRef.current, graphState.snapshot.nodes)
  }, [graphState.snapshot.nodes])

  useEffect(() => {
    linksRef.current = graphState.snapshot.links
  }, [graphState.snapshot.links])

  useEffect(() => {
    const sim = d3
      .forceSimulation(nodesRef.current)
      .force(
        'link',
        d3
          .forceLink(linksRef.current)
          .id((node) => (node as PositionedNode).id)
          .distance(140)
          .strength(0.25),
      )
      .force('charge', d3.forceManyBody().strength(-520))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(70))
      .on('tick', () => {
        nodesRef.current.forEach((node) => {
          node.x = Math.max(40, Math.min(width - 40, node.x))
          node.y = Math.max(40, Math.min(height - 40, node.y))
        })
        setGraphState((prev) => ({
          snapshot: prev.snapshot,
          positionedNodes: [...nodesRef.current],
        }))
      })

    return () => sim.stop()
  }, [graphState.snapshot.links.length, graphState.snapshot.nodes.length, setGraphState])
}

function mergeNodeState(existing: PositionedNode[], incoming: SimulationSnapshot['nodes']): PositionedNode[] {
  const byId = new Map(existing.map((node) => [node.id, node]))
  return incoming.map((node, index) => {
    const base =
      byId.get(node.id) ?? {
        ...node,
        x: width / 2 + Math.cos(index) * 150,
        y: height / 2 + Math.sin(index) * 150,
      }
    return {
      ...base,
      ...node,
    }
  })
}

function NodeCircle({ node }: { node: PositionedNode }) {
  const color = roleColor[node.role] ?? '#0ea5e9'
  const radius = 20 + Math.min(16, (node.queueDepth / node.queueCapacity) * 24)
  return (
    <g>
      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill={color}
        className={node.processing ? 'node-processing' : ''}
        opacity={node.processing ? 0.85 : 0.7}
        stroke="#0f172a"
        strokeWidth={1.5}
      />
      <text x={node.x} y={node.y + 5} textAnchor="middle" className="node-label">
        {node.label}
      </text>
      <text x={node.x} y={node.y + radius + 16} textAnchor="middle" className="node-meta">
        Queue {node.queueDepth}/{node.queueCapacity} · Dropped {node.droppedCount}
      </text>
    </g>
  )
}

function LinkPath({ link, nodes }: { link: LinkState; nodes: PositionedNode[] }) {
  const source = nodes.find((node) => node.id === link.source)
  const target = nodes.find((node) => node.id === link.target)
  if (!source || !target) return null

  const thickness = 2 + link.utilization * 10
  const color = link.utilization > 0.7 ? '#ef4444' : link.utilization > 0.4 ? '#eab308' : '#cbd5e1'

  return (
    <line
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      stroke={color}
      strokeWidth={thickness}
      strokeLinecap="round"
      opacity={0.9}
    />
  )
}

function EventFeed({ events }: { events: SimulationEvent[] }) {
  return (
    <div className="event-feed">
      <h3>Recent events</h3>
      <ul>
        {events.length === 0 && <li className="muted">No events yet</li>}
        {events.map((event) => (
          <li key={event.id}>
            <span className={`pill ${event.trafficType === 'attacker' ? 'critical' : 'healthy'}`}>
              {event.trafficType ?? 'sys'}
            </span>
            <div>
              <p className="event-title">{event.detail}</p>
              <p className="event-time">{new Date(event.at).toLocaleTimeString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NodeQueueList({ nodes }: { nodes: SimulationSnapshot['nodes'] }) {
  return (
    <div className="queue-list">
      <h3>Queue depths</h3>
      <div className="queue-grid">
        {nodes.map((node) => {
          const fill = Math.min(100, (node.queueDepth / node.queueCapacity) * 100)
          return (
            <div key={node.id} className="queue-card">
              <header>
                <p className="eyebrow">{node.role}</p>
                <p className="queue-label">{node.label}</p>
              </header>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${fill}%` }} />
              </div>
              <p className="queue-meta">
                {node.queueDepth} / {node.queueCapacity} in queue · {node.processedCount} processed
              </p>
              <p className="queue-meta muted">Dropped {node.droppedCount} packets</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
