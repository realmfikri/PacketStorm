import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LiveLog } from './LiveLog'
import type { SimulationEvent } from '../simulation/types'

let mockEvents: SimulationEvent[] = []

vi.mock('../simulation/store', () => ({
  useSimulationStore: (selector: (state: { snapshot: { events: SimulationEvent[] } }) => any) =>
    selector({ snapshot: { events: mockEvents } }),
}))

describe('LiveLog', () => {
  it('renders decorated simulation events', () => {
    mockEvents = [
      {
        id: 'evt-1',
        at: 1_700_000_000_000,
        type: 'packet.forwarded',
        detail: 'Legitimate packet forwarded',
        trafficType: 'legitimate',
      },
      {
        id: 'evt-2',
        at: 1_700_000_000_500,
        type: 'packet.filtered',
        detail: 'Firewall blocked attacker',
        trafficType: 'attacker',
      },
    ]

    render(<LiveLog />)

    expect(screen.getByRole('heading', { name: /Live log/i })).toBeInTheDocument()
    expect(screen.getByText(/Legitimate packet forwarded/i)).toBeInTheDocument()
    expect(screen.getByText(/Firewall blocked attacker/i)).toBeInTheDocument()
    expect(screen.getByText(/Accepted 200 OK/i)).toBeInTheDocument()
    expect(screen.getByText(/Dropped \(Firewall\)/i)).toBeInTheDocument()
  })
})
