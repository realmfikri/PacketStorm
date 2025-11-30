# PacketStorm Dashboard

PacketStorm is an interactive dashboard that simulates packet flow across an enterprise-style network. It pairs a React/Vite front-end with a lightweight simulation engine that models ingress gateways, core routers, app services, and a database cluster. Operators can toggle adversary behaviors, add firewall blocks, and scale services to observe how controls affect throughput, drops, and logging.

## Project layout

- `frontend/` – React + Vite SPA that renders the dashboard and visualization.
- `frontend/src/simulation/` – Simulation engine for queues, routing, firewalling, and traffic generation.
- `frontend/src/components/` – UI panels for controls, graph, and live event log.

## Prerequisites

- Node.js 18+ (includes the `crypto.randomUUID` API used by the simulator).
- npm 9+.

## Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the dashboard locally:
   ```bash
   npm run dev
   ```
   Vite prints the local URL (default `http://localhost:5173`).

## Running tests

Unit and component tests are written with Vitest and React Testing Library:
```bash
cd frontend
npm test
```
Use `npm run test:watch` during development for interactive feedback.

## Dashboard controls

- **Attack mode**: Toggle between `idle`, `pulse`, `stealth`, and `flood` behaviors. Each mode changes attacker volume and packet sizing so you can observe queue pressure and link utilization.
- **Firewall rules**: Add IP ranges to drop hostile sources before they reach internal queues. The live log shows `Dropped (Firewall)` entries for filtered traffic.
- **Add server**: Attach an additional app server behind the core router to watch the round-robin load balancer spread legitimate traffic across service nodes.

## Sample attack scenarios

Use these walkthroughs to validate that the simulator and UI respond as expected:

1. **Queue overflow during a flood**
   - Set attack mode to **Flood** without adding firewall rules.
   - Expected: Ingress and core queues fill, `Dropped (Queue Full)` messages appear in the Live Log, and queue meters for gateway/router climb toward capacity.

2. **Firewall suppression**
   - Set attack mode to **Pulse** or **Stealth** and add a rule covering `203.0.113.0 → 203.0.113.255`.
   - Expected: Live Log entries switch to `Dropped (Firewall)` for attacker packets, ingress drops decrease, and utilization bars stabilize as hostile traffic is filtered early.

3. **Load-balancing recovery**
   - Under any attack mode, click **Add server** to introduce a second app node.
   - Expected: The graph shows a new service node and link, utilization on service links levels out, and queue depths for app nodes converge as the round-robin balancer spreads flows.

4. **Baseline legitimacy**
   - Set attack mode to **Idle**.
   - Expected: Only `Accepted 200 OK` events appear, queues remain shallow, and no drops are logged.

These scenarios double as acceptance checks when validating code changes: after toggling the relevant controls, the logs and meters should match the outcomes above.
