import React, { useState, useEffect } from 'react';
import { loadData, saveData, callClaude, authUser } from './utils/api';

// --- Helper Functions ---
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const isPastDeadline = (dl) => new Date() > new Date(dl);

// --- Live Clock Hook ---
function useNow(intervalMs = 10000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// --- Login Component ---
function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const user = await authUser(username, password);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ background: 'var(--bg-primary)' }}>
      <div className="modal-content" style={{ animation: 'slideUpFade 0.4s ease' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', textAlign: 'center' }}>
          <span className="text-gradient">GREMLIN</span> LOGIN
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center', textTransform: 'uppercase' }}>
          New here? Type any name to create an account.
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">USERNAME</label>
            <input 
              type="text" 
              className="form-input" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="form-label">PASSWORD</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{error}</div>}
          <button type="submit" className="btn-submit" style={{ marginTop: '1rem' }} disabled={isLoggingIn}>
            {isLoggingIn ? 'CONNECTING...' : 'ENTER THE DUNGEON'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Ticker Component ---
function Ticker({ pledges }) {
  const overdue = pledges.filter((p) => !p.done && !p.failed && isPastDeadline(p.deadline));
  const msgs = overdue.length
    ? overdue.map((p) => `OVERDUE: "${p.task}" — The Gremlin demands answers!`)
    : ['All clear! Keep it up.', 'The Gremlin is watching...', 'No excuses. Just results.'];
  const text = msgs.join('   ·   ');
  return (
    <div className="ticker-wrap">
      <div className="ticker-content">
        {text}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;{text}
      </div>
    </div>
  );
}

// --- Header Component ---
function Header({ streak, user, onLogout }) {
  return (
    <div className="header-container">
      <div>
        <div className="header-title">
          THE <span className="text-gradient">ACCOUNTABILITY</span>
        </div>
        <div className="header-subtitle">GREMLIN</div>
        <div className="header-tagline">WATCHING YOU, {user.originalName.toUpperCase()}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
        <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0.4rem 0.8rem', fontFamily: 'var(--font-mono)' }}>LOGOUT</button>
        <div className="streak-container">
          <div className="streak-value">{streak}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-success)', letterSpacing: '0.1em', marginTop: '4px', textTransform: 'uppercase' }}>Day Streak</div>
        </div>
      </div>
    </div>
  );
}

// --- StatsBar Component ---
function StatsBar({ pledges }) {
  const total = pledges.length;
  const done = pledges.filter((p) => p.done).length;
  const failed = pledges.filter((p) => p.failed).length;
  const active = total - done - failed;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;
  
  return (
    <div className="stats-bar">
      <div className="stat-item">
        <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>{active}</div>
        <div className="stat-label">Active</div>
      </div>
      <div className="stat-item">
        <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{done}</div>
        <div className="stat-label">Done</div>
      </div>
      <div className="stat-item">
        <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{failed}</div>
        <div className="stat-label">Failed</div>
      </div>
      <div className="stat-item">
        <div className="stat-value" style={{ color: rate >= 70 ? 'var(--accent-success)' : rate >= 40 ? 'var(--accent-secondary)' : 'var(--accent-primary)' }}>
          {rate}%
        </div>
        <div className="stat-label">Success Rate</div>
      </div>
    </div>
  );
}

// --- AddPledge Component ---
function AddPledge({ onAdd }) {
  const [task, setTask] = useState('');
  const [deadlineStr, setDeadlineStr] = useState('');
  const [consequence, setConsequence] = useState('');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('quick'); // 'quick' or 'custom'
  const [selectedQuickPick, setSelectedQuickPick] = useState(null);

  // Quick picks
  const quickPicks = [
    { label: '10 Mins', mins: 10 },
    { label: '30 Mins', mins: 30 },
    { label: '1 Hour', hours: 1 },
    { label: '4 Hours', hours: 4 },
    { label: 'End of Day', eod: true },
    { label: 'Tmrw Morning', tmrwMorning: true },
    { label: 'Tmrw Night', tmrwEod: true },
  ];

  function setQuickPick(opt, index) {
    const d = new Date();
    if (opt.mins) d.setMinutes(d.getMinutes() + opt.mins);
    else if (opt.hours) d.setHours(d.getHours() + opt.hours);
    else if (opt.eod) d.setHours(23, 59, 0, 0);
    else if (opt.tmrwMorning) { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
    else if (opt.tmrwEod) { d.setDate(d.getDate() + 1); d.setHours(23, 59, 0, 0); }
    
    // Adjust to local datetime-local format
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setDeadlineStr(d.toISOString().slice(0, 16));
    setSelectedQuickPick(index);
  }

  // Clear selected quick pick if user manually edits the custom input
  function handleCustomDateChange(e) {
    setDeadlineStr(e.target.value);
    setSelectedQuickPick(null);
  }

  function submit() {
    if (!task.trim() || !deadlineStr) return;
    onAdd({ task: task.trim(), deadline: new Date(deadlineStr).toISOString(), consequence: consequence.trim() });
    setTask(''); setDeadlineStr(''); setConsequence(''); setOpen(false); setSelectedQuickPick(null);
  }

  return (
    <div className="pledge-form-container">
      {!open ? (
        <button className="btn-new-pledge" onClick={() => setOpen(true)}>+ NEW PLEDGE</button>
      ) : (
        <div className="pledge-form">
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: 'var(--accent-secondary)' }}>MAKE YOUR PLEDGE</div>
          
          <div>
            <label className="form-label">WHAT WILL YOU DO? *</label>
            <textarea className="form-input" value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Finish the project proposal..." rows={2} />
          </div>

          <div>
            <label className="form-label">DEADLINE *</label>
            
            <div className="tab-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button 
                type="button"
                className={`btn-tab ${tab === 'quick' ? 'active' : ''}`} 
                onClick={() => setTab('quick')}
              >
                Quick Select
              </button>
              <button 
                type="button"
                className={`btn-tab ${tab === 'custom' ? 'active' : ''}`} 
                onClick={() => setTab('custom')}
              >
                Custom Date
              </button>
            </div>

            {tab === 'quick' ? (
              <div className="quick-picks" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {quickPicks.map((qp, i) => (
                  <button 
                    key={i} 
                    className={`btn-quick-pick ${selectedQuickPick === i ? 'active' : ''}`} 
                    type="button" 
                    onClick={() => setQuickPick(qp, i)}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={deadlineStr} 
                  onChange={handleCustomDateChange} 
                  onClick={(e) => {
                    if (e.target.showPicker) e.target.showPicker();
                  }}
                  style={{ cursor: 'pointer', width: '100%' }}
                />
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>
                  Click anywhere on the box above to open the calendar popup.
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">CONSEQUENCE IF YOU FAIL (OPTIONAL)</label>
            <input type="text" className="form-input" value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder="e.g. No YouTube for a week..." />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button className="btn-submit" type="button" onClick={submit} disabled={!task.trim() || !deadlineStr}>COMMIT TO THIS</button>
            <button className="btn-cancel" type="button" onClick={() => { setOpen(false); setSelectedQuickPick(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- PledgeCard Component ---
function PledgeCard({ pledge, onComplete, onFail, onDelete }) {
  const now = useNow(10000);
  const overdue = !pledge.done && !pledge.failed && now > new Date(pledge.deadline);

  const timeLeft = () => {
    const diff = new Date(pledge.deadline) - now;
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
    if (h > 48) return `${Math.floor(h / 24)}d left`;
    if (h > 0) return `${h}h ${m}m left`;
    if (m > 0) return `${m}m left`;
    return 'Less than a minute!';
  };
  const tl = timeLeft();

  return (
    <div className={`pledge-card ${overdue ? 'overdue' : ''}`} style={{ opacity: pledge.failed ? 0.6 : 1 }}>
      {overdue && <div className="badge badge-overdue">OVERDUE</div>}
      {pledge.done && <div className="badge badge-done">DONE</div>}
      
      <div className="pledge-task" style={{ textDecoration: pledge.done || pledge.failed ? 'line-through' : 'none', color: pledge.failed ? 'var(--text-muted)' : 'inherit' }}>
        {pledge.task}
      </div>
      
      <div className="pledge-meta">
        <span>{fmtDate(pledge.deadline)} at {fmtTime(pledge.deadline)}</span>
        {tl && !pledge.done && !pledge.failed && (
          <span style={{ color: tl.includes('m left') && !tl.includes('h') ? 'var(--accent-primary)' : 'var(--accent-secondary)' }}>{tl}</span>
        )}
        {pledge.consequence && <span>{pledge.consequence}</span>}
      </div>
      
      {pledge.proof && <div style={{ fontSize: '0.8rem', color: 'var(--accent-success)', marginBottom: '1rem', fontStyle: 'italic', padding: '0.5rem', background: 'rgba(255,200,92,0.05)', borderRadius: '4px' }}>"{pledge.proof}"</div>}
      
      {!pledge.done && !pledge.failed && (
        <div className="pledge-actions">
          <button className="btn-done" onClick={onComplete}>DONE</button>
          {overdue && <button className="btn-fail" onClick={onFail}>I FAILED</button>}
          <button style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'underline' }} onClick={onDelete}>Delete</button>
        </div>
      )}
      {(pledge.done || pledge.failed) && (
        <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'underline', padding: 0 }} onClick={onDelete}>Remove</button>
      )}
    </div>
  );
}

// --- Modals ---
function Modals({ modal, setModal, markFailed, markDone }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [proof, setProof] = useState('');

  useEffect(() => {
    if (modal?.type === 'fail') {
      setLoading(true);
      const uc = modal.pledge.consequence ? `Their self-imposed consequence: "${modal.pledge.consequence}".` : 'They set no consequence.';
      callClaude(`You are the Accountability Gremlin. Someone failed: "${modal.pledge.task}". ${uc} Roast them dramatically in 3 sentences. End with one encouraging sentence.`)
        .then(txt => { setResponse(txt); setLoading(false); })
        .catch(() => { setResponse("THE GREMLIN IS DISAPPOINTED. Do better."); setLoading(false); });
    }
  }, [modal]);

  function submitProof() {
    if (!proof.trim()) return;
    setLoading(true);
    callClaude(`You are the Accountability Gremlin. Someone succeeded: "${modal.pledge.task}". Proof: "${proof}". Give dramatic, over-the-top praise in 3 sentences.`)
      .then(txt => { setResponse(txt); setLoading(false); })
      .catch(() => { setResponse("YOU DID IT! The Gremlin is proud."); setLoading(false); });
  }

  if (!modal) return null;

  if (modal.type === 'fail') {
    return (
      <div className="modal-overlay">
        <div className="modal-content modal-fail">
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--accent-primary)', marginBottom: '1rem', textAlign: 'center', fontWeight: '900' }}>FAILURE DETECTED</div>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--accent-glow)', minHeight: '100px', marginBottom: '1.5rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
            {loading ? <span style={{ animation: 'pulseGlow 1s infinite' }}>Summoning wrath...</span> : response}
          </div>
          <button className="btn-submit" onClick={() => { markFailed(modal.pledge.id); setModal(null); }}>I ACCEPT MY SHAME</button>
        </div>
      </div>
    );
  }

  if (modal.type === 'complete') {
    return (
      <div className="modal-overlay">
        <div className="modal-content modal-success">
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--accent-success)', marginBottom: '1rem', textAlign: 'center', fontWeight: '900' }}>PLEDGE COMPLETE!</div>
          {!response ? (
            <>
              <div className="form-label" style={{ marginBottom: '1rem' }}>Prove it. What did you actually do?</div>
              <textarea className="form-input" rows="4" value={proof} onChange={e => setProof(e.target.value)} placeholder="I finished the document and sent the email..." style={{ marginBottom: '1.5rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-submit" onClick={submitProof} disabled={!proof.trim() || loading} style={{ background: proof.trim() && !loading ? 'var(--accent-success)' : '#333', color: proof.trim() && !loading ? '#000' : '#888' }}>
                  {loading ? 'READING...' : 'SUBMIT PROOF'}
                </button>
                <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--success-glow)', marginBottom: '1.5rem', fontStyle: 'italic' }}>{response}</div>
              <button className="btn-submit" style={{ background: 'var(--accent-success)', color: '#000' }} onClick={() => { markDone(modal.pledge.id, proof); setModal(null); setResponse(''); setProof(''); }}>LET'S KEEP GOING</button>
            </>
          )}
        </div>
      </div>
    );
  }
}

// --- Main App ---
export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('active');

  // Load data when user logs in
  useEffect(() => {
    if (user) {
      loadData(user.username).then(d => setData(d));
    }
  }, [user]);

  async function updateData(d) {
    setData(d);
    await saveData(user.username, d);
  }

  function handleLogout() {
    setUser(null);
    setData(null);
  }

  function addPledge(fields) {
    const pledge = { id: Date.now(), ...fields, done: false, failed: false, createdAt: new Date().toISOString() };
    updateData({ ...data, pledges: [pledge, ...data.pledges] });
  }

  function markDone(id, proof) {
    const pledges = data.pledges.map((p) => p.id === id ? { ...p, done: true, proof, doneAt: new Date().toISOString() } : p);
    const todayStr = new Date().toDateString();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    let streak = data.streak || 0;
    if (data.lastDoneDate !== todayStr) {
      streak = data.lastDoneDate === yesterday.toDateString() ? streak + 1 : 1;
    }
    updateData({ ...data, pledges, streak, lastDoneDate: todayStr });
  }

  function markFailed(id) {
    updateData({ ...data, pledges: data.pledges.map((p) => p.id === id ? { ...p, failed: true, failedAt: new Date().toISOString() } : p) });
  }

  function deletePledge(id) {
    updateData({ ...data, pledges: data.pledges.filter((p) => p.id !== id) });
  }

  if (!user) {
    return (
      <>
        <Login onLogin={setUser} />
      </>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', fontSize: '1.5rem', animation: 'pulseGlow 1s infinite' }}>
        SUMMONING YOUR PLEDGES FROM THE CLOUD...
      </div>
    );
  }

  const filtered = data.pledges.filter((p) => {
    if (filter === 'active') return !p.done && !p.failed;
    if (filter === 'done') return p.done;
    if (filter === 'failed') return p.failed;
    return true;
  });

  const overdue = data.pledges.filter((p) => !p.done && !p.failed && isPastDeadline(p.deadline));

  return (
    <div className="main-app-container">
      {overdue.length > 0 && <Ticker pledges={data.pledges} />}
      <Header streak={data.streak || 0} user={user} onLogout={handleLogout} />
      <StatsBar pledges={data.pledges} />
      <AddPledge onAdd={addPledge} />
      
      <div className="filters">
        {['active', 'done', 'failed', 'all'].map((f) => (
          <button key={f} className={`btn-filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      
      <div className="pledge-list">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            {filter === 'active' ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'float 3s ease-in-out infinite' }}>...</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Nothing here yet.</div>
                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>The Gremlin is waiting...</div>
              </>
            ) : `No ${filter} pledges.`}
          </div>
        ) : (
          filtered.map((pledge) => (
            <PledgeCard key={pledge.id} pledge={pledge} onComplete={() => setModal({ type: 'complete', pledge })} onFail={() => setModal({ type: 'fail', pledge })} onDelete={() => deletePledge(pledge.id)} />
          ))
        )}
      </div>

      <Modals modal={modal} setModal={setModal} markFailed={markFailed} markDone={markDone} />

      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.15em', borderTop: '1px solid var(--border-color)', textTransform: 'uppercase' }}>
        Accountability Gremlin · React Edition · No Excuses
      </div>
    </div>
  );
}
