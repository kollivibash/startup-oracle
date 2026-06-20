// Terms of Service + Privacy Policy pages (AUTH-001).
// Reachable in-app via the `terms` / `privacy` views and shareable via the
// `#/legal/terms` · `#/legal/privacy` hash routes (parsed in App.jsx).
//
// ⚠️ OWNER: this is a product-supplied TEMPLATE, NOT legal advice. Fill in every
// [BRACKETED] placeholder and have it reviewed before launch. The DPDP Act, 2023
// requires a reachable privacy notice + a named Grievance Officer.
import { useEffect } from "react";

const F  = "var(--font)";           // DM Sans — body/UI
const FD = "var(--font-display)";   // Plus Jakarta Sans — headings
const C  = { black:'#0a0a0a', white:'#ffffff', border:'#e6e6e6',
  surface:'#f5f5f5', muted:'#888888', body:'#3d3d3d', accent:'#2563eb' };

const UPDATED      = "20 June 2026";
// Placeholders the owner MUST replace before launch:
const COMPANY      = "[COMPANY LEGAL NAME]";
const CONTACT      = "[CONTACT EMAIL]";
const GRIEVANCE    = "[GRIEVANCE OFFICER NAME], [grievance@email]";
const JURISDICTION = "[CITY, STATE], India";

const H = ({ children }) => (
  <h2 style={{ fontFamily:FD, fontSize:18, fontWeight:800, color:C.black, letterSpacing:'-0.4px', margin:'34px 0 12px' }}>{children}</h2>
);
const P = ({ children }) => (
  <p style={{ fontSize:15, color:C.body, lineHeight:1.7, margin:'0 0 14px' }}>{children}</p>
);
const UL = ({ items }) => (
  <ul style={{ margin:'0 0 14px', paddingLeft:22 }}>
    {items.map((it,i)=>(
      <li key={i} style={{ fontSize:15, color:C.body, lineHeight:1.7, marginBottom:7 }}>{it}</li>
    ))}
  </ul>
);

