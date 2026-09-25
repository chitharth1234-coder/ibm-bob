import { useState } from 'react';
import GhostFibers from './components/GhostFibers';
import GooeyNav from './components/GooeyNav';
import ElectricBorder from './components/ElectricBorder';
import IncidentDemo from './components/IncidentDemo';
import UserView from './components/UserView';
import './App.css';

const NAV_ITEMS = [
  { label: 'Agents', href: '#agents' },
  { label: 'How it works', href: '#flow' },
  { label: 'Integrations', href: '#integrations' }
];

const AGENTS = [
  {
    name: 'Detective',
    icon: '🔍',
    role: 'Root-cause analysis',
    copy: 'Correlates logs, traces, and metrics against the last hour of deploys to find what actually changed.'
  },
  {
    name: 'Analyst',
    icon: '📊',
    role: 'Impact scoping',
    copy: 'Maps the failing component to everything downstream of it and sizes the real customer impact.'
  },
  {
    name: 'Fixer',
    icon: '🔧',
    role: 'Remediation drafting',
    copy: 'Drafts the rescue plan and runs it against staging before anyone sees it.'
  },
  {
    name: 'Reviewer',
    icon: '📋',
    role: 'Evidence packaging',
    copy: 'Packages the evidence, the plan, and the test results into an approval a human can read in a minute.'
  },
  {
    name: 'Operator',
    icon: '🚀',
    role: 'Deployment execution',
    copy: "Ships the approved fix through your existing pipeline — no new deploy path to trust."
  },
  {
    name: 'Watcher',
    icon: '👁',
    role: 'Recovery monitoring',
    copy: 'Stays on the signals that caught the incident until they hold steady enough to call it recovered.'
  }
];

const INTEGRATIONS = [
  { name: 'Datadog', category: 'Monitoring' },
  { name: 'PagerDuty', category: 'Alerting' },
  { name: 'Grafana', category: 'Observability' },
  { name: 'Kubernetes', category: 'Orchestration' },
  { name: 'GitHub Actions', category: 'CI/CD' },
  { name: 'Slack', category: 'Communication' },
  { name: 'AWS CloudWatch', category: 'Monitoring' },
  { name: 'Sentry', category: 'Error tracking' }
];

const STATS = [
  { value: '< 60s', label: 'Mean time to detection' },
  { value: '~5 min', label: 'Average investigation time' },
  { value: '1 gate', label: 'Human approval step' },
  { value: '0', label: 'New deploy paths to trust' }
];

