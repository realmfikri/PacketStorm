import { useEffect } from 'react'
import { create } from 'zustand'
import { NetworkSimulation } from './network'
import type { AttackMode, SimulationSnapshot } from './types'

const simulation = new NetworkSimulation()

interface SimulationStore {
  snapshot: SimulationSnapshot
  attackMode: AttackMode
  tick: () => void
  setAttackMode: (mode: AttackMode) => void
  addFirewallRule: (rule: { startIp: string; endIp: string; label?: string }) => void
  addServer: () => void
}

function refresh(set: (next: Partial<SimulationStore>) => void) {
  set({ snapshot: simulation.snapshot(), attackMode: simulation.getAttackMode() })
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  snapshot: simulation.snapshot(),
  attackMode: simulation.getAttackMode(),
  tick: () => {
    simulation.tick()
    refresh(set)
  },
  setAttackMode: (mode) => {
    simulation.setAttackMode(mode)
    refresh(set)
  },
  addFirewallRule: (rule) => {
    simulation.addFirewallRule(rule)
    refresh(set)
  },
  addServer: () => {
    simulation.addAppServer()
    refresh(set)
  },
}))

export function useSimulationTicker(intervalMs = 900) {
  const tick = useSimulationStore((state) => state.tick)

  useEffect(() => {
    const id = setInterval(() => tick(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, tick])
}