function Privacy() {
  return (
    <>
      <P>
        This Privacy Policy explains how <strong>{COMPANY}</strong> (“Startup Oracle”, “we”, “us”,
        “our”) collects, uses, shares and protects your personal data when you use the Startup
        Oracle website and services (the “Service”). We process personal data in accordance with
        India’s Digital Personal Data Protection Act, 2023 (the “DPDP Act”) and other applicable law.
      </P>

      <H>1. Information we collect</H>
      <P>We collect the following categories of personal data:</P>
      <UL items={[
        <><strong>Account data</strong> — when you sign up with email: your name, email address and the “I am a…” role you select. When you sign in with Google or GitHub: your name, email and profile photo from that provider.</>,
        <><strong>Profile data you choose to add</strong> — headline, about, experience, education, skills, and any avatar or banner image you upload.</>,
        <><strong>Content you create</strong> — startup ideas you submit, the AI reports generated for you, and your community posts, comments, ratings, polls, reposts and direct messages.</>,
        <><strong>Payment data</strong> — if you subscribe, payments are processed by Razorpay. We receive your subscription status but do <strong>not</strong> collect or store your full card/UPI details.</>,
        <><strong>Technical & usage data</strong> — IP address, device and browser type, and log data, plus cookies / browser <code>localStorage</code> used to keep you signed in and remember preferences.</>,
      ]}/>

      <H>2. How we use your data</H>
      <UL items={[
        "Create and secure your account and authenticate you.",
        "Generate your AI validation reports and operate the community (feed, profiles, messaging, notifications).",
        "Process subscriptions and the Verified Founder badge (when billing is enabled).",
        "Provide support, prevent fraud and abuse, and keep the Service secure.",
        "Understand usage to maintain and improve the Service.",
        "Comply with legal obligations.",
      ]}/>

      <H>3. Legal basis & consent</H>
      <P>
        We process your personal data on the basis of the consent you provide when you create an
        account and submit content, and as necessary to provide the Service you request. You may
        withdraw your consent at any time by emailing <strong>{CONTACT}</strong> or by deleting your
        account; withdrawing consent does not affect processing already carried out, and may mean we
        can no longer provide parts of the Service.
      </P>

      <H>4. AI processing of your ideas</H>
      <P>
        When you request a validation report, the text of your idea is sent to Google’s Gemini API
        through our server to generate the report. Please do not submit sensitive personal data,
        trade secrets, or confidential information you do not wish to share. Reports are
        AI-generated and provided for informational purposes only.
      </P>

      <H>5. Sharing & third-party processors</H>
      <P>We do not sell your personal data. We share it only with service providers that help us run the Service:</P>
      <UL items={[
        <><strong>Supabase</strong> — authentication, database, file storage and realtime.</>,
        <><strong>Google (Gemini API)</strong> — generating validation reports.</>,
        <><strong>Google / GitHub</strong> — optional OAuth sign-in.</>,
        <><strong>Razorpay</strong> — subscription payments (when enabled).</>,
        <><strong>Vercel</strong> — website hosting and delivery.</>,
      ]}/>
      <P>
        Some of these providers may process data on servers outside India. Where that happens, we
        rely on the provider’s safeguards and process such transfers in accordance with applicable
        law.
      </P>

      <H>6. Data retention</H>
      <P>
        We keep your personal data for as long as your account is active or as needed to provide the
        Service. You can delete individual ideas and reports from your account, and you can request
        deletion of your account and associated data by emailing <strong>{CONTACT}</strong>. We may
        retain limited data where required to comply with legal obligations or resolve disputes.
      </P>

      <H>7. Your rights under the DPDP Act</H>
      <P>Subject to the Act, you have the right to:</P>
      <UL items={[
        "Access a summary of the personal data we process about you;",
        "Correct, complete or update inaccurate or incomplete data;",
        "Request erasure of your personal data;",
        "Nominate another person to exercise your rights in the event of death or incapacity;",
        "Withdraw consent; and",
        "Grievance redressal (see Section 11).",
      ]}/>
      <P>To exercise any of these rights, email <strong>{CONTACT}</strong>.</P>

      <H>8. Security</H>
      <P>
        We use reasonable technical and organisational measures — including encryption in transit
        and database row-level security — to protect your data. No method of transmission or storage
        is completely secure, so we cannot guarantee absolute security.
      </P>

      <H>9. Children</H>
      <P>
        The Service is intended for users aged 18 and over and is not directed to children. We do
        not knowingly collect personal data from children without verifiable parental consent as
        required by the DPDP Act.
      </P>

      <H>10. Changes to this policy</H>
      <P>
        We may update this Policy from time to time. Material changes will be reflected by updating
        the “Last updated” date above and, where appropriate, by notice within the Service.
      </P>

      <H>11. Grievance Officer & contact</H>
      <P>
        For any questions, requests or complaints about your personal data, contact our Grievance
        Officer: <strong>{GRIEVANCE}</strong>. General privacy queries: <strong>{CONTACT}</strong>.
        We will acknowledge and respond within the timelines required by applicable law.
      </P>
    </>
  );
}

