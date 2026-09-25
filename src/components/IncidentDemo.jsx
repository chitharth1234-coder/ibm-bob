import { useState, useEffect, useRef, useCallback } from 'react';
import './IncidentDemo.css';

// ─── Scenario data ────────────────────────────────────────────────────────────
const AGENT_COLORS = {
  Detective: '#a78bfa', Analyst: '#60a5fa', Fixer: '#34d399',
  Reviewer: '#fbbf24', Operator: '#f87171', Watcher: '#38bdf8'
};

const DEMO_STEPS = [
  {
    id: 'incident', label: 'Production incident', agent: null, duration: 0,
    content: { type: 'alert', lines: [
      { kind: 'error',   text: '[14:03:27] ERROR payments-api — HTTP 500 rate crossed 30% threshold' },
      { kind: 'error',   text: '[14:03:27] NullPointerException in PaymentProcessor.charge():142' },
      { kind: 'warning', text: '[14:03:28] Latency p99 → 4,200ms  (baseline: 180ms)' },
      { kind: 'warning', text: '[14:03:28] checkout-service health check FAILING' },
      { kind: 'muted',   text: '[14:03:28] PagerDuty alert fired → on-call engineer notified' },
    ]}
  },
  {
    id: 'detect', label: 'BOB detects', agent: null, duration: 900, tag: '< 60s',
    content: { type: 'log', lines: [
      { kind: 'violet', text: '[BOB] Signal received: payments-api 500 rate = 34%' },
      { kind: 'violet', text: '[BOB] Threshold breached — opening incident #INC-4471' },
      { kind: 'muted',  text: '[BOB] Clock started. Dispatching Detective agent…' },
    ]}
  },
  {
    id: 'investigate', label: 'Detective investigates', agent: 'Detective', duration: 1400,
    content: { type: 'log', lines: [
      { kind: 'muted',   text: '[Detective] Pulling last 60 min of logs from payments-api…' },
      { kind: 'muted',   text: '[Detective] Fetching deploy history — 3 deploys in last 2 hrs' },
      { kind: 'warning', text: '[Detective] Deploy detected: v2.4.1 → v2.4.2  (14:01:09 UTC)' },
      { kind: 'error',   text: '[Detective] First 500 at 14:03:14 — 2m 5s after deploy' },
      { kind: 'violet',  text: '[Detective] Commit d8f3a1c: "Remove null-check in PaymentProcessor"' },
    ]}
  },
  {
    id: 'rootcause', label: 'Root cause identified', agent: 'Detective', duration: 800,
    content: { type: 'finding', title: 'Root cause',
      body: 'Commit d8f3a1c in v2.4.2 removed a null-guard on PaymentProcessor.charge():142. When stripeToken is null (guest checkout), an unhandled NullPointerException is thrown.',
      meta: [
        { label: 'File',   value: 'PaymentProcessor.java:142' },
        { label: 'Commit', value: 'd8f3a1c by @jsmith' },
        { label: 'Deploy', value: 'v2.4.2 @ 14:01 UTC' },
      ]}
  },
  {
    id: 'impact', label: 'Impact & risk analysis', agent: 'Analyst', duration: 1200,
    content: { type: 'finding', title: 'Blast radius',
      body: 'All guest-checkout payment attempts are failing. Logged-in users with saved cards are unaffected.',
      meta: [
        { label: 'Affected users',    value: '~1,400 guest checkouts / hr' },
        { label: 'Revenue at risk',   value: '~$8,200 / hr' },
        { label: 'Downstream',        value: 'checkout-service, order-service' },
        { label: 'Data integrity',    value: 'Clean — fail-fast before DB write' },
      ]}
  },
  {
    id: 'plan', label: 'Rescue plan drafted', agent: 'Fixer', duration: 1300,
    content: { type: 'code',
      title: 'Proposed fix — PaymentProcessor.java:142',
      before: `public ChargeResult charge(String stripeToken, long amount) {\n    Stripe.charge(stripeToken, amount); // ← NPE if null\n}`,
      after:  `public ChargeResult charge(String stripeToken, long amount) {\n    if (stripeToken == null) {\n        return ChargeResult.error("No payment token");\n    }\n    Stripe.charge(stripeToken, amount);\n}`,
      options: [
        { label: 'Option A (recommended)', text: 'Rollback to v2.4.1 — fastest recovery, ~3 min', selected: true },
        { label: 'Option B', text: 'Patch fix + forward deploy — ~12 min' },
      ]}
  },
  {
    id: 'test', label: 'Staging test run', agent: 'Fixer', duration: 1500,
    content: { type: 'log', lines: [
      { kind: 'muted',  text: '[Fixer] Deploying rollback to staging-payments…' },
      { kind: 'muted',  text: '[Fixer] Running regression suite (412 tests)…' },
      { kind: 'ok',     text: '[Fixer] ✓ PaymentProcessorTest — 48/48 passed' },
      { kind: 'ok',     text: '[Fixer] ✓ GuestCheckoutIntegrationTest — 12/12 passed' },
      { kind: 'ok',     text: '[Fixer] ✓ 500 rate in staging: 0.0%  (was 34%)' },
      { kind: 'violet', text: '[Fixer] Staging OK. Packaging approval bundle for Reviewer.' },
    ]}
  },
  {
    id: 'approval', label: 'Waiting for your approval', agent: 'Reviewer', duration: 0, gate: true, tag: 'Your call',
    content: { type: 'approval', summary: [
      { label: 'Incident',      value: '#INC-4471 · payments-api HTTP 500 spike' },
      { label: 'Root cause',    value: 'Null-check removed in commit d8f3a1c (v2.4.2)' },
      { label: 'Impact',        value: '~1,400 guest checkouts/hr failing · ~$8,200/hr' },
      { label: 'Proposed fix',  value: 'Rollback to v2.4.1 via existing pipeline' },
      { label: 'Staging tests', value: '412/412 passed · 500 rate → 0%' },
    ]}
  },
  {
    id: 'deploy', label: 'Deployment', agent: 'Operator', duration: 1600,
    content: { type: 'deploy', lines: [
      { kind: 'violet', text: '[Operator] Approved. Triggering pipeline rollback…' },
      { kind: 'muted',  text: '[Operator] GitHub Actions: workflow dispatch → payments-rollback' },
      { kind: 'pod',    text: 'pod-1', status: 'rolling' },
      { kind: 'pod',    text: 'pod-2', status: 'rolling' },
      { kind: 'pod',    text: 'pod-3', status: 'rolling' },
      { kind: 'ok',     text: '[Operator] All 3 pods running v2.4.1. Deploy complete.' },
    ]}
  },
  {
    id: 'monitor', label: 'Post-deploy monitoring', agent: 'Watcher', duration: 1400,
    content: { type: 'log', lines: [
      { kind: 'muted',  text: '[Watcher] Monitoring payments-api error rate…' },
      { kind: 'ok',     text: '[Watcher] 500 rate: 34% → 2.1% → 0.3% → 0.0%' },
      { kind: 'ok',     text: '[Watcher] Latency p99: 4,200ms → 310ms → 178ms ✓' },
      { kind: 'ok',     text: '[Watcher] checkout-service health check: PASSING' },
      { kind: 'ok',     text: '[Watcher] Signals stable for 3 consecutive minutes.' },
    ]}
  },
  {
    id: 'recovered', label: 'Recovery verified', agent: 'Watcher', duration: 600,
    content: { type: 'recovery', stats: [
      { label: 'Time to detection',  value: '< 60s' },
      { label: 'Time to recovery',   value: '11m 42s' },
      { label: 'Tests run',          value: '412' },
      { label: 'Human decisions',    value: '1' },
    ], note: 'Incident closed. Full timeline and evidence saved for postmortem.' }
  }
];

