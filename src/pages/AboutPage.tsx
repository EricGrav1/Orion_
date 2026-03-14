import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';

export function AboutPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useOrionTheme();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const dashboardHref = isAuthenticated ? '/' : '/auth';
  const dashboardLabel = isAuthenticated ? 'Dashboard' : 'Login';

  const ctaLabel = useMemo(() => (isAuthenticated ? 'Open dashboard' : 'Get started'), [isAuthenticated]);

  return (
    <div className={`about-page ${theme}`}>
      <SpaceScene />

      {/* Navigation */}
      <nav className={`nav ${mounted ? 'mounted' : ''}`}>
        <div className="nav-left">
          <Link to="/" className="logo" aria-label="Orion Home">
            <svg className="logo-icon" viewBox="0 0 32 36" fill="none">
              <circle cx="16" cy="3" r="2" fill="currentColor" />
              <circle cx="8" cy="10" r="3" fill="currentColor" />
              <circle cx="24" cy="10" r="2.5" fill="currentColor" />
              <circle cx="11" cy="18" r="2" fill="currentColor" />
              <circle cx="16" cy="18" r="2" fill="currentColor" />
              <circle cx="21" cy="18" r="2" fill="currentColor" />
              <circle cx="9" cy="32" r="2.5" fill="currentColor" />
              <circle cx="23" cy="32" r="3" fill="currentColor" />
            </svg>
            <span className="logo-text">ORION</span>
          </Link>
        </div>

        <div className="nav-center">
          <Link to="/about" className="nav-link active">About</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to={dashboardHref} className="nav-link">{dashboardLabel}</Link>
        </div>

        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>

      {/* Main content */}
      <main className={`main-content ${mounted ? 'mounted' : ''}`}>
        <div className="content-container">
          <header className="hero">
            <div className="hero-copy">
              <div className="eyebrow">ORION · COURSE AUTHORING STUDIO</div>
              <h1 className="page-title">Design-forward learning, built at the speed of thought.</h1>
              <p className="page-subtitle">
                Orion is a block-based studio for trainers and instructional designers. Draft with AI, refine with
                pixel-level control, and ship a learner-ready experience—without fighting templates.
              </p>
              <div className="hero-actions">
                <Link to={dashboardHref} className="primary">{ctaLabel}</Link>
                <Link to="/pricing" className="secondary">View pricing</Link>
              </div>
              <div className="hero-meta">
                <div className="meta-chip"><span className="chip-dot" /> Block editor</div>
                <div className="meta-chip"><span className="chip-dot" /> Review links</div>
                <div className="meta-chip"><span className="chip-dot" /> Learner playback</div>
              </div>
            </div>

            <div className="hero-card glass">
              <div className="card-kicker">A guided build loop</div>
              <ol className="loop">
                <li><span className="step-dot" />Bring a URL or paste notes.</li>
                <li><span className="step-dot" />Let Orion draft an outline.</li>
                <li><span className="step-dot" />Compose with blocks, media, and quizzes.</li>
                <li><span className="step-dot" />Share a link, collect feedback, iterate.</li>
              </ol>
              <div className="card-foot">
                <Link to="/progress" className="card-link">See the build progress →</Link>
              </div>
            </div>
          </header>

          <section className="content-section">
            <h2 className="section-title">Built for craft, not compromises.</h2>
            <p className="section-text">
              Most authoring tools make you pick between “fast” and “good.” Orion is designed so a tight timeline doesn’t
              force a generic outcome—your typography, spacing, and pacing still matter.
            </p>
          </section>

          <section className="feature-grid">
            <div className="feature glass">
              <div className="feature-icon">✦</div>
              <h3>Block-based by default</h3>
              <p>Build Rise-style lessons with real structure—reorder, duplicate, hide, and iterate quickly.</p>
            </div>
            <div className="feature glass">
              <div className="feature-icon">⟡</div>
              <h3>AI where it helps</h3>
              <p>Use AI to jump-start outlines and drafts, then edit with full control. No lock-in, no “magic” mystery.</p>
            </div>
            <div className="feature glass">
              <div className="feature-icon">⌁</div>
              <h3>Review-ready</h3>
              <p>Generate a share link for stakeholder feedback and keep authoring uninterrupted.</p>
            </div>
            <div className="feature glass">
              <div className="feature-icon">◌</div>
              <h3>Learner-first playback</h3>
              <p>Preview the course as a learner—progress tracking, quizzes, and a clean reading experience.</p>
            </div>
          </section>

          <section className="content-section constellation">
            <h2 className="section-title">Principles</h2>
            <div className="constellation-grid">
              <div className="principle">
                <div className="p-head">
                  <span className="p-star" />
                  <h3>Clarity over chrome</h3>
                </div>
                <p>Clean hierarchy, generous spacing, and deliberate motion. The lesson is the star.</p>
              </div>
              <div className="principle">
                <div className="p-head">
                  <span className="p-star" />
                  <h3>Speed with guardrails</h3>
                </div>
                <p>Fast creation with consistent patterns, so quality doesn’t depend on heroics.</p>
              </div>
              <div className="principle">
                <div className="p-head">
                  <span className="p-star" />
                  <h3>Ship, then improve</h3>
                </div>
                <p>Version-friendly workflows—draft, review, refine, repeat.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .about-page {
          --bg-primary: #0B0D1A;
          --bg-secondary: rgba(15, 18, 35, 0.85);
          --bg-card: rgba(20, 24, 45, 0.75);
          --bg-card-solid: rgba(25, 30, 55, 0.95);
          --border-color: rgba(255, 255, 255, 0.08);
          --border-active: rgba(255, 255, 255, 0.25);
          --text-primary: #FAFAFA;
          --text-secondary: rgba(255, 255, 255, 0.6);
          --text-muted: rgba(255, 255, 255, 0.4);
          --accent: #D4A84B;
          --accent-hover: #C49A3D;
          --star-blue: #B4D4FF;

          --font-display: 'Cormorant Garamond', Georgia, serif;
          --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;

          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          position: relative;
          overflow-x: hidden;
          font-family: var(--font-body);
        }

        .about-page.light {
          --bg-primary: #E8F0F8;
          --bg-secondary: rgba(255, 255, 255, 0.9);
          --bg-card: rgba(255, 255, 255, 0.85);
          --bg-card-solid: rgba(255, 255, 255, 0.92);
          --border-color: rgba(0, 0, 0, 0.08);
          --border-active: rgba(0, 0, 0, 0.2);
          --text-primary: #1A1A2E;
          --text-secondary: rgba(26, 26, 46, 0.7);
          --text-muted: rgba(26, 26, 46, 0.5);
          --accent: #B8942F;
          --accent-hover: #A8841F;
          background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%);
        }

        .about-page.light .nebula {
          opacity: 0.2;
          filter: saturate(0.5) brightness(1.3);
        }

        .about-page.light .star {
          background: rgba(0, 0, 0, 0.3);
          opacity: 0.4 !important;
        }

        .about-page.light .star.bright {
          background: var(--accent);
          opacity: 0.6 !important;
        }

        .star-field {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        .star {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: var(--size);
          height: var(--size);
          background: white;
          border-radius: 50%;
          animation: twinkle var(--duration) ease-in-out infinite;
          animation-delay: var(--delay);
        }

        .star.bright {
          box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5);
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.3); }
        }

        .nebula {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%),
            radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%),
            radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 85% 25%, rgba(100, 50, 150, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 90% 60% at 15% 20%, rgba(200, 80, 60, 0.2) 0%, transparent 45%),
            radial-gradient(ellipse 70% 50% at 90% 80%, rgba(180, 60, 80, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 30% 30%, rgba(0, 0, 20, 0.4) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 75% 70%, rgba(0, 0, 30, 0.3) 0%, transparent 60%);
          pointer-events: none;
          animation: nebulaDrift 60s ease-in-out infinite alternate;
        }

        @keyframes nebulaDrift {
          0% { transform: scale(1) translate(0, 0); filter: hue-rotate(0deg); }
          50% { transform: scale(1.05) translate(-1%, 1%); filter: hue-rotate(5deg); }
          100% { transform: scale(1.02) translate(1%, -0.5%); filter: hue-rotate(-5deg); }
        }

        .sun {
          position: fixed;
          top: -150px;
          right: 10%;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          opacity: 0;
          transition: opacity 0.8s ease;
        }

        .about-page.light .sun {
          opacity: 0.7;
          background:
            radial-gradient(circle, rgba(255, 245, 220, 0.9) 0%, rgba(255, 220, 150, 0.6) 20%, rgba(255, 200, 100, 0.35) 40%, rgba(255, 180, 80, 0.15) 60%, transparent 75%);
          box-shadow:
            0 0 60px 30px rgba(255, 220, 150, 0.2),
            0 0 120px 60px rgba(255, 200, 100, 0.15),
            0 0 200px 100px rgba(255, 180, 80, 0.1),
            0 0 300px 150px rgba(255, 160, 60, 0.05);
          animation: sunPulse 8s ease-in-out infinite;
        }

        @keyframes sunPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow:
              0 0 60px 30px rgba(255, 220, 150, 0.2),
              0 0 120px 60px rgba(255, 200, 100, 0.15),
              0 0 200px 100px rgba(255, 180, 80, 0.1),
              0 0 300px 150px rgba(255, 160, 60, 0.05);
          }
          50% {
            transform: scale(1.05);
            box-shadow:
              0 0 80px 40px rgba(255, 220, 150, 0.25),
              0 0 150px 80px rgba(255, 200, 100, 0.18),
              0 0 250px 120px rgba(255, 180, 80, 0.12),
              0 0 350px 180px rgba(255, 160, 60, 0.06);
          }
        }

        .sun-rays {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 800px;
          height: 800px;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.8s ease;
        }

        .about-page.light .sun-rays {
          opacity: 0.5;
          background:
            conic-gradient(
              from 0deg,
              transparent 0deg, rgba(255, 230, 180, 0.15) 5deg, transparent 10deg,
              transparent 20deg, rgba(255, 230, 180, 0.1) 25deg, transparent 30deg,
              transparent 45deg, rgba(255, 230, 180, 0.12) 50deg, transparent 55deg,
              transparent 70deg, rgba(255, 230, 180, 0.08) 75deg, transparent 80deg,
              transparent 90deg, rgba(255, 230, 180, 0.15) 95deg, transparent 100deg,
              transparent 115deg, rgba(255, 230, 180, 0.1) 120deg, transparent 125deg,
              transparent 140deg, rgba(255, 230, 180, 0.12) 145deg, transparent 150deg,
              transparent 165deg, rgba(255, 230, 180, 0.08) 170deg, transparent 175deg,
              transparent 180deg, rgba(255, 230, 180, 0.15) 185deg, transparent 190deg,
              transparent 205deg, rgba(255, 230, 180, 0.1) 210deg, transparent 215deg,
              transparent 230deg, rgba(255, 230, 180, 0.12) 235deg, transparent 240deg,
              transparent 255deg, rgba(255, 230, 180, 0.08) 260deg, transparent 265deg,
              transparent 280deg, rgba(255, 230, 180, 0.15) 285deg, transparent 290deg,
              transparent 305deg, rgba(255, 230, 180, 0.1) 310deg, transparent 315deg,
              transparent 330deg, rgba(255, 230, 180, 0.12) 335deg, transparent 340deg,
              transparent 355deg, rgba(255, 230, 180, 0.08) 360deg
            );
          animation: sunRaysRotate 120s linear infinite;
        }

        @keyframes sunRaysRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2.5rem;
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .nav.mounted {
          opacity: 1;
          transform: translateY(0);
        }

        .nav-left { flex: 1; }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: var(--text-primary);
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          color: var(--accent);
        }

        .logo-text {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 400;
          letter-spacing: 0.25em;
        }

        .nav-center {
          display: flex;
          align-items: center;
          gap: 2.5rem;
        }

        .nav-link {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.2s ease;
          letter-spacing: 0.02em;
        }

        .nav-link:hover,
        .nav-link.active {
          color: var(--text-primary);
        }

        .nav-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1.5rem;
        }

        .theme-toggle {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 50%;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .theme-toggle:hover {
          border-color: var(--border-active);
          color: var(--text-primary);
        }

        .theme-toggle svg {
          width: 18px;
          height: 18px;
        }

        .nav-time {
          font-size: 0.75rem;
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }

        @media (max-width: 900px) {
          .nav-center, .nav-time { display: none; }
        }

        .main-content {
          position: relative;
          z-index: 10;
          min-height: 100vh;
          padding: 8rem 2.5rem 4rem;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s;
        }

        .main-content.mounted {
          opacity: 1;
          transform: translateY(0);
        }

        .content-container {
          max-width: 1040px;
          margin: 0 auto;
        }

        .content-section {
          margin: 4rem 0;
        }

        .glass {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: 18px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--accent);
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .page-title {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 300;
          line-height: 1.2;
          margin-bottom: 1.25rem;
          color: var(--text-primary);
        }

        .page-subtitle {
          font-size: 1.125rem;
          line-height: 1.75;
          color: var(--text-secondary);
          max-width: 720px;
          margin: 0;
        }

        .section-title {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 400;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .section-text {
          font-size: 1rem;
          line-height: 1.8;
          color: var(--text-secondary);
        }

        .hero {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 1.5rem;
          margin-top: 0.5rem;
        }

        .hero-copy {
          padding-right: 1rem;
        }

        .hero-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
          flex-wrap: wrap;
        }

        .primary, .secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.95rem 1.25rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          letter-spacing: 0.01em;
          transition: transform 0.18s ease, filter 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .primary {
          background: var(--accent);
          color: white;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 18px 40px rgba(0,0,0,0.25);
        }

        .primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .secondary {
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--border-active);
        }

        .secondary:hover {
          background: var(--bg-card);
          transform: translateY(-1px);
          border-color: var(--text-primary);
        }

        .hero-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 1.25rem;
        }

        .meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.03);
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .chip-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 0 5px rgba(212,168,75,0.12);
        }

        .hero-card {
          padding: 1.25rem 1.25rem 1rem;
          background: var(--bg-card-solid);
          border-color: var(--border-active);
          box-shadow: 0 30px 80px rgba(0,0,0,0.35);
        }

        .card-kicker {
          font-size: 0.85rem;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.9rem;
        }

        .loop {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          color: var(--text-secondary);
        }

        .loop li {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          line-height: 1.6;
        }

        .step-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.35) 55%, transparent 70%);
          box-shadow: 0 0 0 6px rgba(180,212,255,0.12);
          margin-top: 0.35rem;
          flex-shrink: 0;
        }

        .card-foot {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .card-link {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }

        .card-link:hover { text-decoration: underline; }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin: 1rem 0 0;
        }

        .feature {
          padding: 1.25rem 1.1rem 1.15rem;
          transition: transform 0.2s ease, border-color 0.2s ease;
          background: var(--bg-card);
        }

        .feature:hover {
          transform: translateY(-3px);
          border-color: var(--border-active);
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          margin-bottom: 0.8rem;
          background: rgba(212,168,75,0.14);
          color: var(--accent);
          font-size: 1.1rem;
        }

        .feature h3 {
          margin: 0 0 0.35rem;
          font-size: 1.05rem;
          color: var(--text-primary);
        }

        .feature p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.65;
          font-size: 0.95rem;
        }

        .constellation {
          margin-top: 4.5rem;
        }

        .constellation-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 1.25rem;
        }

        .principle {
          padding: 1.1rem 1.15rem;
          border-radius: 16px;
          border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.02);
        }

        .p-head {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 0.5rem;
        }

        .p-star {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow:
            0 0 0 7px rgba(212,168,75,0.12),
            0 0 22px rgba(212,168,75,0.35);
        }

        .principle h3 {
          margin: 0;
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 500;
          letter-spacing: -0.01em;
        }

        .principle p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.7;
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 6rem 1.5rem 3rem;
          }
        }

        @media (max-width: 980px) {
          .hero { grid-template-columns: 1fr; }
          .hero-copy { padding-right: 0; }
          .feature-grid { grid-template-columns: 1fr 1fr; }
          .constellation-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
