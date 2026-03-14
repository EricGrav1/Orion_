import type { CSSProperties, PointerEventHandler } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';

type OrbitFeature = {
  key: string;
  label: string;
  blurb: string;
  meta: string;
  angle: string;
  radius: string;
  delay: string;
  icon: string;
};

export function LandingPage() {
  const { theme, toggleTheme } = useOrionTheme();
  const [mounted, setMounted] = useState(false);
  const [activeFeatureKey, setActiveFeatureKey] = useState('story');
  const pageRef = useRef<HTMLDivElement | null>(null);
  const parallaxRaf = useRef<number | null>(null);

  const orbitFeatures: OrbitFeature[] = useMemo(
    () => [
      {
        key: 'story',
        label: 'Story',
        blurb: 'Narrative-driven pages that feel authored, not assembled.',
        meta: 'Hook → tension → resolution',
        angle: '18deg',
        radius: '168px',
        delay: '0.1s',
        icon: '✦',
      },
      {
        key: 'interactives',
        label: 'Interactives',
        blurb: 'Drag, reveal, and explore—motion that serves meaning.',
        meta: 'Delight without distraction',
        angle: '84deg',
        radius: '212px',
        delay: '0.35s',
        icon: '☄︎',
      },
      {
        key: 'knowledge',
        label: 'Knowledge Checks',
        blurb: 'Quizzes with pacing, feedback, and cinematic transitions.',
        meta: 'Practice with purpose',
        angle: '152deg',
        radius: '188px',
        delay: '0.25s',
        icon: '◎',
      },
      {
        key: 'branching',
        label: 'Branching',
        blurb: 'Choose‑your‑path scenarios for real-world decisions.',
        meta: 'Consequences, not slides',
        angle: '224deg',
        radius: '222px',
        delay: '0.45s',
        icon: '⟡',
      },
      {
        key: 'analytics',
        label: 'Analytics',
        blurb: 'See where learners hesitate, rush, or drop off.',
        meta: 'Teach what matters',
        angle: '298deg',
        radius: '178px',
        delay: '0.3s',
        icon: '◌',
      },
      {
        key: 'export',
        label: 'SCORM Export',
        blurb: 'Ship to your LMS with the reliability you expect.',
        meta: 'Portable by design',
        angle: '350deg',
        radius: '214px',
        delay: '0.18s',
        icon: '⬡',
      },
    ],
    []
  );

  const activeFeature = useMemo(
    () => orbitFeatures.find((f) => f.key === activeFeatureKey) ?? orbitFeatures[0],
    [activeFeatureKey, orbitFeatures]
  );

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const revealNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (revealNodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('in-view');
          }
        }
      },
      { threshold: 0.15 }
    );

    revealNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const setParallax = useCallback((x: number, y: number) => {
    const root = pageRef.current;
    if (!root) return;

    const tiltX = Math.max(-10, Math.min(10, y * -10));
    const tiltY = Math.max(-14, Math.min(14, x * 14));
    const glowX = 50 + x * 18;
    const glowY = 38 + y * 18;

    root.style.setProperty('--tilt-x', `${tiltX}deg`);
    root.style.setProperty('--tilt-y', `${tiltY}deg`);
    root.style.setProperty('--glow-x', `${glowX}%`);
    root.style.setProperty('--glow-y', `${glowY}%`);
  }, []);

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      const root = pageRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      if (parallaxRaf.current) window.cancelAnimationFrame(parallaxRaf.current);
      parallaxRaf.current = window.requestAnimationFrame(() => setParallax(x, y));
    },
    [setParallax]
  );

  const handlePointerLeave = useCallback(() => {
    if (parallaxRaf.current) window.cancelAnimationFrame(parallaxRaf.current);
    parallaxRaf.current = window.requestAnimationFrame(() => setParallax(0, 0));
  }, [setParallax]);

  useEffect(() => {
    return () => {
      if (parallaxRaf.current) window.cancelAnimationFrame(parallaxRaf.current);
    };
  }, []);

  return (
    <div
      ref={pageRef}
      className={`landing-page ${theme}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <SpaceScene />

      <nav className={`nav ${mounted ? 'mounted' : ''}`}>
        <div className="nav-left">
          <Link to="/" className="logo" aria-label="Orion Home">
            <svg className="logo-icon" viewBox="0 0 32 36" fill="none">
              <circle cx="16" cy="3" r="2" fill="currentColor" className="star-dot" />
              <circle cx="8" cy="10" r="3" fill="currentColor" className="star-dot" />
              <circle cx="24" cy="10" r="2.5" fill="currentColor" className="star-dot" />
              <circle cx="11" cy="18" r="2" fill="currentColor" className="star-dot" />
              <circle cx="16" cy="18" r="2" fill="currentColor" className="star-dot" />
              <circle cx="21" cy="18" r="2" fill="currentColor" className="star-dot" />
              <circle cx="9" cy="32" r="2.5" fill="currentColor" className="star-dot" />
              <circle cx="23" cy="32" r="3" fill="currentColor" className="star-dot" />
            </svg>
            <span className="logo-text">ORION</span>
          </Link>
        </div>
        <div className="nav-center">
          <Link to="/about" className="nav-link">
            About
          </Link>
          <Link to="/pricing" className="nav-link">
            Pricing
          </Link>
          <Link to="/auth" className="nav-link">
            Login
          </Link>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>

      <main className={`content ${mounted ? 'mounted' : ''}`}>
        <header className="hero" data-reveal>
          <div className="hero-copy">
            <div className="kicker">
              <span className="kicker-dot" />
              The eLearning experience, reimagined
            </div>
            <h1 className="headline">
              Welcome to the
              <br />
              <span className="headline-accent">learning cosmos</span>
            </h1>
            <p className="subhead">
              Orion turns training into a journey: story, motion, interactivity, and clarity—built with
              blocks, shipped to your LMS, measured with intent.
            </p>

            <div className="cta-row">
              <Link to="/auth" className="cta primary">
                Enter Orion
              </Link>
              <a href="#blocks" className="cta ghost">
                Tour the blocks
              </a>
              <Link to="/pricing" className="cta subtle">
                View pricing
              </Link>
            </div>

            <div className="micro">
              <span>SCORM exports</span>
              <span className="sep">·</span>
              <span>AI-assisted authoring</span>
              <span className="sep">·</span>
              <span>Analytics that illuminate</span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="glass-frame">
              <div className="glass-sheen" />
              <div className="glass-graticule" />

              <div className="orbital">
                <div className="core">
                  <div className="core-top">
                    <span className="core-chip">Learner Journey</span>
                    <span className="core-sigil">✦</span>
                  </div>
                  <div className="core-title">{activeFeature.label}</div>
                  <div className="core-blurb">{activeFeature.blurb}</div>
                  <div className="core-meta">{activeFeature.meta}</div>
                  <div className="core-progress">
                    <span className="bar" />
                  </div>
                </div>

                <div className="rings">
                  <div className="ring ring-a" />
                  <div className="ring ring-b" />
                  <div className="ring ring-c" />
                </div>

                <div className="satellites">
                  {orbitFeatures.map((feature) => (
                    <button
                      key={feature.key}
                      type="button"
                      className={`sat ${activeFeatureKey === feature.key ? 'active' : ''}`}
                      style={
                        {
                          '--a': feature.angle,
                          '--r': feature.radius,
                          '--delay': feature.delay,
                        } as CSSProperties
                      }
                      onFocus={() => setActiveFeatureKey(feature.key)}
                      onMouseEnter={() => setActiveFeatureKey(feature.key)}
                      onBlur={() => setActiveFeatureKey('story')}
                      onMouseLeave={() => setActiveFeatureKey('story')}
                      aria-label={`${feature.label}: ${feature.blurb}`}
                    >
                      <span className="sat-icon" aria-hidden="true">
                        {feature.icon}
                      </span>
                      <span className="sat-label">{feature.label}</span>
                    </button>
                  ))}
                </div>

                <div className="comet" />
              </div>

              <div className="visual-caption">
                <span className="pulse-dot" />
                Hover a “planet” to preview a learning moment
              </div>
            </div>
          </div>
        </header>

        <section id="blocks" className="blocks" data-reveal>
          <div className="section-head">
            <h2>Blocks that feel alive.</h2>
            <p>
              Not just content—moments. Each block is a crafted instrument: paced, responsive, and ready for
              motion.
            </p>
          </div>

          <div className="block-grid">
            {[
              {
                title: 'Cinematic Intros',
                desc: 'Open with a hook—typography, atmosphere, and a reason to care.',
                tag: 'Engage',
              },
              {
                title: 'Knowledge Checks',
                desc: 'Practice with feedback that teaches, not scolds.',
                tag: 'Reinforce',
              },
              {
                title: 'Branching Scenarios',
                desc: 'Decisions, consequences, and replayable paths.',
                tag: 'Apply',
              },
              {
                title: 'Interactive Media',
                desc: 'Video, hotspots, reveals, and layered explanations.',
                tag: 'Explore',
              },
              {
                title: 'Mobile-first Layouts',
                desc: 'Responsive by default—built to work where learners live.',
                tag: 'Adapt',
              },
              {
                title: 'Export + Analytics',
                desc: 'Ship to SCORM and measure the moments that move the needle.',
                tag: 'Improve',
              },
            ].map((item) => (
              <article key={item.title} className="block-card">
                <div className="block-top">
                  <span className="block-tag">{item.tag}</span>
                  <span className="block-spark" aria-hidden="true">
                    ✦
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <div className="block-line" aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>

        <section className="showcase" data-reveal>
          <div className="showcase-card">
            <div className="preview-top">
              <span className="preview-pill">Learner Preview</span>
              <span className="preview-status">Live</span>
            </div>
            <div className="preview-title">Orbit Safety: A Micro‑Lesson</div>
            <div className="preview-body">
              <div className="preview-paragraph shimmer" />
              <div className="preview-paragraph shimmer short" />
              <div className="preview-question">
                <div className="q-title">Knowledge check</div>
                <div className="q-text">Which action reduces risk most during a handoff?</div>
                <div className="q-options">
                  {['Confirm intent', 'Skip verification', 'Rush to ship'].map((opt, idx) => (
                    <div key={opt} className={`q-opt ${idx === 0 ? 'correct' : ''}`}>
                      <span className="q-dot" />
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="preview-progress">
              <span className="track" />
              <span className="fill" />
            </div>
            <div className="scan" aria-hidden="true" />
          </div>

          <div className="showcase-copy">
            <h2>Make learning feel like a place.</h2>
            <p>
              Learners remember environments. Orion gives you atmosphere, pacing, and motion—so your content
              lands as an experience, not a PDF on rails.
            </p>
            <div className="bullets">
              {[
                { k: 'Author fast', v: 'Blocks, templates, and AI to draft—your voice to finish.' },
                { k: 'Teach clearly', v: 'Typography, hierarchy, and spacing that reduce cognitive load.' },
                { k: 'Ship confidently', v: 'SCORM export, responsive layouts, and version‑safe delivery.' },
              ].map((b) => (
                <div key={b.k} className="bullet">
                  <div className="bullet-k">{b.k}</div>
                  <div className="bullet-v">{b.v}</div>
                </div>
              ))}
            </div>
            <div className="cta-row tight">
              <Link to="/auth" className="cta primary">
                Start your first course
              </Link>
              <Link to="/about" className="cta ghost">
                Why Orion
              </Link>
            </div>
          </div>
        </section>

        <section className="closing" data-reveal>
          <div className="closing-card">
            <div className="closing-left">
              <div className="closing-kicker">Ready to chart a better training universe?</div>
              <h2>Build something learners will actually finish.</h2>
              <p>
                Step into Orion. Compose lessons with clarity, motion, and intention—then measure what
                matters.
              </p>
            </div>
            <div className="closing-right">
              <Link to="/auth" className="cta primary big">
                Enter the Observatory
              </Link>
              <Link to="/pricing" className="cta ghost big">
                Compare plans
              </Link>
              <div className="closing-note">7 days free · No card required</div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .landing-page {
          /* Dark theme (default) */
          --bg-primary: #0B0D1A;
          --bg-secondary: rgba(15, 18, 35, 0.85);
          --bg-card: rgba(20, 24, 45, 0.75);
          --border-color: rgba(255, 255, 255, 0.08);
          --border-active: rgba(255, 255, 255, 0.25);
          --text-primary: #FAFAFA;
          --text-secondary: rgba(255, 255, 255, 0.65);
          --text-muted: rgba(255, 255, 255, 0.42);
          --accent: #D4A84B;
          --accent-hover: #C49A3D;
          --star-blue: #B4D4FF;

          --font-display: 'Cormorant Garamond', Georgia, serif;
          --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;

          --tilt-x: 0deg;
          --tilt-y: 0deg;
          --glow-x: 50%;
          --glow-y: 38%;

          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          position: relative;
          overflow-x: hidden;
          font-family: var(--font-body);
        }

        .landing-page.light {
          --bg-primary: #E8F0F8;
          --bg-secondary: rgba(255, 255, 255, 0.9);
          --bg-card: rgba(255, 255, 255, 0.85);
          --border-color: rgba(0, 0, 0, 0.08);
          --border-active: rgba(0, 0, 0, 0.2);
          --text-primary: #1A1A2E;
          --text-secondary: rgba(26, 26, 46, 0.7);
          --text-muted: rgba(26, 26, 46, 0.5);
          --accent: #B8942F;
          --accent-hover: #A8841F;
          background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%);
        }

        .landing-page.light .nebula { opacity: 0.2; filter: saturate(0.5) brightness(1.3); }
        .landing-page.light .star { background: rgba(0, 0, 0, 0.3); opacity: 0.4 !important; }
        .landing-page.light .star.bright { background: var(--accent); opacity: 0.65 !important; }

        /* Star field + nebula */
        .star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
        .star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
        .nebula {
          position: fixed; inset: 0; z-index: 0;
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
        @keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }

        /* Sun (only in light mode) */
        .sun { position: fixed; top: -150px; right: 10%; width: 300px; height: 300px; border-radius: 50%; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.8s ease; }
        .landing-page.light .sun {
          opacity: 0.72;
          background: radial-gradient(circle, rgba(255, 245, 220, 0.9) 0%, rgba(255, 220, 150, 0.6) 20%, rgba(255, 200, 100, 0.35) 40%, rgba(255, 180, 80, 0.15) 60%, transparent 75%);
          box-shadow: 0 0 60px 30px rgba(255, 220, 150, 0.2), 0 0 120px 60px rgba(255, 200, 100, 0.15), 0 0 200px 100px rgba(255, 180, 80, 0.1), 0 0 300px 150px rgba(255, 160, 60, 0.05);
          animation: sunPulse 8s ease-in-out infinite;
        }
        @keyframes sunPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .sun-rays { position: absolute; top: 50%; left: 50%; width: 800px; height: 800px; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.8s ease; }
        .landing-page.light .sun-rays {
          opacity: 0.5;
          background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 230, 180, 0.15) 5deg, transparent 10deg, transparent 20deg, rgba(255, 230, 180, 0.1) 25deg, transparent 30deg, transparent 45deg, rgba(255, 230, 180, 0.12) 50deg, transparent 55deg, transparent 70deg, rgba(255, 230, 180, 0.08) 75deg, transparent 80deg, transparent 90deg, rgba(255, 230, 180, 0.15) 95deg, transparent 100deg, transparent 115deg, rgba(255, 230, 180, 0.1) 120deg, transparent 125deg, transparent 140deg, rgba(255, 230, 180, 0.12) 145deg, transparent 150deg, transparent 165deg, rgba(255, 230, 180, 0.08) 170deg, transparent 175deg, transparent 180deg, rgba(255, 230, 180, 0.15) 185deg, transparent 190deg, transparent 205deg, rgba(255, 230, 180, 0.1) 210deg, transparent 215deg, transparent 230deg, rgba(255, 230, 180, 0.12) 235deg, transparent 240deg, transparent 255deg, rgba(255, 230, 180, 0.08) 260deg, transparent 265deg, transparent 280deg, rgba(255, 230, 180, 0.15) 285deg, transparent 290deg, transparent 305deg, rgba(255, 230, 180, 0.1) 310deg, transparent 315deg, transparent 330deg, rgba(255, 230, 180, 0.12) 335deg, transparent 340deg, transparent 355deg, rgba(255, 230, 180, 0.08) 360deg);
          animation: sunRaysRotate 120s linear infinite;
        }
        @keyframes sunRaysRotate { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }

        /* Nav */
        .nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 76px;
          padding: 0 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 200;
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.8s ease, transform 0.8s ease;
          backdrop-filter: blur(18px);
          background: linear-gradient(180deg, rgba(10,12,26,0.65), rgba(10,12,26,0.25));
          border-bottom: 1px solid var(--border-color);
        }
        .landing-page.light .nav {
          background: linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.2));
        }
        .nav.mounted { opacity: 1; transform: translateY(0); }
        .nav-left, .nav-center, .nav-right { display: flex; align-items: center; gap: 1.5rem; }
        .logo { display: flex; align-items: center; gap: 0.85rem; text-decoration: none; color: var(--accent); }
        .logo-icon { width: 24px; height: 28px; }
        .logo-text { font-family: var(--font-display); letter-spacing: 0.25em; font-size: 0.95rem; font-weight: 500; color: var(--text-primary); }
        .nav-link { color: var(--text-secondary); text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s ease; }
        .nav-link:hover { color: var(--text-primary); }
        .theme-toggle { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); color: var(--text-secondary); display: grid; place-items: center; cursor: pointer; transition: all 0.2s ease; }
        .theme-toggle:hover { border-color: var(--border-active); color: var(--text-primary); transform: translateY(-1px); }
        .theme-toggle svg { width: 18px; height: 18px; }
        .nav-time { font-size: 0.85rem; color: var(--text-muted); letter-spacing: 0.02em; }
        @media (max-width: 820px) { .nav { padding: 0 1.5rem; } .nav-center { display: none; } }
        @media (max-width: 640px) { .nav-time { display: none; } }

        /* Content + reveals */
        .content { position: relative; z-index: 2; padding: 7.5rem 3rem 4rem; opacity: 0; transform: translateY(18px); transition: opacity 0.9s ease, transform 0.9s ease; }
        .content.mounted { opacity: 1; transform: translateY(0); }
        @media (max-width: 820px) { .content { padding: 7rem 1.5rem 3rem; } }
        [data-reveal] { opacity: 0; transform: translateY(16px); filter: blur(8px); transition: opacity 0.9s ease, transform 0.9s ease, filter 0.9s ease; }
        [data-reveal].in-view { opacity: 1; transform: translateY(0); filter: blur(0); }

        /* Hero */
        .hero { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 2.5rem; align-items: center; }
        .hero-copy { max-width: 640px; }
        .kicker { display: inline-flex; align-items: center; gap: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.75rem; }
        .kicker-dot { width: 10px; height: 10px; border-radius: 999px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(212,168,75,0.9)); box-shadow: 0 0 0 8px rgba(212,168,75,0.12); }
        .headline { margin: 1rem 0 0.75rem; font-family: var(--font-display); font-weight: 400; font-size: clamp(2.7rem, 4.1vw, 4.4rem); line-height: 0.98; letter-spacing: -0.01em; }
        .headline-accent {
          display: inline-block;
          font-style: italic;
          color: var(--accent);
          text-shadow: 0 0 22px rgba(212,168,75,0.22);
          position: relative;
        }
        .headline-accent::after {
          content: '';
          position: absolute;
          left: -0.35em;
          right: -0.35em;
          bottom: -0.12em;
          height: 0.55em;
          background: radial-gradient(ellipse 60% 120% at var(--glow-x) var(--glow-y), rgba(212,168,75,0.28), transparent 65%);
          filter: blur(2px);
          z-index: -1;
        }
        .subhead { margin: 0; color: var(--text-secondary); font-size: 1.05rem; line-height: 1.75; max-width: 54ch; }
        .cta-row { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; margin-top: 1.6rem; }
        .cta { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; text-decoration: none; border-radius: 14px; padding: 0.85rem 1.05rem; font-weight: 700; letter-spacing: 0.01em; transition: transform 0.15s ease, filter 0.15s ease, border-color 0.15s ease; }
        .cta.primary { background: linear-gradient(135deg, rgba(212,168,75,0.98), rgba(55,114,255,0.85)); color: #0B0D1A; border: 0; box-shadow: 0 18px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset; }
        .landing-page.light .cta.primary { color: #0B0D1A; box-shadow: 0 18px 36px rgba(15, 20, 40, 0.12), 0 0 0 1px rgba(0,0,0,0.06) inset; }
        .cta.ghost { border: 1px solid var(--border-color); color: var(--text-primary); background: rgba(255,255,255,0.02); }
        .landing-page.light .cta.ghost { background: rgba(255,255,255,0.5); }
        .cta.subtle { border: 1px solid transparent; color: var(--text-secondary); background: transparent; padding-left: 0.6rem; padding-right: 0.6rem; }
        .cta:hover { transform: translateY(-2px); filter: brightness(1.05); }
        .cta:active { transform: translateY(0px); filter: brightness(0.98); }
        .micro { margin-top: 1rem; color: var(--text-muted); font-size: 0.95rem; display: flex; flex-wrap: wrap; gap: 0.6rem; }
        .sep { opacity: 0.6; }

        /* Hero visual */
        .hero-visual { display: flex; justify-content: flex-end; }
        .glass-frame {
          width: min(520px, 100%);
          aspect-ratio: 1 / 1;
          border-radius: 22px;
          border: 1px solid var(--border-color);
          background: radial-gradient(120% 120% at var(--glow-x) var(--glow-y), rgba(212,168,75,0.14), rgba(20,24,45,0.68) 55%, rgba(10,12,26,0.6) 100%);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(18px);
          box-shadow: 0 30px 70px rgba(0,0,0,0.45);
          transform: perspective(1100px) rotateX(calc(10deg + var(--tilt-x))) rotateY(var(--tilt-y));
          transform-style: preserve-3d;
          transition: transform 0.25s ease;
        }
        .landing-page.light .glass-frame { box-shadow: 0 26px 60px rgba(10, 18, 40, 0.12); }
        .glass-sheen {
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 30% 35%, rgba(255,255,255,0.12), transparent 55%);
          transform: translateZ(20px);
          pointer-events: none;
          animation: sheenDrift 14s ease-in-out infinite alternate;
          mix-blend-mode: screen;
        }
        @keyframes sheenDrift { 0% { transform: translateZ(20px) translate(-4%, 2%); } 100% { transform: translateZ(20px) translate(3%, -3%); } }
        .glass-graticule {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 12% 18%, rgba(255,255,255,0.08), transparent 40%),
            radial-gradient(circle at 75% 80%, rgba(180,212,255,0.06), transparent 42%),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, transparent 1px, transparent 16px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 1px, transparent 1px, transparent 18px);
          opacity: 0.6;
          pointer-events: none;
        }

        .orbital { position: absolute; inset: 0; display: grid; place-items: center; }
        .core {
          width: min(290px, 70%);
          border-radius: 18px;
          border: 1px solid var(--border-color);
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          padding: 1rem 1.05rem 1.1rem;
          transform: translateZ(46px);
          box-shadow: 0 22px 45px rgba(0,0,0,0.35);
        }
        .landing-page.light .core { box-shadow: 0 18px 40px rgba(12, 18, 35, 0.12); }
        .core-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
        .core-chip { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-muted); }
        .core-sigil { color: var(--accent); text-shadow: 0 0 18px rgba(212,168,75,0.25); }
        .core-title { font-family: var(--font-display); font-size: 1.7rem; margin-top: 0.5rem; }
        .core-blurb { margin-top: 0.35rem; color: var(--text-secondary); line-height: 1.5; }
        .core-meta { margin-top: 0.55rem; color: var(--text-muted); font-size: 0.95rem; }
        .core-progress { margin-top: 0.9rem; height: 10px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; border: 1px solid var(--border-color); }
        .core-progress .bar { display: block; height: 100%; width: 62%; border-radius: 999px; background: linear-gradient(90deg, rgba(212,168,75,0.95), rgba(180,212,255,0.9)); animation: pulseBar 3.4s ease-in-out infinite; }
        @keyframes pulseBar { 0%, 100% { transform: translateX(-4%); opacity: 0.8; } 50% { transform: translateX(6%); opacity: 1; } }

        .rings { position: absolute; inset: 0; transform: translateZ(10px); }
        .ring { position: absolute; inset: 14%; border-radius: 50%; border: 1px dashed rgba(255,255,255,0.14); opacity: 0.55; filter: drop-shadow(0 0 18px rgba(180,212,255,0.08)); }
        .landing-page.light .ring { border-color: rgba(0,0,0,0.14); opacity: 0.5; }
        .ring-a { inset: 10%; animation: spin 28s linear infinite; }
        .ring-b { inset: 22%; animation: spinReverse 34s linear infinite; }
        .ring-c { inset: 34%; animation: spin 44s linear infinite; opacity: 0.35; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spinReverse { to { transform: rotate(-360deg); } }

        .satellites { position: absolute; inset: 0; transform: translateZ(30px); }
        .sat {
          position: absolute;
          top: 50%;
          left: 50%;
          transform:
            translate(-50%, -50%)
            rotate(var(--a))
            translateX(var(--r))
            rotate(calc(-1 * var(--a)));
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 0.7rem;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: rgba(10,12,26,0.38);
          color: var(--text-secondary);
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
          animation: satFloat 7s ease-in-out infinite;
          animation-delay: var(--delay);
        }
        .landing-page.light .sat { background: rgba(255,255,255,0.45); }
        .sat:hover, .sat:focus-visible {
          outline: none;
          border-color: var(--border-active);
          color: var(--text-primary);
          transform:
            translate(-50%, -50%)
            rotate(var(--a))
            translateX(var(--r))
            rotate(calc(-1 * var(--a)))
            translateY(-2px);
        }
        .sat.active { border-color: rgba(212,168,75,0.55); color: var(--text-primary); background: rgba(212,168,75,0.10); }
        .sat-icon { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 999px; background: rgba(212,168,75,0.14); color: var(--accent); }
        .sat-label { font-size: 0.92rem; font-weight: 650; white-space: nowrap; }
        @keyframes satFloat { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.08); } }

        .comet {
          position: absolute;
          width: 180px;
          height: 2px;
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(180,212,255,0.8), rgba(212,168,75,0.95));
          top: 18%;
          left: -25%;
          opacity: 0.75;
          filter: blur(0.3px);
          transform: rotate(18deg);
          animation: cometFly 9.5s ease-in-out infinite;
          mix-blend-mode: screen;
        }
        @keyframes cometFly {
          0% { transform: translateX(0) translateY(0) rotate(18deg); opacity: 0; }
          12% { opacity: 0.9; }
          55% { transform: translateX(130%) translateY(28%) rotate(18deg); opacity: 0.65; }
          100% { transform: translateX(210%) translateY(44%) rotate(18deg); opacity: 0; }
        }

        .visual-caption {
          position: absolute;
          bottom: 16px;
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.65rem 0.75rem;
          border-radius: 14px;
          border: 1px solid var(--border-color);
          background: rgba(10,12,26,0.45);
          color: var(--text-secondary);
          font-size: 0.92rem;
          transform: translateZ(24px);
        }
        .landing-page.light .visual-caption { background: rgba(255,255,255,0.55); }
        .pulse-dot { width: 10px; height: 10px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 0 0 rgba(212,168,75,0.25); animation: pulse 1.8s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(212,168,75,0.25); } 50% { box-shadow: 0 0 0 10px rgba(212,168,75,0.0); } }

        @media (max-width: 1080px) {
          .hero { grid-template-columns: 1fr; }
          .hero-visual { justify-content: flex-start; }
          .glass-frame { width: min(560px, 100%); }
        }

        /* Blocks section */
        .blocks { margin-top: 4.2rem; }
        .section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; }
        .section-head h2 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: clamp(2rem, 2.8vw, 2.7rem); }
        .section-head p { margin: 0; color: var(--text-secondary); max-width: 62ch; line-height: 1.65; }
        .block-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 1.35rem; }
        .block-card {
          position: relative;
          border-radius: 18px;
          border: 1px solid var(--border-color);
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          padding: 1.05rem 1.05rem 1.1rem;
          overflow: hidden;
          transition: transform 0.18s ease, border-color 0.18s ease, filter 0.18s ease;
        }
        .block-card::before {
          content: '';
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at var(--glow-x) var(--glow-y), rgba(212,168,75,0.18), transparent 62%);
          opacity: 0.9;
          filter: blur(10px);
          transform: translateZ(0);
          pointer-events: none;
        }
        .block-card:hover { transform: translateY(-3px); border-color: var(--border-active); filter: brightness(1.03); }
        .block-top { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
        .block-tag { font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); }
        .block-spark { color: var(--accent); text-shadow: 0 0 18px rgba(212,168,75,0.25); }
        .block-card h3 { margin: 0.65rem 0 0.45rem; font-size: 1.15rem; }
        .block-card p { margin: 0; color: var(--text-secondary); line-height: 1.6; }
        .block-line {
          height: 2px;
          width: 100%;
          margin-top: 1rem;
          background: linear-gradient(90deg, rgba(180,212,255,0.0), rgba(180,212,255,0.35), rgba(212,168,75,0.55), rgba(180,212,255,0.0));
          opacity: 0.6;
        }
        @media (max-width: 980px) { .section-head { flex-direction: column; align-items: flex-start; } .block-grid { grid-template-columns: 1fr; } }

        /* Showcase */
        .showcase { margin-top: 4.2rem; display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 1.5rem; align-items: center; }
        .showcase-card {
          position: relative;
          border-radius: 22px;
          border: 1px solid var(--border-color);
          background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
          overflow: hidden;
          padding: 1.2rem 1.2rem 1.1rem;
          box-shadow: 0 24px 50px rgba(0,0,0,0.35);
        }
        .landing-page.light .showcase-card { box-shadow: 0 18px 40px rgba(10, 18, 40, 0.12); }
        .preview-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
        .preview-pill { font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); }
        .preview-status { font-weight: 800; color: var(--accent); }
        .preview-title { font-family: var(--font-display); font-size: 1.65rem; margin-top: 0.65rem; }
        .preview-body { margin-top: 0.75rem; display: grid; gap: 0.85rem; }
        .preview-paragraph { height: 12px; border-radius: 999px; background: rgba(255,255,255,0.08); }
        .preview-paragraph.short { width: 78%; }
        .shimmer { position: relative; overflow: hidden; }
        .shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          animation: shimmer 2.8s ease-in-out infinite;
        }
        @keyframes shimmer { 0% { transform: translateX(-120%); } 55% { transform: translateX(120%); } 100% { transform: translateX(120%); } }
        .preview-question {
          border-radius: 16px;
          border: 1px solid var(--border-color);
          background: rgba(10,12,26,0.35);
          padding: 0.85rem 0.9rem;
        }
        .landing-page.light .preview-question { background: rgba(255,255,255,0.52); }
        .q-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.16em; color: var(--text-muted); }
        .q-text { margin-top: 0.4rem; font-weight: 650; line-height: 1.4; }
        .q-options { margin-top: 0.65rem; display: grid; gap: 0.45rem; }
        .q-opt {
          display: flex; align-items: center; gap: 0.55rem;
          padding: 0.55rem 0.6rem;
          border-radius: 14px;
          border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.04);
          color: var(--text-secondary);
        }
        .landing-page.light .q-opt { background: rgba(255,255,255,0.58); }
        .q-opt.correct { border-color: rgba(212,168,75,0.45); color: var(--text-primary); }
        .q-dot { width: 10px; height: 10px; border-radius: 999px; background: rgba(180,212,255,0.45); }
        .q-opt.correct .q-dot { background: var(--accent); box-shadow: 0 0 0 6px rgba(212,168,75,0.14); }
        .preview-progress { margin-top: 0.95rem; position: relative; height: 10px; }
        .track { position: absolute; inset: 0; border-radius: 999px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); }
        .fill { position: absolute; left: 0; top: 0; bottom: 0; width: 55%; border-radius: 999px; background: linear-gradient(90deg, rgba(180,212,255,0.85), rgba(212,168,75,0.95)); animation: progressWander 4.2s ease-in-out infinite; }
        @keyframes progressWander { 0%, 100% { width: 52%; } 50% { width: 68%; } }
        .scan {
          position: absolute;
          inset: -30% -30%;
          background: radial-gradient(circle at 20% 30%, rgba(180,212,255,0.10), transparent 60%);
          mix-blend-mode: screen;
          filter: blur(8px);
          animation: scanDrift 10s ease-in-out infinite alternate;
          pointer-events: none;
        }
        @keyframes scanDrift { 0% { transform: translate(-4%, -2%); } 100% { transform: translate(3%, 4%); } }

        .showcase-copy h2 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: clamp(2rem, 2.8vw, 2.7rem); }
        .showcase-copy p { margin: 0.75rem 0 0; color: var(--text-secondary); line-height: 1.7; max-width: 64ch; }
        .bullets { margin-top: 1.2rem; display: grid; gap: 0.75rem; }
        .bullet { border: 1px solid var(--border-color); border-radius: 16px; padding: 0.85rem 0.9rem; background: rgba(255,255,255,0.02); }
        .landing-page.light .bullet { background: rgba(255,255,255,0.52); }
        .bullet-k { font-weight: 800; color: var(--accent); text-transform: lowercase; letter-spacing: 0.02em; }
        .bullet-v { margin-top: 0.25rem; color: var(--text-secondary); line-height: 1.6; }
        .cta-row.tight { margin-top: 1.3rem; }

        @media (max-width: 980px) { .showcase { grid-template-columns: 1fr; } }

        /* Closing */
        .closing { margin-top: 4.2rem; }
        .closing-card {
          display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 1.4rem; align-items: center;
          border-radius: 24px;
          border: 1px solid var(--border-color);
          background: radial-gradient(120% 160% at var(--glow-x) var(--glow-y), rgba(212,168,75,0.16), rgba(255,255,255,0.04) 55%, rgba(10,12,26,0.55) 100%);
          padding: 1.6rem 1.5rem;
          overflow: hidden;
          position: relative;
        }
        .closing-card::before {
          content: '';
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 70% 30%, rgba(180,212,255,0.10), transparent 55%);
          filter: blur(10px);
          opacity: 0.9;
          pointer-events: none;
        }
        .closing-kicker { color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.75rem; }
        .closing-left h2 { margin: 0.75rem 0 0.5rem; font-family: var(--font-display); font-weight: 400; font-size: 2.3rem; }
        .closing-left p { margin: 0; color: var(--text-secondary); line-height: 1.7; }
        .closing-right { display: grid; gap: 0.6rem; justify-items: stretch; }
        .cta.big { width: 100%; padding: 0.95rem 1.05rem; border-radius: 16px; }
        .closing-note { color: var(--text-muted); font-size: 0.95rem; text-align: center; }
        @media (max-width: 980px) { .closing-card { grid-template-columns: 1fr; } .closing-left h2 { font-size: 2.05rem; } }

        @media (prefers-reduced-motion: reduce) {
          .nebula, .glass-sheen, .ring-a, .ring-b, .ring-c, .comet, .scan, .fill, .core-progress .bar { animation: none !important; }
          .nav, .content, [data-reveal] { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