// ─── Error-rate data for the mini chart ──────────────────────────────────────
// baseline → spike → recovery
function buildChartPoints(phase, deployDone) {
  const pts = [];
  // 20 baseline points near 0
  for (let i = 0; i < 20; i++) pts.push(1 + Math.random() * 1.5);
  if (phase === 'idle') return pts;
  // spike
  pts.push(8, 18, 34, 36, 33, 35);
  if (deployDone) {
    pts.push(22, 11, 4, 1.5, 0.8, 0.3, 0.1, 0.1);
  }
  return pts;
}

// ─── SVG Mini-chart ──────────────────────────────────────────────────────────
function MiniChart({ points, w = 220, h = 60 }) {
  if (!points.length) return null;
  const max = Math.max(...points, 40);
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(v => h - (v / max) * (h - 4) - 2);
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const fill = `${d} L${w},${h} L0,${h} Z`;
  const last = points[points.length - 1];
  const color = last > 10 ? '#f87171' : last > 2 ? '#fbbf24' : '#57e6b0';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mini-chart-svg">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#chartGrad)" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* current value dot */}
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill={color} />
    </svg>
  );
}

// ─── Elapsed timer ───────────────────────────────────────────────────────────
function useTimer(running) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [running]);
  const reset = () => setElapsed(0);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, reset };
}

