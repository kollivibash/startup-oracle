import { useState, useEffect } from 'react';
import { getFounderProfile, fetchProfile } from './communityDB';

const SERIF = "var(--font-serif)";
const F = "var(--font)";
const FD = "var(--font-display)";
const BORDER = 'rgba(15,23,42,.07)';
const LINE = 'rgba(15,23,42,.06)';

const arr = v => Array.isArray(v) ? v : (v ? [String(v)] : []);
const has = v => Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
const toUrl = v => /^https?:\/\//i.test(v) ? v : `https://${v}`;
const cleanUrl = v => String(v).replace(/^https?:\/\//i, '').replace(/\/$/, '');
const raisingActive = p => p && p.raising && p.raising !== 'Not raising';

const SECTIONS = [
  { id: 'pitch', label: 'The Pitch' },
  { id: 'traction', label: 'Traction' },
  { id: 'team', label: 'Team' },
  { id: 'ask', label: 'The Ask' },
];

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: LINE }} />
    </div>
  );
}
const FieldLabel = ({ children }) => <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '0 0 8px' }}>{children}</p>;
const Tag = ({ children, blue }) => <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 11px', borderRadius: 'var(--r-pill)', fontSize: 11.5, fontWeight: 600, background: blue ? 'var(--accent-weak)' : 'var(--surface)', color: blue ? 'var(--accent)' : 'var(--ink-2)', border: blue ? '1px solid transparent' : `1px solid rgba(15,23,42,.10)` }}>{children}</span>;
const Para = ({ children }) => <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.7, margin: 0 }}>{children}</p>;
const Divider = () => <div style={{ height: 1, background: LINE }} />;
const CARD = { background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: `1px solid ${BORDER}`, boxShadow: 'var(--sh-1)', padding: '26px 30px' };

function Avatar({ name, url, sz }) {
  const initial = (name || 'F').trim().charAt(0).toUpperCase();
  return url
    ? <img src={url} alt={name || 'Founder'} style={{ width: sz, height: sz, borderRadius: '50%', objectFit: 'cover' }} />
    : <div style={{ width: sz, height: sz, borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: sz * 0.4, fontWeight: 800, fontFamily: FD }}>{initial}</div>;
}