function Terms() {
  return (
    <>
      <P>
        These Terms of Service (“Terms”) govern your access to and use of the Startup Oracle website
        and services (the “Service”) operated by <strong>{COMPANY}</strong> (“we”, “us”, “our”). By
        creating an account or using the Service, you agree to these Terms. If you do not agree, do
        not use the Service.
      </P>

      <H>1. The Service</H>
      <P>
        Startup Oracle lets founders submit a startup idea and receive an AI-generated, multi-section
        validation report, and provides a community where users can share ideas, follow others, rate
        posts, comment, repost and message. Some features (such as the Verified Founder subscription)
        may be added, changed or removed over time.
      </P>

      <H>2. Eligibility & accounts</H>
      <UL items={[
        "You must be at least 18 years old and able to form a binding contract.",
        "You are responsible for the accuracy of your account information and for keeping your credentials secure.",
        "You are responsible for all activity that occurs under your account.",
      ]}/>

      <H>3. Acceptable use</H>
      <P>You agree not to:</P>
      <UL items={[
        "Post unlawful, infringing, misleading, hateful, harassing or spam content;",
        "Impersonate others or misrepresent your affiliation;",
        "Upload content that infringes another person’s intellectual property or privacy;",
        "Attempt to disrupt, scrape, reverse-engineer, or gain unauthorised access to the Service;",
        "Use the Service to violate any applicable law.",
      ]}/>

      <H>4. Your content</H>
      <P>
        You retain ownership of the ideas, posts and other content you submit (“Your Content”). You
        grant us a non-exclusive, worldwide, royalty-free licence to host, store, reproduce and
        display Your Content solely to operate and provide the Service (for example, showing your
        posts in the community). You are responsible for Your Content and confirm you have the rights
        to share it.
      </P>

      <H>5. AI-generated reports — no professional advice</H>
      <P>
        Validation reports and other AI outputs are generated automatically and are provided for
        general informational purposes only. They are <strong>not</strong> professional, legal,
        financial, investment, tax or business advice, may contain errors or omissions, and are not
        guaranteed to be accurate, complete or current. You are solely responsible for any decision
        you make based on them and should seek qualified professional advice before acting.
      </P>

      <H>6. Subscriptions & payments</H>
      <P>
        The core Service is free, with a limited number of validations. A paid Verified Founder
        subscription (currently ₹50/month or ₹500/year) provides additional validations and the
        verified badge, and is billed through Razorpay. Subscriptions renew automatically until
        cancelled; you can cancel at any time, effective at the end of the current billing period.
        Except where required by law, fees are non-refundable. Prices and plan benefits may change on
        prospective notice.
      </P>

      <H>7. Intellectual property</H>
      <P>
        The Service, including its software, design, and the “Startup Oracle” name and marks, is
        owned by us or our licensors and is protected by law. These Terms do not grant you any right
        in our intellectual property except the limited right to use the Service.
      </P>

      <H>8. Termination</H>
      <P>
        You may stop using the Service and delete your account at any time. We may suspend or
        terminate your access if you breach these Terms or to protect the Service or other users.
      </P>

      <H>9. Disclaimers</H>
      <P>
        The Service is provided “as is” and “as available”, without warranties of any kind, whether
        express or implied, including merchantability, fitness for a particular purpose and
        non-infringement, to the maximum extent permitted by law.
      </P>

      <H>10. Limitation of liability</H>
      <P>
        To the maximum extent permitted by law, we will not be liable for any indirect, incidental,
        special, consequential or punitive damages, or for any loss of profits, data, goodwill or
        business, arising out of or relating to your use of the Service.
      </P>

      <H>11. Governing law</H>
      <P>
        These Terms are governed by the laws of India, and you agree to the exclusive jurisdiction of
        the courts at {JURISDICTION} for any dispute arising out of or relating to the Service.
      </P>

      <H>12. Changes & contact</H>
      <P>
        We may update these Terms from time to time; the “Last updated” date above reflects the
        latest version, and continued use of the Service constitutes acceptance. Questions about
        these Terms: <strong>{CONTACT}</strong>.
      </P>
    </>
  );
}

export default function Legal({ doc = 'privacy', onHome, onDoc }) {
  // Always open at the top — these can be reached from anywhere.
  useEffect(() => { try { window.scrollTo(0, 0); } catch { /* ignore */ } }, [doc]);

  const isPrivacy = doc === 'privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';

  const tab = (id, label) => {
    const active = doc === id;
    return (
      <button onClick={() => (active ? null : onDoc?.(id))}
        style={{ background:'none', border:'none', cursor:active?'default':'pointer', fontFamily:F,
          fontSize:13, fontWeight:700, padding:'6px 0', color:active?C.black:C.muted,
          borderBottom:`2px solid ${active?C.black:'transparent'}` }}>{label}</button>
    );
  };

  return (
    <div style={{ minHeight:'100vh', background:C.white, fontFamily:F }}>
      {/* Navbar — matches the auth screen */}
      <div style={{ borderBottom:`1px solid ${C.border}`, height:68, padding:'0 48px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span onClick={onHome} style={{ fontFamily:FD, fontWeight:800, fontSize:20, letterSpacing:'-0.5px', color:C.black, cursor:'pointer' }}>startup oracle</span>
        <span onClick={onHome} style={{ fontSize:14, color:C.muted, fontWeight:500, cursor:'pointer' }}>← Home</span>
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', padding:'48px 24px 96px' }}>
        <h1 style={{ fontFamily:FD, fontSize:34, fontWeight:800, color:C.black, letterSpacing:'-1px', margin:'0 0 6px' }}>{title}</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'0 0 24px' }}>Last updated {UPDATED}</p>

        <div style={{ display:'flex', gap:24, borderBottom:`1px solid ${C.border}`, marginBottom:8 }}>
          {tab('privacy','Privacy Policy')}
          {tab('terms','Terms of Service')}
        </div>

        {isPrivacy ? <Privacy/> : <Terms/>}
      </div>
    </div>
  );
}
