import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ControlsPanel } from './ControlsPanel'

const baseProps = {
  attackMode: 'idle' as const,
  firewallRules: [],
  onAttackModeChange: vi.fn(),
  onAddFirewallRule: vi.fn(),
  onAddServer: vi.fn(),
}

describe('ControlsPanel', () => {
  it('allows operators to toggle attack modes', async () => {
    const user = userEvent.setup()
    const onAttackModeChange = vi.fn()
    const { rerender } = render(
      <ControlsPanel
        {...baseProps}
        attackMode="idle"
        onAttackModeChange={onAttackModeChange}
      />,
    )

    const floodButton = screen.getByRole('button', { name: /Flood/i })
    await user.click(floodButton)

    expect(onAttackModeChange).toHaveBeenCalledWith('flood')

    rerender(
      <ControlsPanel
        {...baseProps}
        attackMode="flood"
        onAttackModeChange={onAttackModeChange}
      />,
    )

    expect(floodButton.className).toContain('active')
  })

  it('submits firewall rules from the form', () => {
    const onAddFirewallRule = vi.fn()
    render(
      <ControlsPanel
        {...baseProps}
        firewallRules={[{ id: 'rule-1', label: 'Existing', startIp: '1.1.1.1', endIp: '2.2.2.2' }]}
        onAddFirewallRule={onAddFirewallRule}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Range start/i), { target: { value: '203.0.113.10' } })
    fireEvent.change(screen.getByLabelText(/Range end/i), { target: { value: '203.0.113.200' } })
    fireEvent.change(screen.getByLabelText(/Rule label/i), { target: { value: 'Block attackers' } })

    fireEvent.click(screen.getByRole('button', { name: /Add firewall block/i }))

    expect(onAddFirewallRule).toHaveBeenCalledWith({
      startIp: '203.0.113.10',
      endIp: '203.0.113.200',
      label: 'Block attackers',
    })

    expect(screen.getByText(/Existing/i)).toBeInTheDocument()
    expect((screen.getByLabelText(/Rule label/i) as HTMLInputElement).value).toBe('')
  })
})
