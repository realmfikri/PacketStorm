import { afterEach, describe, expect, it, vi } from 'vitest'
import { NetworkSimulation } from './network'
import * as traffic from './traffic'
import type { TrafficSeed } from './traffic'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('NetworkSimulation', () => {
  it('drops attacker traffic that matches firewall rules', () => {
    const attackBurst: TrafficSeed[] = [
      { type: 'attacker', size: 320, sourceIp: '203.0.113.42' },
    ]

    vi.spyOn(traffic, 'buildTrafficPlan').mockReturnValue({ legitimate: [], attacker: attackBurst })

    const simulation = new NetworkSimulation()
    simulation.addFirewallRule({ startIp: '203.0.113.0', endIp: '203.0.113.255', label: 'Block red team' })

    simulation.tick()

    const snapshot = simulation.snapshot()
    const ingress = snapshot.nodes.find((node) => node.id === 'ingress')

    expect(snapshot.events[0]?.type).toBe('packet.filtered')
    expect(ingress?.droppedCount).toBeGreaterThanOrEqual(1)
    expect(snapshot.firewallRules[0]).toMatchObject({ label: 'Block red team' })
  })

  it('balances service-bound packets across application nodes', () => {
    const legitimate: TrafficSeed[] = [
      { type: 'legitimate', size: 200, sourceIp: '10.0.0.1' },
      { type: 'legitimate', size: 200, sourceIp: '10.0.0.2' },
      { type: 'legitimate', size: 200, sourceIp: '10.0.0.3' },
      { type: 'legitimate', size: 200, sourceIp: '10.0.0.4' },
    ]

    vi.spyOn(traffic, 'buildTrafficPlan').mockReturnValue({ legitimate, attacker: [] })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const simulation = new NetworkSimulation()
    simulation.addAppServer()

    simulation.tick()

    const snapshot = simulation.snapshot()
    const serviceLinks = snapshot.links.filter((link) => link.target.startsWith('app'))

    expect(serviceLinks.length).toBeGreaterThanOrEqual(2)
    expect(serviceLinks.every((link) => link.utilization > 0)).toBe(true)

    const [first, second] = serviceLinks
    expect(Math.abs(first.utilization - second.utilization)).toBeLessThan(0.05)
  })
})
