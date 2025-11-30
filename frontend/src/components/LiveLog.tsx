import { useMemo } from 'react'
import { useSimulationStore } from '../simulation/store'
import type { SimulationEvent } from '../simulation/types'

function statusFor(event: SimulationEvent) {
  switch (event.type) {
    case 'packet.forwarded':
    case 'packet.generated':
      return { label: 'Accepted 200 OK', tone: 'healthy' }
    case 'packet.dropped':
      return { label: 'Dropped (Queue Full)', tone: 'critical' }
    case 'packet.filtered':
      return { label: 'Dropped (Firewall)', tone: 'warning' }
    case 'topology.updated':
    case 'firewall.updated':
    default:
      return { label: 'System Event', tone: 'neutral' }
  }
}

export function LiveLog() {
  const events = useSimulationStore((state) => state.snapshot.events)

  const decorated = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        status: statusFor(event),
      })),
    [events],
  )

  return (
    <div className="event-feed" aria-live="polite" aria-label="Live event log">
      <h3>Live log</h3>
      <ul>
        {decorated.length === 0 && <li className="muted">Simulation has not emitted any events yet.</li>}
        {decorated.map((event) => (
          <li key={event.id}>
            <span className={`pill ${event.status.tone}`}>{event.status.label}</span>
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
