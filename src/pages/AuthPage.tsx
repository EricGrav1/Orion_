import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';

type AuthMode = 'signin' | 'signup';

function getSafeNextPath(search: string): string {
  const value = new URLSearchParams(search).get('next');
  if (!value) return '/app';
  if (!value.startsWith('/') || value.startsWith('//')) return '/app';
  return value;
}

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useOrionTheme();

  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nextPath = getSafeNextPath(location.search);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        navigate(nextPath, { replace: true });
      } else {
        await signUpWithEmail(email, password, fullName);
        setMessage('Check your email for a confirmation link!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    }
  };

  return (
    <div className={`auth-page ${theme}`}>
      <SpaceScene />

      {/* Navigation */}
      <nav className={`nav ${mounted ? 'mounted' : ''}`}>
        <div className="nav-left">
          <Link to="/" className="logo" aria-label="Orion Home">
            <svg className="logo-icon" viewBox="0 0 32 36" fill="none">
              {/* Meissa - head */}
              <circle cx="16" cy="3" r="2" fill="currentColor" className="star-dot" />
              {/* Betelgeuse - left shoulder (brighter/larger) */}
              <circle cx="8" cy="10" r="3" fill="currentColor" className="star-dot" />
              {/* Bellatrix - right shoulder */}
              <circle cx="24" cy="10" r="2.5" fill="currentColor" className="star-dot" />
              {/* Belt - 3 stars in a row */}
              <circle cx="11" cy="18" r="2" fill="currentColor" className="star-dot" />
              <circle cx="16" cy="18" r="2" fill="currentColor" className="star-dot" />
              <circle cx="21" cy="18" r="2" fill="currentColor" className="star-dot" />
              {/* Saiph - left foot */}
              <circle cx="9" cy="32" r="2.5" fill="currentColor" className="star-dot" />
              {/* Rigel - right foot (brighter/larger) */}
              <circle cx="23" cy="32" r="3" fill="currentColor" className="star-dot" />
            </svg>
            <span className="logo-text">ORION</span>
          </Link>
        </div>

        <div className="nav-center">
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/auth" className="nav-link active">Login</Link>
        </div>

        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>

      {/* Constellation SVG */}
      <svg className="constellation" viewBox="0 0 500 600" fill="none">
        <defs>
          <radialGradient id="betelgeuseGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D4A84B" stopOpacity="1" />
            <stop offset="30%" stopColor="#D4A84B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D4A84B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="20%" stopColor="#E0E7FF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#B4D4FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#B4D4FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="blueStarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#B4D4FF" stopOpacity="1" />
            <stop offset="30%" stopColor="#B4D4FF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#B4D4FF" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Constellation lines */}
        <g className="constellation-lines">
          <line x1="70" y1="80" x2="380" y2="120" className="line" />
          <line x1="70" y1="80" x2="150" y2="280" className="line" />
          <line x1="380" y1="120" x2="300" y2="280" className="line" />
          <line x1="150" y1="280" x2="225" y2="300" className="line" />
          <line x1="225" y1="300" x2="300" y2="280" className="line" />
          <line x1="150" y1="280" x2="100" y2="500" className="line" />
          <line x1="300" y1="280" x2="380" y2="520" className="line" />
        </g>

        {/* Betelgeuse - golden supergiant */}
        <g className="star-group">
          <circle cx="70" cy="80" r="40" fill="url(#betelgeuseGlow)" className="glow-circle" />
          <circle cx="70" cy="80" r="12" fill="#D4A84B" filter="url(#glow)" className="star-core" />
        </g>

        {/* Bellatrix */}
        <g className="star-group">
          <circle cx="380" cy="120" r="30" fill="url(#starGlow)" className="glow-circle" />
          <circle cx="380" cy="120" r="8" fill="#FFFFFF" filter="url(#glow)" className="star-core" />
        </g>

        {/* Orion's Belt */}
        <g className="star-group">
          <circle cx="150" cy="280" r="25" fill="url(#starGlow)" className="glow-circle" />
          <circle cx="150" cy="280" r="7" fill="#FFFFFF" filter="url(#glow)" className="star-core" />
        </g>
        <g className="star-group">
          <circle cx="225" cy="300" r="28" fill="url(#starGlow)" className="glow-circle" />
          <circle cx="225" cy="300" r="8" fill="#FFFFFF" filter="url(#glow)" className="star-core" />
        </g>
        <g className="star-group">
          <circle cx="300" cy="280" r="25" fill="url(#starGlow)" className="glow-circle" />
          <circle cx="300" cy="280" r="7" fill="#FFFFFF" filter="url(#glow)" className="star-core" />
        </g>

        {/* Saiph */}
        <g className="star-group">
          <circle cx="100" cy="500" r="25" fill="url(#blueStarGlow)" className="glow-circle" />
          <circle cx="100" cy="500" r="7" fill="#B4D4FF" filter="url(#glow)" className="star-core" />
        </g>

        {/* Rigel */}
        <g className="star-group">
          <circle cx="380" cy="520" r="30" fill="url(#blueStarGlow)" className="glow-circle" />
          <circle cx="380" cy="520" r="9" fill="#B4D4FF" filter="url(#glow)" className="star-core" />
        </g>
      </svg>

      {/* Main content */}
      <main className={`main-content ${mounted ? 'mounted' : ''}`}>
        {/* Left side - Branding */}
        <section className="brand-section">
          <p className="eyebrow">COURSE CREATION PLATFORM</p>
          <h1 className="headline">
            Chart your path<br />
            through the<br />
            <em>learning cosmos</em>
          </h1>
          <p className="subtext">
            Where exceptional courses are born. AI-powered creation, SCORM exports, and analytics that illuminate your impact.
          </p>
        </section>

        {/* Right side - Auth form */}
        <section className="form-section">
          <div className="form-card">
            <div className="form-header">
              <h2>{mode === 'signin' ? 'Welcome back' : 'Join the cosmos'}</h2>
              <p>{mode === 'signin' ? 'Continue your journey' : 'Start creating today'}</p>
            </div>

            {/* Mode toggle */}
            <div className="mode-toggle">
              <button
                className={`toggle-btn ${mode === 'signin' ? 'active' : ''}`}
                onClick={() => setMode('signin')}
              >
                Sign In
              </button>
              <button
                className={`toggle-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => setMode('signup')}
              >
                Sign Up
              </button>
            </div>

            {/* Google button */}
            <button className="google-btn" onClick={handleGoogleSignIn} type="button">
              <svg viewBox="0 0 24 24" className="google-icon">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <div className="input-group">
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder=" "
                    className="input"
                  />
                  <label htmlFor="fullName">Full Name</label>
                </div>
              )}

              <div className="input-group">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder=" "
                  className="input"
                />
                <label htmlFor="email">Email</label>
              </div>

              <div className="input-group">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder=" "
                  className="input"
                />
                <label htmlFor="password">Password</label>
              </div>

              {error && <div className="error-msg">{error}</div>}
              {message && <div className="success-msg">{message}</div>}

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <span className="loading-dots">
                    <span /><span /><span />
                  </span>
                ) : mode === 'signin' ? (
                  'Enter the Observatory'
                ) : (
                  'Launch Mission'
                )}
              </button>
            </form>

            <p className="form-footer">
              {mode === 'signin' ? (
                <>New explorer? <button type="button" onClick={() => setMode('signup')}>Create account</button></>
              ) : (
                <>Already exploring? <button type="button" onClick={() => setMode('signin')}>Sign in</button></>
              )}
            </p>

            {mode === 'signup' && (
              <p className="trial-note">
                <span className="star-icon">✦</span>
                7 days free · No card required
              </p>
            )}
          </div>
        </section>
      </main>

      {/* Decorative rotating star */}
      <div className="rotating-star">✦</div>

      <style>{`
        .auth-page {
          /* Dark theme (default) */
          --bg-primary: #0B0D1A;
          --bg-secondary: rgba(15, 18, 35, 0.85);
          --bg-card: rgba(20, 24, 45, 0.75);
          --border-color: rgba(255, 255, 255, 0.08);
          --border-active: rgba(255, 255, 255, 0.25);
          --text-primary: #FAFAFA;
          --text-secondary: rgba(255, 255, 255, 0.6);
          --text-muted: rgba(255, 255, 255, 0.4);
          --accent: #D4A84B;
          --accent-hover: #C49A3D;
          --star-blue: #B4D4FF;
          --input-bg: transparent;
          --google-bg: #FFFFFF;
          --google-text: #1F2937;

          --font-display: 'Cormorant Garamond', Georgia, serif;
          --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;

          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          position: relative;
          overflow-x: hidden;
          font-family: var(--font-body);
        }

        /* Light theme - bright space with sun */
        .auth-page.light {
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
          --input-bg: rgba(0, 0, 0, 0.03);
          --google-bg: #FFFFFF;
          --google-text: #1F2937;
          background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%);
        }

        .auth-page.light .nebula {
          opacity: 0.2;
          filter: saturate(0.5) brightness(1.3);
        }

        .auth-page.light .star {
          background: rgba(0, 0, 0, 0.3);
          opacity: 0.4 !important;
        }

        .auth-page.light .star.bright {
          background: var(--accent);
          opacity: 0.6 !important;
        }

        /* Sun element */
        .sun {
          position: fixed;
          top: -150px;
          right: 10%;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 200, 100, 0.1) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
          opacity: 0;
          transition: opacity 0.8s ease, transform 0.8s ease;
        }

        .auth-page.light .sun {
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

        .auth-page.light .sun-rays {
          opacity: 0.5;
          background:
            conic-gradient(
              from 0deg,
              transparent 0deg,
              rgba(255, 230, 180, 0.15) 5deg,
              transparent 10deg,
              transparent 20deg,
              rgba(255, 230, 180, 0.1) 25deg,
              transparent 30deg,
              transparent 45deg,
              rgba(255, 230, 180, 0.12) 50deg,
              transparent 55deg,
              transparent 70deg,
              rgba(255, 230, 180, 0.08) 75deg,
              transparent 80deg,
              transparent 90deg,
              rgba(255, 230, 180, 0.15) 95deg,
              transparent 100deg,
              transparent 115deg,
              rgba(255, 230, 180, 0.1) 120deg,
              transparent 125deg,
              transparent 140deg,
              rgba(255, 230, 180, 0.12) 145deg,
              transparent 150deg,
              transparent 165deg,
              rgba(255, 230, 180, 0.08) 170deg,
              transparent 175deg,
              transparent 180deg,
              rgba(255, 230, 180, 0.15) 185deg,
              transparent 190deg,
              transparent 205deg,
              rgba(255, 230, 180, 0.1) 210deg,
              transparent 215deg,
              transparent 230deg,
              rgba(255, 230, 180, 0.12) 235deg,
              transparent 240deg,
              transparent 255deg,
              rgba(255, 230, 180, 0.08) 260deg,
              transparent 265deg,
              transparent 280deg,
              rgba(255, 230, 180, 0.15) 285deg,
              transparent 290deg,
              transparent 305deg,
              rgba(255, 230, 180, 0.1) 310deg,
              transparent 315deg,
              transparent 330deg,
              rgba(255, 230, 180, 0.12) 335deg,
              transparent 340deg,
              transparent 355deg,
              rgba(255, 230, 180, 0.08) 360deg
            );
          animation: sunRaysRotate 120s linear infinite;
        }

        @keyframes sunRaysRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .auth-page.light .constellation {
          opacity: 0.5;
        }

        .auth-page.light .constellation-lines .line {
          stroke: rgba(0, 0, 0, 0.15);
        }

        /* Star field */
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

        @keyframes twinkleBright {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }

        /* Nebula background - dramatic deep space */
        .nebula {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            /* Deep crimson nebula clouds on edges */
            radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%),
            radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%),
            /* Electric blue central glow */
            radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%),
            /* Cyan highlights */
            radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%),
            /* Purple accents */
            radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 85% 25%, rgba(100, 50, 150, 0.2) 0%, transparent 50%),
            /* Additional red/orange cosmic gas */
            radial-gradient(ellipse 90% 60% at 15% 20%, rgba(200, 80, 60, 0.2) 0%, transparent 45%),
            radial-gradient(ellipse 70% 50% at 90% 80%, rgba(180, 60, 80, 0.25) 0%, transparent 50%),
            /* Dark void regions for contrast */
            radial-gradient(ellipse 50% 50% at 30% 30%, rgba(0, 0, 20, 0.4) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 75% 70%, rgba(0, 0, 30, 0.3) 0%, transparent 60%);
          pointer-events: none;
          animation: nebulaDrift 60s ease-in-out infinite alternate;
        }

        @keyframes nebulaDrift {
          0% {
            transform: scale(1) translate(0, 0);
            filter: hue-rotate(0deg);
          }
          50% {
            transform: scale(1.05) translate(-1%, 1%);
            filter: hue-rotate(5deg);
          }
          100% {
            transform: scale(1.02) translate(1%, -0.5%);
            filter: hue-rotate(-5deg);
          }
        }

        /* Navigation */
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

        .nav-left {
          flex: 1;
        }

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

        /* Constellation */
        .constellation {
          position: fixed;
          left: 5%;
          top: 50%;
          transform: translateY(-50%);
          width: 45%;
          max-width: 550px;
          height: auto;
          z-index: 1;
          pointer-events: none;
        }

        .constellation-lines .line {
          stroke: rgba(255, 255, 255, 0.3);
          stroke-width: 1.5;
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: drawLine 2.5s ease-out forwards;
        }

        .constellation-lines .line:nth-child(1) { animation-delay: 0.2s; }
        .constellation-lines .line:nth-child(2) { animation-delay: 0.4s; }
        .constellation-lines .line:nth-child(3) { animation-delay: 0.6s; }
        .constellation-lines .line:nth-child(4) { animation-delay: 0.8s; }
        .constellation-lines .line:nth-child(5) { animation-delay: 1s; }
        .constellation-lines .line:nth-child(6) { animation-delay: 1.2s; }
        .constellation-lines .line:nth-child(7) { animation-delay: 1.4s; }

        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }

        .glow-circle {
          animation: pulseGlow 4s ease-in-out infinite;
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.7; transform-origin: center; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        .star-core {
          animation: pulseStar 3s ease-in-out infinite;
        }

        @keyframes pulseStar {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
        }

        /* Main content */
        .main-content {
          position: relative;
          z-index: 10;
          display: flex;
          min-height: 100vh;
          padding: 6rem 2.5rem 2rem;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s;
        }

        .main-content.mounted {
          opacity: 1;
          transform: translateY(0);
        }

        /* Brand section */
        .brand-section {
          flex: 1;
          display: none;
          flex-direction: column;
          justify-content: center;
          padding: 2rem 4rem;
          max-width: 550px;
        }

        @media (min-width: 1024px) {
          .brand-section { display: flex; }
        }

        .eyebrow {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.25em;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }

        .headline {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 4.5vw, 3.75rem);
          font-weight: 300;
          line-height: 1.15;
          margin-bottom: 1.75rem;
          color: var(--text-primary);
        }

        .headline em {
          font-style: italic;
          color: var(--accent);
        }

        .subtext {
          font-size: 1rem;
          line-height: 1.75;
          color: var(--text-secondary);
          max-width: 380px;
        }

        /* Form section */
        .form-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .form-card {
          width: 100%;
          max-width: 400px;
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 2.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-header h2 {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 400;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }

        .form-header p {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        /* Mode toggle */
        .mode-toggle {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .toggle-btn {
          flex: 1;
          padding: 0.875rem 1rem;
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .toggle-btn:hover {
          border-color: var(--border-active);
          color: var(--text-primary);
        }

        .toggle-btn.active {
          background: var(--bg-secondary);
          border-color: var(--border-active);
          color: var(--text-primary);
        }

        /* Google button */
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.9rem 1rem;
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--google-text);
          background: var(--google-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .google-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .google-icon {
          width: 18px;
          height: 18px;
        }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          margin: 1.5rem 0;
          gap: 1rem;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-color);
        }

        .divider span {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        /* Form inputs */
        form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-group {
          position: relative;
        }

        .input {
          width: 100%;
          padding: 1rem 0 0.75rem;
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--text-primary);
          background: var(--input-bg);
          border: none;
          border-bottom: 1px solid var(--border-color);
          border-radius: 0;
          outline: none;
          transition: border-color 0.3s ease;
        }

        .input:focus {
          border-color: var(--accent);
        }

        .input-group label {
          position: absolute;
          left: 0;
          top: 1rem;
          font-size: 0.9rem;
          color: var(--text-muted);
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .input:focus + label,
        .input:not(:placeholder-shown) + label {
          top: -0.5rem;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
          color: var(--accent);
        }

        /* Messages */
        .error-msg,
        .success-msg {
          font-size: 0.8rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
        }

        .error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #FCA5A5;
        }

        .success-msg {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #86EFAC;
        }

        /* Submit button */
        .submit-btn {
          width: 100%;
          padding: 1rem;
          margin-top: 0.5rem;
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 500;
          color: white;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(232, 146, 124, 0.35);
        }

        .submit-btn:active {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 4px;
        }

        .loading-dots span {
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          animation: loadingDot 1.2s ease-in-out infinite;
        }

        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes loadingDot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }

        /* Form footer */
        .form-footer {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .form-footer button {
          background: none;
          border: none;
          color: var(--accent);
          font-weight: 500;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .form-footer button:hover {
          color: var(--accent-hover);
        }

        .trial-note {
          text-align: center;
          margin-top: 1rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .star-icon {
          color: var(--accent);
          animation: rotateStar 10s linear infinite;
        }

        /* Rotating star */
        .rotating-star {
          position: fixed;
          bottom: 2rem;
          right: 2.5rem;
          font-size: 2rem;
          color: var(--text-muted);
          animation: rotateStar 10s linear infinite;
          z-index: 10;
          opacity: 0.6;
        }

        @keyframes rotateStar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Mobile adjustments */
        @media (max-width: 1023px) {
          .constellation {
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 85%;
            opacity: 0.3;
          }

          .main-content {
            padding: 5rem 1rem 2rem;
          }

          .form-card {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