export default function App() {
  const [mode, setMode]         = useState('dev'); // 'dev' | 'user'
  const [activeNav, setActiveNav] = useState(0);

  const handleSelect = (item, index) => {
    setActiveNav(index);
    document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app">
      <div className="fiber-backdrop" aria-hidden="true">
        <GhostFibers lineColor="#3437A0" glowColor="#7C5CFF" speed={0.15} scale={2.4} layers={3} grain={0.03} brightness={1.6} />
      </div>

      {/* ── Top announcement bar ── */}
      <div className="announcement-bar">
        <span className="pulse-dot" aria-hidden="true" />
        <span>BOB is now in early access — autonomous incident recovery with a human approval gate</span>
        <a href="#get-started" className="announcement-link">Request access →</a>
      </div>

      <header className="site-header">
        <div className="logo">
          <span className="logo-mark" aria-hidden="true" />
          BOB
          <span className="logo-badge">Beta</span>
        </div>
        {mode === 'dev' && <GooeyNav items={NAV_ITEMS} activeIndex={activeNav} onSelect={handleSelect} />}

        {/* ── Mode switcher ── */}
        <div className="mode-switcher">
          <button
            className={`mode-btn${mode === 'dev' ? ' mode-btn-active' : ''}`}
            onClick={() => setMode('dev')}
          >
            <span className="mode-icon">⚙️</span>
            <span className="mode-label">Developer</span>
          </button>
          <button
            className={`mode-btn${mode === 'user' ? ' mode-btn-active' : ''}`}
            onClick={() => setMode('user')}
          >
            <span className="mode-icon">🛒</span>
            <span className="mode-label">User</span>
          </button>
        </div>

        {mode === 'dev' && <a href="#get-started" className="cta-small">Get early access</a>}
      </header>

      {mode === 'user' && (
        <main className="user-main">
          {/* ── User mode context banner ── */}
          <div className="user-context-banner">
            <div className="ucb-inner">
              <div className="ucb-label">
                <span className="ucb-dot" aria-hidden="true" />
                Interactive scenario
              </div>
              <div className="ucb-steps">
                <div className="ucb-step ucb-step-done">
                  <span className="ucb-step-num">1</span>
                  <span>Customer checkout</span>
                </div>
                <span className="ucb-arrow" aria-hidden="true">→</span>
                <div className="ucb-step ucb-step-incident">
                  <span className="ucb-step-num ucb-step-num-warn">2</span>
                  <span>Server fails</span>
                </div>
                <span className="ucb-arrow" aria-hidden="true">→</span>
                <div className="ucb-step">
                  <span className="ucb-step-num ucb-step-num-ok">3</span>
                  <span>BOB fixes it</span>
                </div>
              </div>
              <p className="ucb-desc">
                Walk through a real payment failure and watch BOB recover it — from the customer's point of view.
              </p>
            </div>
          </div>

          <section className="user-section">
            <div className="section-head">
              <div className="section-tag">User experience</div>
              <h2>What your customers see when something goes wrong</h2>
              <p>
                Instead of a blank error page or a lost cart, BOB detects the outage, shows the customer a
                live recovery status, keeps their cart safe, and prompts them to complete the purchase the
                moment service is restored — no support ticket required.
              </p>
            </div>
            <UserView />
          </section>
        </main>
      )}

      {mode === 'dev' && <main>
        {/* ── Hero ── */}
        <section className="hero">
          <div className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Autonomous incident recovery
          </div>
          <h1>An incident starts.<br />BOB finishes it before your team finishes their coffee.</h1>
          <p>
            BOB watches production, investigates with a team of specialised AI agents, writes and tests
            the fix, then hands you <strong>one decision</strong>: approve the rescue plan or don't.
            Nothing ships without a human saying yes.
          </p>
          <div className="hero-actions">
            <a href="#flow" className="btn-primary">See the recovery flow</a>
            <a href="#" className="btn-ghost">Read the docs →</a>
          </div>
        </section>

        {/* ── Stats bar ── */}
        <div className="stats-bar">
          {STATS.map(s => (
            <div className="stat-item" key={s.label}>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Trust strip ── */}
        <div className="trust">
          <span className="trust-label">Trusted by teams running on-call for real production traffic</span>
          {['Kubernetes', 'AWS', 'Datadog', 'PagerDuty'].map(t => (
            <span className="trust-chip" key={t}>{t}</span>
          ))}
        </div>

        {/* ── How it works pipeline ── */}
        <section id="flow-overview" className="hiw-section">
          <div className="section-head">
            <div className="section-tag">How it works</div>
            <h2>From alert to recovery in one automated pipeline</h2>
            <p>
              BOB runs a structured, auditable pipeline every time an incident fires.
              Every step has a named agent responsible for it. Nothing skips the human gate.
            </p>
          </div>
          <div className="hiw-pipeline">
            {[
              { num: '01', icon: '🚨', title: 'Incident detected',      color: 'warn',   desc: 'PagerDuty or Datadog fires. BOB opens incident #INC-XXXX instantly.' },
              { num: '02', icon: '🔍', title: 'Detective investigates',  color: 'violet', desc: 'Correlates logs, traces, and recent deploys to find the exact root cause.' },
              { num: '03', icon: '📊', title: 'Analyst scopes impact',   color: 'violet', desc: 'Maps affected services and quantifies revenue and user impact.' },
              { num: '04', icon: '🔧', title: 'Fixer drafts fix',        color: 'violet', desc: 'Writes the rescue plan and validates it in staging with your full test suite.' },
              { num: '05', icon: '🔐', title: 'You approve or reject',   color: 'gate',   desc: 'One concise summary. You decide. Nothing ships without your explicit approval.' },
              { num: '06', icon: '🚀', title: 'Operator deploys',        color: 'violet', desc: 'Ships the approved fix through your existing CI/CD pipeline. No new paths.' },
              { num: '07', icon: '👁', title: 'Watcher confirms recovery', color: 'ok',  desc: 'Monitors signals until they are stable, then closes the incident.' },
            ].map((step, i) => (
              <div key={step.num} className={`hiw-step hiw-step-${step.color}`}>
                <div className="hiw-connector" aria-hidden="true" />
                <div className="hiw-step-top">
                  <span className="hiw-num">{step.num}</span>
                  <span className="hiw-icon" aria-hidden="true">{step.icon}</span>
                </div>
                <div className="hiw-step-body">
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
                {step.color === 'gate' && <div className="hiw-gate-badge">Human gate</div>}
              </div>
            ))}
          </div>
        </section>

        {/* ── Agents ── */}
        <section id="agents">
          <div className="section-head">
            <div className="section-tag">The team</div>
            <h2>A team of agents, not one black box</h2>
            <p>
              Each incident is worked by specialised agents that hand off to each other — the way
              a real on-call team would. Every agent has a single, auditable responsibility.
            </p>
          </div>
          <div className="grid">
            {AGENTS.map(a => (
              <div className="eb-cell" key={a.name}>
                <ElectricBorder color="#7C5CFF" speed={0.6} chaos={0.06} borderRadius={16}>
                  <div className="card">
                    <div className="card-header">
                      <span className="card-icon" aria-hidden="true">{a.icon}</span>
                      <div>
                        <h3>{a.name}</h3>
                        <span className="card-role">{a.role}</span>
                      </div>
                    </div>
                    <p className="card-copy">{a.copy}</p>
                  </div>
                </ElectricBorder>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live incident demo ── */}
        <section id="flow" className="demo-section">
          <div className="section-head">
            <div className="section-tag">Live demo</div>
            <h2>Watch BOB work a real incident</h2>
            <p>
              Trigger a simulated production error and watch every step play out —
              from detection to verified recovery. You stay in control: nothing deploys without your approval.
            </p>
          </div>
          <IncidentDemo />
        </section>

        {/* ── Integrations ── */}
        <section id="integrations">
          <div className="section-head">
            <div className="section-tag">Integrations</div>
            <h2>Plugs into what's already paging you</h2>
            <p>
              BOB reads from your existing monitoring stack and ships fixes through your current
              pipeline. No new agent to install, no new process to trust.
            </p>
          </div>
          <div className="integrations-grid">
            {INTEGRATIONS.map(item => (
              <div className="integration-card" key={item.name}>
                <span className="integration-name">{item.name}</span>
                <span className="integration-category">{item.category}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="get-started" className="cta-section">
          <div className="cta-electric-wrap">
            <ElectricBorder color="#7C5CFF" speed={0.5} chaos={0.05} borderRadius={20} className="cta-electric">
              <div className="cta-panel">
                <h2>Let the next incident get worked while you're still reading the alert.</h2>
                <p>Set up takes an afternoon. The approval gate stays yours from day one. Cancel anytime.</p>
                <div className="hero-actions">
                  <a href="#" className="btn-primary">Request early access</a>
                  <a href="#" className="btn-ghost">Talk to the team →</a>
                </div>
                <p className="cta-fine">No credit card required · Works with your existing stack</p>
              </div>
            </ElectricBorder>
          </div>
        </section>
      </main>}

      <footer>
        <div className="footer-top">
          <div className="footer-brand">
            <div className="logo">
              <span className="logo-mark" aria-hidden="true" />
              BOB
            </div>
            <p>Autonomous incident recovery with a human always in the loop.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <span className="footer-col-title">Product</span>
              <a href="#agents">Agents</a>
              <a href="#flow">How it works</a>
              <a href="#integrations">Integrations</a>
              <a href="#">Changelog</a>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Developers</span>
              <a href="#">Documentation</a>
              <a href="#">API reference</a>
              <a href="#">Status page</a>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Company</span>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 BOB. All rights reserved.</span>
          <span>Built for teams who still want a human in the loop.</span>
          <div className="footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