// The founder's "deal page" — what an investor sees in the deal-flow (Figma founder-profile design):
// sticky identity sidebar (startup, raising, CTAs, section nav) + scrolling The Pitch / Traction /
// Team / The Ask sections. Dual-mode: viewer (investor → Express Interest = DM) and self (Edit).
export default function FounderProfile({ user, targetId, isSelf: isSelfProp, onBack, onHome, onEdit, onExpressInterest, backLabel = '← Deal Flow' }) {
  const viewId = targetId || user?.id;
  const isSelf = isSelfProp !== undefined ? isSelfProp : (!targetId || targetId === user?.id);
  const [prof, setProf] = useState(null);
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('pitch');

  useEffect(() => {
    if (!viewId) return undefined;
    let on = true;
    Promise.all([fetchProfile(viewId), getFounderProfile(viewId)])
      .then(([pr, fp]) => { if (on) { setProf(pr); setP(fp); } })
      .catch(() => {})
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [viewId]);

  useEffect(() => {
    const onScroll = () => {
      const near = SECTIONS
        .map(({ id }) => { const el = document.getElementById(`fp-${id}`); return el ? { id, d: Math.abs(el.getBoundingClientRect().top - 130) } : { id, d: Infinity }; })
        .reduce((a, b) => (a.d < b.d ? a : b));
      setActive(near.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [p]);

  const scrollTo = (id) => { const el = document.getElementById(`fp-${id}`); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' }); };

  const name = p?.fullName || prof?.name || (isSelf ? user?.user_metadata?.name : null) || 'Founder';
  const firstName = name.split(' ')[0];
  const avatar = prof?.avatar_url || (isSelf ? user?.user_metadata?.avatar_url : null) || null;
  const startup = p?.startupName;
  const website = p?.website;
  const navBtn = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, fontSize: 'var(--t-sm)', fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--ink-2)' };
  const express = () => onExpressInterest?.({ id: viewId, name, avatar_url: avatar });

  const showPitch = p && (has(p.problem) || has(p.solution) || has(p.whyNow));
  const showTraction = p && (has(p.launchStatus) || has(p.teamSize) || has(p.keyMetric) || has(p.biggestMilestone));
  const showTeam = p && (has(p.background) || has(p.previousCompanies) || has(p.education) || has(p.priorExits));
  const showAsk = p && (has(p.roundStage) || has(p.amountSeeking) || has(p.beyondCapital) || has(p.preferredContact));
  const visibleNav = SECTIONS.filter(s => ({ pitch: showPitch, traction: showTraction, team: showTeam, ask: showAsk }[s.id]));
  const teamLine = [p?.teamSize && `Team of ${p.teamSize}`, p?.coFounders].filter(Boolean).join(' · ');

  const blueBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--accent)', padding: '11px 18px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', fontFamily: F };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: F }}>
      <style>{`@media (max-width:900px){ .fp-grid{grid-template-columns:1fr!important} .fp-aside{position:static!important} } @media (max-width:620px){ .fp-stats4{grid-template-columns:1fr 1fr!important} .fp-ask4{grid-template-columns:1fr 1fr!important} }`}</style>

      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'color-mix(in srgb, var(--bg) 94%, transparent)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(14px,4vw,24px)', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={onBack} style={navBtn}>{backLabel}</button>
          <button onClick={onHome} style={{ ...navBtn, fontFamily: SERIF, fontSize: 14, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--ink)' }}>Startup Oracle</button>
          {isSelf
            ? <button onClick={() => onEdit(p)} style={blueBtn}>✎ Edit profile</button>
            : onExpressInterest ? <button onClick={express} style={blueBtn}>✦ Express Interest</button> : <span style={{ width: 1 }} />}
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Loading profile…</div>
      ) : (
        <div className="fp-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px clamp(14px,4vw,24px) 80px', display: 'grid', gridTemplateColumns: '310px 1fr', gap: 36, alignItems: 'start' }}>

          {/* ── Identity sidebar ── */}
          <aside className="fp-aside" style={{ position: 'sticky', top: 70 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: `1px solid ${BORDER}`, boxShadow: 'var(--sh-1)', overflow: 'hidden' }}>
              <div style={{ padding: '24px 24px 20px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
                  <Avatar name={name} url={avatar} sz={64} />
                  <div style={{ minWidth: 0, paddingTop: 2 }}>
                    <h1 style={{ fontFamily: FD, fontSize: 17, fontWeight: 800, color: 'var(--ink)', margin: 0, lineHeight: 1.2 }}>{name}</h1>
                    {has(p?.roleTitle) && <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '2px 0 0' }}>{p.roleTitle}</p>}
                    {has(p?.location) && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>📍 {p.location}</div>}
                  </div>
                </div>
                {(has(p?.linkedin) || has(website)) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    {has(p?.linkedin) && <a href={toUrl(p.linkedin)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--ink-2)', textDecoration: 'none', fontWeight: 600 }}>in · LinkedIn</a>}
                    {has(website) && <a href={toUrl(website)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--ink-2)', textDecoration: 'none', fontWeight: 600 }}>🌐 {cleanUrl(website)} ↗</a>}
                  </div>
                )}
                {has(startup) && (
                  <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: FD, fontSize: 20, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{startup}</span>
                      {has(p?.stage) && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent-weak)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>{p.stage}</span>}
                    </div>
                    {has(p?.tagline) && <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45, margin: 0 }}>{p.tagline}</p>}
                  </div>
                )}
              </div>

              {(has(p?.sectors) || has(p?.founded)) && (
                <div style={{ padding: '0 24px 18px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {arr(p?.sectors).map(s => <Tag key={s}>{s}</Tag>)}
                  {has(p?.founded) && <Tag>Founded {p.founded}</Tag>}
                </div>
              )}

              {raisingActive(p) && has(p?.amountSeeking) && (
                <div style={{ margin: '0 24px 18px', borderRadius: 'var(--r)', border: '1px solid rgba(37,99,235,.18)', background: 'rgba(37,99,235,.04)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Actively raising</span>
                    {has(p?.roundStage) && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>{p.roundStage}</span>}
                  </div>
                  <div style={{ fontFamily: FD, fontSize: 30, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{p.amountSeeking}</div>
                </div>
              )}

              <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {isSelf
                  ? <button onClick={() => onEdit(p)} style={{ ...blueBtn, width: '100%' }}>✎ Edit profile</button>
                  : onExpressInterest && <button onClick={express} style={{ ...blueBtn, width: '100%' }}>✦ Express Interest</button>}
              </div>
            </div>

            {visibleNav.length > 0 && (
              <div style={{ marginTop: 12, background: 'var(--surface)', borderRadius: 'var(--r)', border: `1px solid ${BORDER}`, boxShadow: 'var(--sh-1)', overflow: 'hidden' }}>
                {visibleNav.map(({ id, label }, i) => (
                  <button key={id} onClick={() => scrollTo(id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F, background: active === id ? 'rgba(37,99,235,.04)' : 'transparent', color: active === id ? 'var(--accent)' : 'var(--ink-2)', border: 'none', borderBottom: i < visibleNav.length - 1 ? `1px solid ${LINE}` : 'none' }}>
                    {label}
                    {active === id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
                  </button>
                ))}
              </div>
            )}
            {isSelf && <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', margin: '12px 0 0' }}>This is how investors see your profile.</p>}
          </aside>

          {/* ── Main content ── */}
          <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {showPitch && (
              <section id="fp-pitch" style={CARD}>
                <SectionLabel>The Pitch</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {has(p.problem) && <div><FieldLabel>The Problem</FieldLabel><Para>{p.problem}</Para></div>}
                  {has(p.problem) && (has(p.solution) || has(p.whyNow)) && <Divider />}
                  {has(p.solution) && <div><FieldLabel>The Solution</FieldLabel><Para>{p.solution}</Para></div>}
                  {has(p.solution) && has(p.whyNow) && <Divider />}
                  {has(p.whyNow) && <div><FieldLabel>Why Now · Why Us</FieldLabel><Para>{p.whyNow}</Para></div>}
                </div>
              </section>
            )}

            {showTraction && (
              <section id="fp-traction" style={CARD}>
                <SectionLabel>Traction &amp; Momentum</SectionLabel>
                {(has(p.launchStatus) || teamLine) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: has(p.keyMetric) || has(p.biggestMilestone) ? 22 : 0 }}>
                    {has(p.launchStatus) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '5px 12px', borderRadius: 'var(--r-pill)' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />{p.launchStatus}</span>}
                    {teamLine && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--bg)', padding: '5px 12px', borderRadius: 'var(--r-pill)' }}>👥 {teamLine}</span>}
                  </div>
                )}
                {has(p.keyMetric) && (
                  <div style={{ background: 'var(--bg)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: has(p.biggestMilestone) ? 16 : 0 }}>
                    <FieldLabel>Key metric</FieldLabel>
                    <div style={{ fontFamily: FD, fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>{p.keyMetric}</div>
                  </div>
                )}
                {has(p.biggestMilestone) && (
                  <div style={{ borderRadius: 'var(--r)', border: `1px solid rgba(15,23,42,.08)`, padding: '16px 18px' }}>
                    <FieldLabel>Biggest Milestone</FieldLabel>
                    <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{p.biggestMilestone}</p>
                  </div>
                )}
              </section>
            )}

            {showTeam && (
              <section id="fp-team" style={CARD}>
                <SectionLabel>Founder</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 'var(--r)', background: 'var(--bg)', marginBottom: 24 }}>
                  <Avatar name={name} url={avatar} sz={40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: FD, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{name}</span>
                      {has(p?.roleTitle) && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{p.roleTitle}</span>}
                    </div>
                    {has(p?.previousCompanies) && <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '3px 0 0' }}>{p.previousCompanies}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {has(p.background) && <div><FieldLabel>Background</FieldLabel><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{arr(p.background).map(t => <Tag key={t}>{t}</Tag>)}</div></div>}
                  {has(p.previousCompanies) && <><Divider /><div><FieldLabel>Previously at</FieldLabel><p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>{p.previousCompanies}</p></div></>}
                  {has(p.education) && <><Divider /><div><FieldLabel>Education</FieldLabel><p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>{p.education}</p></div></>}
                  {has(p.priorExits) && <><Divider /><div><FieldLabel>Prior Exits &amp; Notable Wins</FieldLabel><p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{p.priorExits}</p></div></>}
                </div>
              </section>
            )}

            {showAsk && (
              <section id="fp-ask" style={CARD}>
                <SectionLabel>The Ask</SectionLabel>
                {(has(p.roundStage) || has(p.amountSeeking)) && (
                  <div className="fp-ask4" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
                    {has(p.roundStage) && <div><FieldLabel>Round</FieldLabel><span style={{ fontSize: 20, fontWeight: 700, fontFamily: FD, color: 'var(--ink)' }}>{p.roundStage}</span></div>}
                    {has(p.amountSeeking) && <div><FieldLabel>Target raise</FieldLabel><span style={{ fontSize: 20, fontWeight: 700, fontFamily: FD, color: 'var(--ink)' }}>{p.amountSeeking}</span></div>}
                  </div>
                )}
                {has(p.beyondCapital) && (
                  <div style={{ marginBottom: has(p.preferredContact) ? 22 : 0 }}>
                    {(has(p.roundStage) || has(p.amountSeeking)) && <div style={{ marginBottom: 22 }}><Divider /></div>}
                    <FieldLabel>What We Want Beyond Capital</FieldLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{arr(p.beyondCapital).map(b => <Tag key={b} blue>{b}</Tag>)}</div>
                  </div>
                )}
                {has(p.preferredContact) && (
                  <div style={{ borderRadius: 'var(--r)', background: 'var(--bg)', padding: '16px 18px' }}>
                    <FieldLabel>Best Way to Reach Us</FieldLabel>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{p.preferredContact}</p>
                  </div>
                )}
              </section>
            )}

            {!isSelf && onExpressInterest && p?.completed && (
              <div style={{ background: 'var(--ink)', borderRadius: 'var(--r-lg)', padding: '26px 30px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 17, fontFamily: FD }}>Interested in {startup || firstName}?</div>
                  <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, marginTop: 4 }}>Send a message — {firstName} will see it in their dashboard.</div>
                </div>
                <button onClick={express} style={{ ...blueBtn, flexShrink: 0 }}>Express Interest →</button>
              </div>
            )}

            {p && !p.completed && (
              <section style={{ ...CARD, textAlign: 'center', padding: '40px 30px' }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{isSelf ? "Your founder profile isn't set up yet" : 'This founder hasn’t completed their profile yet'}</div>
                {isSelf && <><div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 18, lineHeight: 1.55 }}>Complete the short onboarding so investors can see your pitch, traction and the ask.</div><button onClick={() => onEdit(p)} style={{ ...blueBtn }}>Set up my profile →</button></>}
              </section>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
