import type { AttackMode, TrafficType } from './types'

export interface TrafficSeed {
  type: TrafficType
  size?: number
  sourceIp?: string
}

const LEGITIMATE_RANGES = [
  ['10.24.0.1', '10.24.0.255'],
  ['10.25.1.1', '10.25.1.200'],
  ['172.16.10.1', '172.16.10.220'],
]

const ATTACKER_RANGES = [
  ['203.0.113.1', '203.0.113.254'],
  ['198.51.100.1', '198.51.100.200'],
  ['192.0.2.10', '192.0.2.220'],
]

function randomIp([start, end]: [string, string]): string {
  const startOctets = start.split('.').map(Number)
  const endOctets = end.split('.').map(Number)
  const ip = startOctets.map((octet, index) => {
    const range = endOctets[index] - octet
    return octet + Math.round(Math.random() * range)
  })
  return ip.join('.')
}

function generateLegitimate(count: number): TrafficSeed[] {
  return Array.from({ length: count }, () => ({
    type: 'legitimate' as const,
    size: Math.max(80, Math.round(Math.random() * 400)),
    sourceIp: randomIp(LEGITIMATE_RANGES[Math.floor(Math.random() * LEGITIMATE_RANGES.length)] as [string, string]),
  }))
}

function generateAttackBurst(count: number, sizeRange: [number, number]): TrafficSeed[] {
  const [minSize, maxSize] = sizeRange
  return Array.from({ length: count }, () => ({
    type: 'attacker' as const,
    size: Math.round(Math.random() * (maxSize - minSize)) + minSize,
    sourceIp: randomIp(ATTACKER_RANGES[Math.floor(Math.random() * ATTACKER_RANGES.length)] as [string, string]),
  }))
}

export function buildTrafficPlan(mode: AttackMode) {
  switch (mode) {
    case 'flood': {
      return {
        legitimate: generateLegitimate(4),
        attacker: generateAttackBurst(10 + Math.floor(Math.random() * 8), [450, 950]),
      }
    }
    case 'pulse': {
      return {
        legitimate: generateLegitimate(5),
        attacker: generateAttackBurst(4 + Math.floor(Math.random() * 5), [350, 800]),
      }
    }
    case 'stealth': {
      return {
        legitimate: generateLegitimate(6),
        attacker: generateAttackBurst(2 + Math.floor(Math.random() * 2), [120, 260]),
      }
    }
    case 'idle':
    default: {
      return {
        legitimate: generateLegitimate(6),
        attacker: [],
      }
    }
  }
}
