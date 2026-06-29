// Renders an investor's 6-step onboarding answers (profiles.investor_profile) on their
// community ProfileView, for founders deciding whether to pitch them. Self-contained —
// every block is omitted if the investor left that part of onboarding blank.
const F = "var(--font)";
const FD = "var(--font-display)";

const SECTION = { background:'var(--surface)', borderRadius:'var(--r)', border:'1px solid var(--line)', boxShadow:'var(--sh-1)', padding:'26px 28px' };
const has = v => Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
const toUrl = v => /^https?:\/\//i.test(v) ? v : `https://${v}`;

function Tag({ children, active }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'5px 11px', borderRadius:'var(--r-pill)', fontSize:12, fontWeight:600, fontFamily:F, whiteSpace:'nowrap', background: active ? 'var(--accent-weak)' : 'var(--surface)', color: active ? 'var(--accent)' : 'var(--ink-2)', border: active ? 'none' : '1px solid var(--line)' }}>
      {children}
    </span>
  );
}
const TagList = ({ items }) => <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>{items.map(o => <Tag key={o}>{o}</Tag>)}</div>;

function SectionLabel({ children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--ink-3)', fontFamily:F, whiteSpace:'nowrap' }}>{children}</span>
      <div style={{ flex:1, height:1, background:'var(--line)' }} />
    </div>
  );
}
function FieldLabel({ children }) {
  return <span style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--ink-3)', fontFamily:F, marginBottom:8 }}>{children}</span>;
}
function StatBlock({ value, label }) {
  return (
    <div>
      <div style={{ fontSize:20, fontWeight:700, color:'var(--ink)', fontFamily:FD, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', lineHeight:1.35 }}>{label}</div>
    </div>
  );
}
function Divider({ top }) {
  return <div style={{ marginTop: top ? 18 : 0, paddingTop: top ? 18 : 0, borderTop: top ? '1px solid var(--line)' : 'none' }} />;
}

export default function InvestorProfileSections({ profile, name, isSelf, onPitch }) {
  if (!profile) return null;
  const p = profile;

  const hasSnapshot = has(p.investorType) || has(p.firm) || has(p.linkedin) || has(p.website) || has(p.yearsInvesting) || has(p.aum) || has(p.companiesBacked) || has(p.decisionSpeed);
  const hasThesis = has(p.thesis) || has(p.antiThesis);
  const hasFocus = has(p.sectors) || has(p.businessModels) || has(p.geographies) || has(p.dealBreakers);
  const hasInvestStyle = has(p.typicalTicket) || has(p.followOn) || has(p.leadOrFollow) || has(p.decisionSpeed) || has(p.stagesYouBack);
  const hasCredentials = has(p.background) || has(p.aum) || has(p.companiesBacked) || has(p.notableExits);
  const hasValueAdd = has(p.whatYouBring) || has(p.postInvestment) || has(p.boardSeats) || has(p.preferredApproach);
  const hasStatStrip = has(p.yearsInvesting) || has(p.aum) || has(p.companiesBacked) || has(p.decisionSpeed);
  const hasTicketStrip = has(p.typicalTicket) || has(p.followOn) || has(p.leadOrFollow) || has(p.decisionSpeed);

  if (!hasSnapshot && !hasThesis && !hasFocus && !hasInvestStyle && !hasCredentials && !hasValueAdd) return null;

  return (
    <>
      <style>{`@media (max-width:680px){ .ips-grid2{grid-template-columns:1fr!important} .ips-grid4{grid-template-columns:1fr 1fr!important} }`}</style>

      {hasSnapshot && (
        <div style={SECTION}>
          <SectionLabel>Snapshot</SectionLabel>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:14 }}>
            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10 }}>
              {has(p.investorType) && <Tag active>{p.investorType}</Tag>}
              {has(p.firm) && <span style={{ fontSize:13, color:'var(--ink-2)', fontWeight:600, fontFamily:F }}>{p.firm}</span>}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
              {has(p.linkedin) && <a href={toUrl(p.linkedin)} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'var(--ink-2)', textDecoration:'none', fontWeight:600, fontFamily:F }}>LinkedIn ↗</a>}
              {has(p.website) && <a href={toUrl(p.website)} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'var(--ink-2)', textDecoration:'none', fontWeight:600, fontFamily:F }}>{p.website} ↗</a>}
            </div>
          </div>
          {hasStatStrip && (
            <div className="ips-grid4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20, marginTop:20, paddingTop:18, borderTop:'1px solid var(--line)' }}>
              {has(p.yearsInvesting) && <StatBlock value={p.yearsInvesting} label="Investing for" />}
              {has(p.aum) && <StatBlock value={p.aum} label="Assets under mgmt" />}
              {has(p.companiesBacked) && <StatBlock value={p.companiesBacked} label="Companies backed" />}
              {has(p.decisionSpeed) && <StatBlock value={p.decisionSpeed} label="Decision speed" />}
            </div>
          )}
        </div>
      )}

      {hasThesis && (
        <div style={SECTION}>
          <SectionLabel>Investment Thesis</SectionLabel>
          {has(p.thesis) && <p style={{ fontSize:16, color:'var(--ink)', lineHeight:1.7, fontFamily:FD, fontWeight:500, margin:0 }}>&ldquo;{p.thesis}&rdquo;</p>}
          {has(p.antiThesis) && (
            <div style={{ marginTop: has(p.thesis) ? 22 : 0 }}>
              <Divider top={has(p.thesis)} />
              <FieldLabel>What they don't invest in</FieldLabel>
              <p style={{ fontSize:13.5, color:'var(--ink-2)', lineHeight:1.6, margin:0, fontFamily:F }}>{p.antiThesis}</p>
            </div>
          )}
        </div>
      )}

      {hasFocus && (
        <div style={SECTION}>
          <SectionLabel>Where They Focus</SectionLabel>
          <div className="ips-grid2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'26px 40px' }}>
            {has(p.sectors) && <div><FieldLabel>Sectors</FieldLabel><TagList items={p.sectors} /></div>}
            {has(p.businessModels) && <div><FieldLabel>Business models</FieldLabel><TagList items={p.businessModels} /></div>}
            {has(p.geographies) && <div><FieldLabel>Geographies</FieldLabel><TagList items={p.geographies} /></div>}
            {has(p.dealBreakers) && <div><FieldLabel>Deal-breakers</FieldLabel><TagList items={p.dealBreakers} /></div>}
          </div>
        </div>
      )}

      {hasInvestStyle && (
        <div style={SECTION}>
          <SectionLabel>How They Invest</SectionLabel>
          {hasTicketStrip && (
            <div className="ips-grid4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
              {has(p.typicalTicket) && <StatBlock value={p.typicalTicket} label="Typical ticket" />}
              {has(p.followOn) && <StatBlock value={p.followOn} label="Follow-on reserves" />}
              {has(p.leadOrFollow) && <StatBlock value={p.leadOrFollow} label="Lead or follow" />}
              {has(p.decisionSpeed) && <StatBlock value={p.decisionSpeed} label="Decision speed" />}
            </div>
          )}
          {has(p.stagesYouBack) && (
            <div>
              <Divider top={hasTicketStrip} />
              <FieldLabel>Stages they back</FieldLabel>
              <TagList items={p.stagesYouBack} />
            </div>
          )}
        </div>
      )}

      {(hasCredentials || hasValueAdd) && (
        <div className="ips-grid2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {hasCredentials && (
            <div style={SECTION}>
              <SectionLabel>Credentials</SectionLabel>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {has(p.background) && <div><FieldLabel>Background</FieldLabel><TagList items={p.background} /></div>}
                {(has(p.aum) || has(p.companiesBacked)) && (
                  <div>
                    <Divider top={has(p.background)} />
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      {has(p.aum) && <div><FieldLabel>AUM</FieldLabel><span style={{ fontSize:17, fontWeight:700, fontFamily:FD, color:'var(--ink)' }}>{p.aum}</span></div>}
                      {has(p.companiesBacked) && <div><FieldLabel>Companies backed</FieldLabel><span style={{ fontSize:17, fontWeight:700, fontFamily:FD, color:'var(--ink)' }}>{p.companiesBacked}</span></div>}
                    </div>
                  </div>
                )}
                {has(p.notableExits) && (
                  <div>
                    <Divider top={has(p.background) || has(p.aum) || has(p.companiesBacked)} />
                    <FieldLabel>Notable exits</FieldLabel>
                    <p style={{ fontSize:13.5, color:'var(--ink-2)', lineHeight:1.55, margin:0, fontFamily:F }}>{p.notableExits}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {hasValueAdd && (
            <div style={SECTION}>
              <SectionLabel>Value-Add</SectionLabel>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {has(p.whatYouBring) && <div><FieldLabel>Beyond capital</FieldLabel><TagList items={p.whatYouBring} /></div>}
                {has(p.postInvestment) && <div><Divider top={has(p.whatYouBring)} /><FieldLabel>Post-investment involvement</FieldLabel><p style={{ fontSize:13.5, color:'var(--ink-2)', margin:0, fontFamily:F }}>{p.postInvestment}</p></div>}
                {has(p.boardSeats) && <div><Divider top={has(p.whatYouBring) || has(p.postInvestment)} /><FieldLabel>Board seats</FieldLabel><p style={{ fontSize:13.5, color:'var(--ink-2)', margin:0, fontFamily:F }}>{p.boardSeats}</p></div>}
                {has(p.preferredApproach) && <div><Divider top={has(p.whatYouBring) || has(p.postInvestment) || has(p.boardSeats)} /><FieldLabel>Preferred way to be approached</FieldLabel><TagList items={p.preferredApproach} /></div>}
              </div>
            </div>
          )}
        </div>
      )}

      {!isSelf && onPitch && (
        <div style={{ background:'var(--ink)', borderRadius:'var(--r-lg)', padding:'26px 28px', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <div>
            <div style={{ color:'#fff', fontWeight:700, fontSize:16, fontFamily:FD }}>Ready to pitch {name}?</div>
            <div style={{ color:'rgba(255,255,255,.5)', fontSize:13, marginTop:4, fontFamily:F }}>
              Send a message through Startup Oracle{has(p.decisionSpeed) ? ` — typical decision speed is ${p.decisionSpeed}.` : '.'}
            </div>
          </div>
          <button onClick={onPitch} style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'#fff', background:'var(--accent)', padding:'11px 22px', borderRadius:'var(--r-pill)', border:'none', cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' }}>
            Send Pitch →
          </button>
        </div>
      )}
    </>
  );
}
