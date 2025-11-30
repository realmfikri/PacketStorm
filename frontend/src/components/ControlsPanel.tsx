import { useMemo, useState, type FormEvent } from 'react'
import type { AttackMode, FirewallRule } from '../simulation/types'

const attackModes: { id: AttackMode; title: string; description: string }[] = [
  { id: 'idle', title: 'Normal traffic', description: 'User traffic only; attackers stay quiet.' },
  { id: 'pulse', title: 'Pulse attack', description: 'Short bursts probing defenses.' },
  { id: 'stealth', title: 'Stealthy', description: 'Low and slow to blend with users.' },
  { id: 'flood', title: 'Flood', description: 'Volumetric surge overwhelming queues.' },
]

interface ControlsPanelProps {
  attackMode: AttackMode
  firewallRules: FirewallRule[]
  onAttackModeChange: (mode: AttackMode) => void
  onAddFirewallRule: (rule: { startIp: string; endIp: string; label?: string }) => void
  onAddServer: () => void
}

export function ControlsPanel({
  attackMode,
  firewallRules,
  onAttackModeChange,
  onAddFirewallRule,
  onAddServer,
}: ControlsPanelProps) {
  const [startIp, setStartIp] = useState('203.0.113.1')
  const [endIp, setEndIp] = useState('203.0.113.255')
  const [label, setLabel] = useState('Red team block')

  const activeLabel = useMemo(() => attackModes.find((mode) => mode.id === attackMode)?.title ?? 'Unknown', [attackMode])

  const submitRule = (event: FormEvent) => {
    event.preventDefault()
    if (!startIp || !endIp) return
    onAddFirewallRule({ startIp, endIp, label })
    setLabel('')
  }

  return (
    <div className="controls-panel" aria-label="Simulation controls">
      <div className="controls-section">
        <div>
          <p className="eyebrow">Attack mode</p>
          <h3>Live adversary tuning</h3>
          <p className="muted">Trigger hostile flows to visualize detection and response.</p>
        </div>
        <div className="pill neutral">{activeLabel}</div>
      </div>

      <div className="attack-grid" role="group" aria-label="Attack toggles">
        {attackModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`attack-card ${attackMode === mode.id ? 'active' : ''}`}
            onClick={() => onAttackModeChange(mode.id)}
          >
            <div className="attack-card-header">
              <span className={`pill ${attackMode === mode.id ? 'critical' : 'neutral'}`}>{mode.title}</span>
            </div>
            <p>{mode.description}</p>
          </button>
        ))}
      </div>

      <div className="controls-section">
        <div>
          <p className="eyebrow">Firewall</p>
          <h3>Drop hostile sources</h3>
          <p className="muted">Add CIDR-style ranges to cut off attacker IPs and observe recovery.</p>
        </div>
        <button type="button" className="secondary" onClick={onAddServer}>
          Add server
        </button>
      </div>

      <form className="firewall-form" onSubmit={submitRule}>
        <div className="field">
          <label htmlFor="startIp">Range start</label>
          <input id="startIp" type="text" value={startIp} onChange={(e) => setStartIp(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="endIp">Range end</label>
          <input id="endIp" type="text" value={endIp} onChange={(e) => setEndIp(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="label">Rule label</label>
          <input id="label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Optional" />
        </div>
        <button type="submit" className="primary" aria-label="Add firewall block">
          Add block
        </button>
      </form>

      <div className="rules-list" aria-live="polite" aria-label="Active firewall rules">
        {firewallRules.length === 0 && <p className="muted">No firewall rules applied yet.</p>}
        {firewallRules.map((rule) => (
          <div key={rule.id} className="rule-pill">
            <span className="pill critical">Block</span>
            <div>
              <p className="rule-title">{rule.label}</p>
              <p className="muted">{rule.startIp} → {rule.endIp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