// ─── Particle burst (canvas) ─────────────────────────────────────────────────
function ParticleBurst({ trigger }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!trigger || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const particles = Array.from({ length: 80 }, () => ({
      x: W / 2, y: H / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14 - 4,
      r: 3 + Math.random() * 4,
      color: ['#57e6b0','#7c5cff','#60a5fa','#fbbf24','#a78bfa'][Math.floor(Math.random()*5)],
      life: 1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life -= 0.018;
        if (p.life <= 0) return;
        alive = true;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (alive) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [trigger]);
  return <canvas ref={ref} className="particle-canvas" />;
}

// ─── Typewriter line ─────────────────────────────────────────────────────────
function TWLine({ text, kind, delay = 0, speed = 1 }) {
  const [shown, setShown] = useState('');
  const ms = Math.max(4, Math.round(11 / speed));
  useEffect(() => {
    setShown('');
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setShown(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, ms);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay, ms]);
  return <div className={`dl dl-${kind}`}>{shown}<span className="cur" /></div>;
}

// ─── Pod row ─────────────────────────────────────────────────────────────────
function PodRow({ label, delay }) {
  const [status, setStatus] = useState('pending');
  useEffect(() => {
    const t1 = setTimeout(() => setStatus('updating'), delay);
    const t2 = setTimeout(() => setStatus('done'), delay + 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay]);
  return (
    <div className={`pod-row pod-${status}`}>
      <span className="pod-icon">{status === 'done' ? '✓' : status === 'updating' ? <span className="pod-spin" /> : '○'}</span>
      <span className="pod-label">{label}</span>
      <span className="pod-ver">{status === 'done' ? 'v2.4.1' : status === 'updating' ? 'updating…' : 'v2.4.2'}</span>
    </div>
  );
}

// ─── Content blocks ───────────────────────────────────────────────────────────
function AlertBlock({ lines, speed }) {
  return (
    <div className="demo-alert-block">
      <div className="demo-alert-header"><span className="demo-alert-dot" />INCIDENT — payments-api</div>
      <div className="dl-wrap">{lines.map((l,i) => <TWLine key={i} text={l.text} kind={l.kind} delay={i*200} speed={speed} />)}</div>
    </div>
  );
}
function LogBlock({ lines, speed }) {
  return <div className="dl-wrap">{lines.map((l,i) => <TWLine key={i} text={l.text} kind={l.kind} delay={i*220} speed={speed} />)}</div>;
}
function DeployBlock({ lines, speed }) {
  const logLines = lines.filter(l => l.kind !== 'pod');
  const pods = lines.filter(l => l.kind === 'pod');
  return (
    <div className="dl-wrap">
      {logLines.slice(0, 2).map((l,i) => <TWLine key={i} text={l.text} kind={l.kind} delay={i*200} speed={speed} />)}
      <div className="pods-grid">
        {pods.map((p,i) => <PodRow key={p.text} label={`payments-pod-${i+1}`} delay={400 + i*300} />)}
      </div>
      {logLines.slice(2).map((l,i) => <TWLine key={`b${i}`} text={l.text} kind={l.kind} delay={400 + pods.length*400 + i*200} speed={speed} />)}
    </div>
  );
}
function FindingBlock({ title, body, meta }) {
  return (
    <div className="demo-finding">
      <div className="finding-title">{title}</div>
      <p className="finding-body">{body}</p>
      <div className="finding-meta">{meta.map(m => (
        <div className="meta-row" key={m.label}>
          <span className="meta-lbl">{m.label}</span>
          <span className="meta-val">{m.value}</span>
        </div>
      ))}</div>
    </div>
  );
}
function CodeBlock({ title, before, after, options }) {
  const [chosen, setChosen] = useState(0);
  return (
    <div className="demo-code">
      <div className="code-title">{title}</div>
      <div className="diff-wrap">
        <div className="diff-hdr diff-hdr-bad">− Before (v2.4.2)</div>
        <pre className="diff-pre diff-bad">{before}</pre>
        <div className="diff-hdr diff-hdr-ok">+ After (rollback to v2.4.1)</div>
        <pre className="diff-pre diff-ok">{after}</pre>
      </div>
      <div className="code-options">
        {options.map((o,i) => (
          <button key={o.label} className={`code-opt${chosen===i?' code-opt-sel':''}`} onClick={() => setChosen(i)}>
            <span className="code-opt-lbl">{o.label}</span>
            <span className="code-opt-txt">{o.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
const FULL_EVIDENCE = [
  { label: 'Root cause commit',  value: 'd8f3a1c — "Remove null-check in PaymentProcessor" by @jsmith' },
  { label: 'First failure',      value: '14:03:14 UTC — 2m 5s after deploy of v2.4.2' },
  { label: 'Affected code path', value: 'PaymentProcessor.java:142 — charge(stripeToken, amount)' },
  { label: 'Error type',         value: 'NullPointerException — stripeToken is null on guest checkout' },
  { label: 'Affected users',     value: '~1,400 guest checkouts / hr (saved-card users unaffected)' },
  { label: 'Staging tests',      value: '412/412 passed after rollback to v2.4.1' },
  { label: 'Data integrity',     value: 'No DB writes before failure — zero corrupted records' },
  { label: 'Fix strategy',       value: 'Rollback to v2.4.1 via existing pipeline (~3 min)' },
];

function ApprovalBlock({ summary, onApprove, onReject, decision }) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (decision === 'approved') {
    return (
      <div className="approval-block approval-done">
        <div className="approval-hdr approval-hdr-done">
          <span className="approval-lock">🔓</span>
          <span>Approved — deploying now…</span>
        </div>
      </div>
    );
  }

  if (decision === 'rejected') {
    return (
      <div className="approval-block approval-rejected">
        <div className="approval-hdr approval-hdr-rejected">
          <span className="approval-lock">🚫</span>
          <span>Rescue plan rejected</span>
        </div>
        <p className="approval-rejected-note">
          The fix was not deployed. The incident remains open — your on-call team has been notified to take manual action.
        </p>
      </div>
    );
  }

  return (
    <div className="approval-block">
      <div className="approval-hdr">
        <span className="approval-lock">🔐</span>
        <span>BOB is waiting for your decision</span>
        <span className="approval-pulse" />
      </div>

      <div className="approval-summary">
        {summary.map(s => (
          <div className="meta-row" key={s.label}>
            <span className="meta-lbl">{s.label}</span>
            <span className="meta-val">{s.value}</span>
          </div>
        ))}
      </div>

      {showEvidence && (
        <div className="approval-evidence">
          <div className="evidence-hdr">Full evidence reviewed by BOB</div>
          {FULL_EVIDENCE.map(e => (
            <div className="meta-row" key={e.label}>
              <span className="meta-lbl">{e.label}</span>
              <span className="meta-val">{e.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="approval-actions">
        <button className="apb apb-approve" onClick={onApprove}>
          <span className="apb-icon">✓</span>
          <span className="apb-text">
            <span className="apb-label">Approve</span>
            <span className="apb-sub">Deploy rescue plan now</span>
          </span>
        </button>

        <button
          className={`apb apb-review${showEvidence ? ' apb-review-active' : ''}`}
          onClick={() => setShowEvidence(v => !v)}
        >
          <span className="apb-icon">🔍</span>
          <span className="apb-text">
            <span className="apb-label">Review</span>
            <span className="apb-sub">{showEvidence ? 'Hide evidence' : 'Check all evidence'}</span>
          </span>
        </button>

        <button className="apb apb-reject" onClick={onReject}>
          <span className="apb-icon">✗</span>
          <span className="apb-text">
            <span className="apb-label">Reject</span>
            <span className="apb-sub">Cancel this plan</span>
          </span>
        </button>
      </div>
    </div>
  );
}
function RecoveryBlock({ stats, note }) {
  return (
    <div className="recovery-block">
      <div className="recovery-title"><span className="recovery-check">✓</span>Incident resolved</div>
      <div className="recovery-stats">{stats.map(s => (
        <div className="rec-stat" key={s.label}>
          <span className="rec-val">{s.value}</span>
          <span className="rec-lbl">{s.label}</span>
        </div>
      ))}</div>
      <p className="recovery-note">{note}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IncidentDemo() {
  const [phase, setPhase]               = useState('idle');
  const [activeStep, setActiveStep]     = useState(-1);
  const [completed, setCompleted]       = useState([]);
  const [decision, setDecision]         = useState(null); // null | 'approved' | 'rejected'
  const [waiting, setWaiting]           = useState(false);
  const [shaking, setShaking]           = useState(false);
  const [burst, setBurst]               = useState(0);
  const [speed, setSpeed]               = useState(1);        // 1 | 2 | 3
  const [chartPts, setChartPts]         = useState([]);
  const [deployDone, setDeployDone]     = useState(false);
  const stepRefs   = useRef([]);
  const timerRef   = useRef(null);
  const { display: elapsed, reset: resetTimer } = useTimer(phase === 'running');

  const buildChart = useCallback((dd) => {
    setChartPts(buildChartPoints('running', dd));
  }, []);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    setPhase('idle'); setActiveStep(-1); setCompleted([]); setDecision(null);
    setWaiting(false); setShaking(false); setDeployDone(false);
    setChartPts(buildChartPoints('idle', false));
    resetTimer();
  }, [resetTimer]);

  const advance = useCallback((index) => {
    if (index >= DEMO_STEPS.length) { setPhase('done'); return; }
    setActiveStep(index);
    setTimeout(() => stepRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);

    const step = DEMO_STEPS[index];
    if (step.id === 'approval') { setWaiting(true); return; }

    const delay = Math.round((step.duration || 1000) / speed);
    timerRef.current = setTimeout(() => {
      if (step.id === 'deploy') { setDeployDone(true); buildChart(true); }
      if (step.id === 'recovered') { setBurst(b => b + 1); }
      setCompleted(prev => [...prev, index]);
      advance(index + 1);
    }, delay + Math.round(500 / speed));
  }, [speed, buildChart]);

  const startDemo = useCallback(() => {
    reset();
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
    setPhase('running');
    setChartPts(buildChartPoints('running', false));
    setTimeout(() => advance(0), 100);
  }, [reset, advance]);

  const handleApprove = useCallback(() => {
    setDecision('approved'); setWaiting(false);
    setTimeout(() => {
      setCompleted(prev => [...prev, activeStep]);
      advance(activeStep + 1);
    }, 700);
  }, [activeStep, advance]);

  const handleReject = useCallback(() => {
    setDecision('rejected'); setWaiting(false);
    setPhase('done');
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Current error rate value for the metric tile
  const errRate = (() => {
    if (phase === 'idle') return '0.0%';
    if (deployDone) return '0.0%';
    if (activeStep >= 1) return '34%';
    return '0.0%';
  })();
  const errHot = !deployDone && activeStep >= 1;

  const progress = phase === 'idle' ? 0
    : phase === 'done' ? 100
    : Math.round(((completed.length) / DEMO_STEPS.length) * 100);

  // Pipeline stage labels for the breadcrumb
  const PIPELINE_STAGES = [
    { id: 'incident',    short: 'Alert',      icon: '🚨' },
    { id: 'detect',      short: 'Detect',     icon: '📡' },
    { id: 'investigate', short: 'Investigate',icon: '🔍' },
    { id: 'rootcause',   short: 'Root cause', icon: '🎯' },
    { id: 'impact',      short: 'Impact',     icon: '📊' },
    { id: 'plan',        short: 'Fix plan',   icon: '🔧' },
    { id: 'test',        short: 'Staging',    icon: '🧪' },
    { id: 'approval',    short: 'Approval',   icon: '🔐' },
    { id: 'deploy',      short: 'Deploy',     icon: '🚀' },
    { id: 'monitor',     short: 'Monitor',    icon: '👁' },
    { id: 'recovered',   short: 'Recovered',  icon: '✅' },
  ];

  return (
    <div className={`demo-root${shaking ? ' demo-shake' : ''}`}>
      <ParticleBurst trigger={burst} />

      {/* ── Top bar ── */}
      <div className="demo-topbar">
        <div className="demo-topbar-left">
          <span className={`svc-badge${errHot ? ' svc-badge-hot' : ''}`}>payments-api</span>
          <span className="demo-status-text">
            {phase === 'idle'    && 'Ready — click "Trigger incident" to start the simulation'}
            {phase === 'running' && !waiting && <><span className="tw-dot" />BOB is actively working incident #INC-4471…</>}
            {waiting             && <><span className="warn-dot" />BOB needs your approval before deploying the fix</>}
            {phase === 'done' && decision === 'approved'  && <><span className="ok-dot" />Incident resolved — fix deployed and verified</>}
            {phase === 'done' && decision === 'rejected'  && <><span className="warn-dot" />Fix rejected — incident escalated to on-call</>}
            {phase === 'done' && !decision && <><span className="ok-dot" />Incident resolved</>}
          </span>
        </div>
        <div className="demo-topbar-right">
          {phase !== 'idle' && (
            <div className="elapsed-timer">
              <span className="elapsed-icon">⏱</span>{elapsed}
            </div>
          )}
          <div className="speed-ctl">
            {[1,2,3].map(s => (
              <button key={s} className={`speed-btn${speed===s?' speed-active':''}`} onClick={() => setSpeed(s)}>{s}×</button>
            ))}
          </div>
          {phase === 'idle' || phase === 'done' ? (
            <button className="fire-btn" onClick={startDemo}>
              {phase === 'done' ? '↺ Replay' : '⚡ Trigger incident'}
            </button>
          ) : (
            <button className="reset-btn" onClick={reset}>✕ Reset</button>
          )}
        </div>
      </div>

      {/* ── Pipeline breadcrumb ── */}
      {phase !== 'idle' && (
        <div className="demo-pipeline-bar">
          {PIPELINE_STAGES.map((stage, i) => {
            const stepIndex = DEMO_STEPS.findIndex(s => s.id === stage.id);
            const isDone    = completed.includes(stepIndex);
            const isActive  = activeStep === stepIndex && !isDone;
            const isGate    = stage.id === 'approval';
            return (
              <div
                key={stage.id}
                className={`dpb-stage${isDone ? ' dpb-done' : ''}${isActive ? ' dpb-active' : ''}${isGate ? ' dpb-gate' : ''}`}
                title={DEMO_STEPS[stepIndex]?.label}
              >
                <span className="dpb-icon" aria-hidden="true">{stage.icon}</span>
                <span className="dpb-label">{stage.short}</span>
                {isActive && <span className="dpb-spin" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Progress bar ── */}
      <div className="demo-progress-track">
        <div className="demo-progress-fill" style={{ width: `${progress}%`, background: errHot ? 'var(--warn)' : 'var(--violet)' }} />
      </div>

      {/* ── Main body: metrics left + steps right ── */}
      <div className="demo-body">

        {/* LEFT: live metrics panel */}
        <div className="demo-metrics">
          <div className="metric-panel-title">Live metrics</div>

          <div className={`metric-tile${errHot ? ' metric-tile-hot' : ''}`}>
            <div className="metric-tile-label">HTTP 500 rate</div>
            <div className={`metric-tile-value${errHot ? ' metric-tile-value-hot' : ''}`}>{errRate}</div>
            <MiniChart points={chartPts} />
          </div>

          <div className="metric-tile">
            <div className="metric-tile-label">Latency p99</div>
            <div className={`metric-tile-value${errHot ? ' metric-tile-value-warn' : ''}`}>
              {phase === 'idle' ? '178ms' : deployDone ? '178ms' : activeStep >= 1 ? '4,200ms' : '178ms'}
            </div>
          </div>

          <div className="metric-tile">
            <div className="metric-tile-label">Health checks</div>
            <div className={`metric-tile-value${errHot ? ' metric-tile-value-hot' : ' metric-tile-value-ok'}`}>
              {errHot ? 'FAILING' : 'PASSING'}
            </div>
          </div>

          {phase !== 'idle' && (
            <div className="metric-tile">
              <div className="metric-tile-label">Incident</div>
              <div className="metric-tile-value" style={{ fontSize: '13px', color: 'var(--violet)' }}>#INC-4471</div>
            </div>
          )}

          {/* Agent activity list */}
          {phase !== 'idle' && (
            <div className="agent-activity">
              <div className="metric-panel-title" style={{ marginBottom: 10 }}>Agent activity</div>
              {['Detective','Analyst','Fixer','Reviewer','Operator','Watcher'].map(a => {
                const stepIdx = DEMO_STEPS.findIndex(s => s.agent === a);
                const lastIdx = [...DEMO_STEPS].reverse().findIndex(s => s.agent === a);
                const realLast = DEMO_STEPS.length - 1 - lastIdx;
                const isActive = activeStep >= stepIdx && activeStep <= realLast && !completed.includes(realLast);
                const isDone   = completed.includes(realLast);
                return (
                  <div key={a} className={`agent-row${isActive?' agent-row-active':''}${isDone?' agent-row-done':''}`}>
                    <span className="agent-dot" style={{ background: AGENT_COLORS[a], boxShadow: isActive ? `0 0 8px ${AGENT_COLORS[a]}` : 'none' }} />
                    <span className="agent-row-name">{a}</span>
                    <span className="agent-row-status">{isDone ? 'done' : isActive ? 'working' : 'idle'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: step-by-step feed */}
        <div className="demo-feed">
          {phase === 'idle' ? (
            <div className="demo-idle-hint">
              <div className="idle-icon">⚡</div>
              <p>Click <strong>Trigger incident</strong> to simulate a production error and watch BOB respond in real time — step by step.</p>
            </div>
          ) : (
            <div className="demo-steps-wrap">
              <div className="demo-v-line" />
              {DEMO_STEPS.map((step, i) => {
                if (i > activeStep) return null;
                const done   = completed.includes(i);
                const active = activeStep === i;
                const isGate = step.gate;
                const isOk   = step.id === 'recovered';

                return (
                  <div
                    key={step.id}
                    ref={el => (stepRefs.current[i] = el)}
                    className={`ds${active?' ds-active':''}${done?' ds-done':''}${isGate?' ds-gate':''}${isOk&&done?' ds-ok':''}`}
                  >
                    <div className="ds-num">
                      {done && isOk  && <span className="dsn dsn-ok">✓</span>}
                      {done && !isOk && <span className="dsn dsn-check">✓</span>}
                      {!done && active && !isGate && <span className="dsn-spin-ring" />}
                      {!done && active && isGate  && <span className="dsn dsn-gate">!</span>}
                      {!done && !active && <span className="dsn dsn-num">{String(i+1).padStart(2,'0')}</span>}
                    </div>
                    <div className="ds-card">
                      <div className="ds-head">
                        <span className="ds-title">{step.label}</span>
                        {step.agent && (
                          <span className="ds-agent" style={{ '--ac': AGENT_COLORS[step.agent] }}>
                            {step.agent}
                          </span>
                        )}
                        {step.tag && <span className={`ds-tag${isGate?' ds-tag-gate':''}`}>{step.tag}</span>}
                        {active && !done && !isGate && <span className="ds-working">working…</span>}
                      </div>
                      <div className="ds-body">
                        {step.content.type === 'alert'    && <AlertBlock    lines={step.content.lines} speed={speed} />}
                        {step.content.type === 'log'      && <LogBlock      lines={step.content.lines} speed={speed} />}
                        {step.content.type === 'deploy'   && <DeployBlock   lines={step.content.lines} speed={speed} />}
                        {step.content.type === 'finding'  && <FindingBlock  title={step.content.title} body={step.content.body} meta={step.content.meta} />}
                        {step.content.type === 'code'     && <CodeBlock     title={step.content.title} before={step.content.before} after={step.content.after} options={step.content.options} />}
                        {step.content.type === 'approval' && <ApprovalBlock summary={step.content.summary} onApprove={handleApprove} onReject={handleReject} decision={decision} />}
                        {step.content.type === 'recovery' && <RecoveryBlock stats={step.content.stats} note={step.content.note} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
