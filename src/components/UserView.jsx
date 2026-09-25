import { useState, useEffect, useRef, useCallback } from 'react';
import './UserView.css';

// ─── Simulated cart ───────────────────────────────────────────────────────────
const CART = [
  { name: 'Sony WH-1000XM5 Headphones', qty: 1, price: '$349.99' },
  { name: 'USB-C Charging Cable (2m)',   qty: 2, price: '$19.99'  },
];
const ORDER_TOTAL = '$389.97';

// ─── BOB recovery timeline shown to the user ─────────────────────────────────
const RECOVERY_STEPS = [
  { id: 'detect',   icon: '🔍', label: 'Issue detected',          sub: 'BOB identified a payment processor outage',      duration: 1200 },
  { id: 'diagnose', icon: '📊', label: 'Diagnosing root cause',   sub: 'Analysing server logs and transaction traces…',   duration: 2000 },
  { id: 'fix',      icon: '🔧', label: 'Fix in progress',         sub: 'Engineering team notified, fix being deployed',   duration: 2400 },
  { id: 'test',     icon: '✅', label: 'Testing recovery',        sub: 'Verifying payment processing is stable again',    duration: 1800 },
  { id: 'restored', icon: '🎉', label: 'Service restored',        sub: 'Payments are working. Your cart is saved.',       duration: 0    },
];

// ─── Animated dots ────────────────────────────────────────────────────────────
function Dots() {
  const [d, setD] = useState('');
  useEffect(() => {
    const iv = setInterval(() => setD(p => p.length >= 3 ? '' : p + '.'), 500);
    return () => clearInterval(iv);
  }, []);
  return <span className="uv-dots">{d}</span>;
}

// ─── Live ETA countdown ───────────────────────────────────────────────────────
function ETATimer({ seconds, done }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (done) return;
    const iv = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000);
    return () => clearInterval(iv);
  }, [done]);
  if (done) return <span className="uv-eta uv-eta-done">Restored ✓</span>;
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, '0');
  return <span className="uv-eta">{m}:{s} estimated</span>;
}

// ─── Fake Google Pay sheet ────────────────────────────────────────────────────
function PaySheet({ onPay }) {
  const [state, setState] = useState('idle'); // idle | loading | error
  const handlePay = () => {
    setState('loading');
    setTimeout(() => setState('error'), 1800);
  };
  if (state === 'error') {
    onPay();
    return null;
  }
  return (
    <div className="pay-sheet">
      <div className="pay-sheet-header">
        <div className="pay-sheet-logo">
          <span className="gpay-g">G</span>
          <span className="gpay-text">Pay</span>
        </div>
        <span className="pay-sheet-merchant">Checkout · StoreFront</span>
      </div>

      <div className="pay-sheet-amount">
        <span className="pay-amount-label">Total</span>
        <span className="pay-amount-value">{ORDER_TOTAL}</span>
      </div>

      <div className="pay-sheet-card">
        <span className="pay-card-icon">💳</span>
        <div>
          <div className="pay-card-name">Visa •••• 4242</div>
          <div className="pay-card-sub">Google Pay · Default</div>
        </div>
        <span className="pay-card-check">✓</span>
      </div>

      <button
        className={`pay-btn${state === 'loading' ? ' pay-btn-loading' : ''}`}
        onClick={handlePay}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? (
          <><span className="pay-spinner" />Processing…</>
        ) : (
          <><span className="gpay-g-sm">G</span> Pay {ORDER_TOTAL}</>
        )}
      </button>

      <p className="pay-secure">🔒 Secured by Google Pay</p>
    </div>
  );
}

