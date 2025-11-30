import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'

const Dashboard = () => {
  return (
    <main className="content" role="main">
      <section className="hero">
        <div>
          <p className="eyebrow">PacketStorm Monitoring</p>
          <h1>Welcome to your dashboard</h1>
          <p className="lede">
            Track your network posture, monitor alerts, and review recent activity from a single,
            responsive workspace.
          </p>
          <div className="actions">
            <button type="button" className="primary">
              View live status
            </button>
            <button type="button" className="secondary">
              Configure alerts
            </button>
          </div>
        </div>
        <div className="stat-board" aria-label="System highlights">
          <div className="stat">
            <p className="stat-label">Active monitors</p>
            <p className="stat-value">18</p>
            <p className="stat-trend positive">+3 this week</p>
          </div>
          <div className="stat">
            <p className="stat-label">Open incidents</p>
            <p className="stat-value">2</p>
            <p className="stat-trend warning">Investigate immediately</p>
          </div>
          <div className="stat">
            <p className="stat-label">Last sync</p>
            <p className="stat-value">3m ago</p>
            <p className="stat-trend">Automated checks enabled</p>
          </div>
        </div>
      </section>

      <section className="panel-grid" aria-label="Dashboard panels">
        <article className="panel">
          <header>
            <h2>Recent alerts</h2>
            <span className="pill warning">Priority</span>
          </header>
          <ul>
            <li>
              <span className="bullet critical" aria-hidden />
              Unusual outbound traffic detected on edge gateway.
            </li>
            <li>
              <span className="bullet healthy" aria-hidden />
              Scheduled maintenance completed for analytics cluster.
            </li>
            <li>
              <span className="bullet warning" aria-hidden />
              SLA latency nearing threshold for east region API.
            </li>
          </ul>
        </article>
        <article className="panel">
          <header>
            <h2>Next steps</h2>
            <span className="pill neutral">Playbooks</span>
          </header>
          <ol>
            <li>Review incident timelines and validate remediation steps.</li>
            <li>Verify alert routing for the new on-call rotation.</li>
            <li>Share the weekly health summary with stakeholders.</li>
          </ol>
        </article>
      </section>
    </main>
  )
}

const Layout = () => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="logo">PS</div>
          <div>
            <p className="brand-name">PacketStorm</p>
            <p className="brand-subtitle">Network Intelligence</p>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
          <a href="#">Reports</a>
          <a href="#">Settings</a>
        </nav>
        <div className="status">
          <span className="status-indicator" aria-hidden />
          <span>Systems nominal</span>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}

export default App