// ─── BOB status card shown to the user after failure ─────────────────────────
function BobStatusCard({ onRetry }) {
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone]             = useState(false);
  const [retrying, setRetrying]     = useState(false);
  const timerRef = useRef(null);

  const advance = useCallback((i) => {
    if (i >= RECOVERY_STEPS.length - 1) { setDone(true); return; }
    const dur = RECOVERY_STEPS[i].duration;
    timerRef.current = setTimeout(() => { setActiveStep(i + 1); advance(i + 1); }, dur);
  }, []);

  useEffect(() => { advance(0); return () => clearTimeout(timerRef.current); }, [advance]);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => { onRetry(); }, 1200);
  };

  const totalDuration = RECOVERY_STEPS.slice(0, -1).reduce((s, x) => s + x.duration, 0);
  const etaSeconds = Math.round(totalDuration / 1000);

  return (
    <div className={`bob-card${done ? ' bob-card-done' : ''}`}>
      {/* Header */}
      <div className="bob-card-hdr">
        <div className="bob-card-hdr-left">
          <span className={`bob-status-dot${done ? ' bob-status-dot-ok' : ' bob-status-dot-warn'}`} />
          <div>
            <div className="bob-card-title">
              {done ? 'Payment service restored' : <>Payment service issue detected<Dots /></>}
            </div>
            <div className="bob-card-sub">
              {done
                ? 'Your cart is saved. You can complete your purchase now.'
                : 'BOB is working to fix this automatically. Your cart is safe.'}
            </div>
          </div>
        </div>
        <ETATimer seconds={etaSeconds} done={done} />
      </div>

      {/* Cart reminder */}
      <div className="bob-cart">
        <div className="bob-cart-title">Your cart is saved</div>
        {CART.map(item => (
          <div className="bob-cart-row" key={item.name}>
            <span className="bob-cart-name">{item.name}</span>
            <span className="bob-cart-qty">× {item.qty}</span>
            <span className="bob-cart-price">{item.price}</span>
          </div>
        ))}
        <div className="bob-cart-total">
          <span>Total</span>
          <span>{ORDER_TOTAL}</span>
        </div>
      </div>

      {/* Recovery timeline */}
      <div className="bob-timeline">
        <div className="bob-timeline-title">What BOB is doing</div>
        {RECOVERY_STEPS.map((step, i) => {
          const stepDone   = i < activeStep || (i === activeStep && done);
          const stepActive = i === activeStep && !done;
          return (
            <div
              key={step.id}
              className={`bob-step${stepDone ? ' bob-step-done' : ''}${stepActive ? ' bob-step-active' : ''}${i > activeStep ? ' bob-step-pending' : ''}`}
            >
              <div className="bob-step-icon">
                {stepDone  && <span className="bsi-check">✓</span>}
                {stepActive && <span className="bsi-spin" />}
                {i > activeStep && <span className="bsi-pending">{step.icon}</span>}
              </div>
              <div className="bob-step-body">
                <div className="bob-step-label">{step.label}</div>
                <div className="bob-step-sub">{step.sub}</div>
              </div>
              {stepActive && <span className="bob-step-badge">In progress</span>}
              {stepDone   && i < RECOVERY_STEPS.length - 1 && <span className="bob-step-badge bob-step-badge-done">Done</span>}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="bob-actions">
        {done ? (
          <button
            className={`bob-retry-btn${retrying ? ' bob-retry-btn-loading' : ''}`}
            onClick={handleRetry}
            disabled={retrying}
          >
            {retrying ? <><span className="pay-spinner" />Retrying payment…</> : '✓ Complete my purchase'}
          </button>
        ) : (
          <>
            <button className="bob-wait-btn" disabled>
              <span className="pay-spinner" />Waiting for service to restore…
            </button>
            <button className="bob-support-btn" onClick={() => alert('Support chat would open here')}>
              Chat with support
            </button>
          </>
        )}
      </div>

      <p className="bob-footer-note">
        Powered by <strong>BOB</strong> — autonomous incident recovery · Your payment info is never lost
      </p>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen() {
  return (
    <div className="uv-success">
      <div className="uv-success-icon">✓</div>
      <h2>Payment successful!</h2>
      <p>Your order has been placed. You'll receive a confirmation email shortly.</p>
      <div className="uv-success-order">Order #GPY-{Math.floor(Math.random() * 90000 + 10000)}</div>
    </div>
  );
}

// ─── Main UserView ────────────────────────────────────────────────────────────
export default function UserView() {
  const [screen, setScreen] = useState('checkout'); // checkout | incident | success

  return (
    <div className="uv-root">
      {/* Phone frame */}
      <div className="uv-phone-wrap">
        <div className="uv-phone">
          {/* Status bar */}
          <div className="uv-status-bar">
            <span>9:41</span>
            <span className="uv-status-icons">●●● 5G 🔋</span>
          </div>

          {/* App bar */}
          <div className="uv-app-bar">
            <span className="uv-app-back">←</span>
            <span className="uv-app-title">Checkout</span>
            <span className="uv-app-lock">🔒</span>
          </div>

          {/* Screen content */}
          <div className="uv-screen">
            {screen === 'checkout' && (
              <div className="uv-checkout">
                <div className="uv-checkout-summary">
                  <div className="uv-checkout-title">Order summary</div>
                  {CART.map(item => (
                    <div className="uv-checkout-row" key={item.name}>
                      <span className="uv-checkout-name">{item.name}</span>
                      <span className="uv-checkout-price">{item.price}</span>
                    </div>
                  ))}
                  <div className="uv-checkout-total">
                    <span>Total</span>
                    <span>{ORDER_TOTAL}</span>
                  </div>
                </div>
                <PaySheet onPay={() => setScreen('incident')} />
              </div>
            )}

            {screen === 'incident' && (
              <BobStatusCard onRetry={() => setScreen('success')} />
            )}

            {screen === 'success' && <SuccessScreen />}
          </div>
        </div>
      </div>

      {/* Explanation panel beside the phone */}
      <div className="uv-explain">
        <div className="uv-explain-eyebrow">User experience</div>
        <h2 className="uv-explain-title">
          {screen === 'checkout' && 'Customer is about to pay'}
          {screen === 'incident' && 'Server goes down — BOB takes over'}
          {screen === 'success'  && 'Service restored, purchase completes'}
        </h2>
        <p className="uv-explain-body">
          {screen === 'checkout' && 'Instead of a blank error screen or a lost cart, the customer sees a live status card explaining what happened and what BOB is doing about it.'}
          {screen === 'incident' && 'BOB automatically detects the outage, shows the customer a friendly recovery timeline, saves their cart, and lets them complete the purchase the moment service is restored — no support ticket needed.'}
          {screen === 'success'  && 'Once BOB fixes the issue and the developer approves the fix, the customer is automatically prompted to retry. Their cart, address, and payment method were never lost.'}
        </p>

        <div className="uv-explain-steps">
          {[
            { step: 'checkout', label: '① Customer pays',    icon: '🛒' },
            { step: 'incident', label: '② Server fails',     icon: '⚡' },
            { step: 'success',  label: '③ BOB fixes & retry', icon: '✓' },
          ].map(s => (
            <button
              key={s.step}
              className={`uv-step-btn${screen === s.step ? ' uv-step-btn-active' : ''}`}
              onClick={() => setScreen(s.step)}
            >
              <span className="uv-step-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        <div className="uv-explain-badges">
          <span className="uv-badge uv-badge-green">Cart always saved</span>
          <span className="uv-badge uv-badge-violet">Live recovery status</span>
          <span className="uv-badge uv-badge-blue">Zero lost transactions</span>
        </div>
      </div>
    </div>
  );
}
