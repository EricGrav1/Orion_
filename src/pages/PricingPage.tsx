import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { billingService, type CheckoutTier } from '../services/billing.service';

type PlanType = 'teams' | 'personal';

type Plan = {
  brand: string;
  tier: string;
  currencySymbol: string;
  amount: string;
  currencyCode: string;
  billingPeriod: string;
  cta: string;
  featuresTitle: string;
  features: string[];
  isFeatured?: boolean;
  demoTitle?: string;
};

type PricingModel = Record<PlanType, { header: { title: string; subtitle: string }; plans: [Plan, Plan]; info: { title: string; body: string }[] }>;

export function PricingPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useOrionTheme();
  const [planType, setPlanType] = useState<PlanType>('teams');
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [checkoutTier, setCheckoutTier] = useState<CheckoutTier | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const dashboardHref = isAuthenticated ? '/app' : '/auth';
  const dashboardLabel = isAuthenticated ? 'Dashboard' : 'Login';

  const pricing = useMemo((): PricingModel => {
    return {
      teams: {
        header: {
          title: 'Pricing that scales with your crew.',
          subtitle: 'Early access plans for teams shipping modern learning. Switch anytime.',
        },
        plans: [
          {
            brand: 'ORION',
            tier: 'Team',
            currencySymbol: '$',
            amount: '49',
            currencyCode: 'USD',
            billingPeriod: 'per seat · month',
            cta: 'Start team trial',
            featuresTitle: 'Includes',
            features: [
              'Unlimited courses and lessons',
              'Block-based editor with reorder, duplicate, and hide',
              'Review links for stakeholders',
              'Basic analytics (coming soon)',
            ],
          },
          {
            brand: 'ORION',
            tier: 'Pro',
            currencySymbol: '$',
            amount: '99',
            currencyCode: 'USD',
            billingPeriod: 'per seat · month',
            cta: 'Start pro trial',
            featuresTitle: 'Everything in Team, plus',
            features: [
              'AI outline & draft assist',
              'Reusable templates and block presets',
              'Versioned review comments (coming soon)',
              'SCORM/xAPI export (coming soon)',
              'Priority onboarding',
            ],
            isFeatured: true,
            demoTitle: 'See a 60‑second tour',
          },
        ],
        info: [
          {
            title: 'Cancel anytime',
            body: 'No contracts for early access. Upgrade, downgrade, or pause when your schedule changes.',
          },
          {
            title: 'Security-first foundation',
            body: 'Auth and data live on Supabase with best-practice policies. The space theme is just for fun.',
          },
          {
            title: 'Education discounts',
            body: 'Teaching a cohort or running enablement? Reach out for pilot pricing and rollout support.',
          },
        ],
      },
      personal: {
        header: {
          title: 'Solo pricing for high-craft creators.',
          subtitle: 'For independent builders and small projects. All the polish, none of the overhead.',
        },
        plans: [
          {
            brand: 'ORION',
            tier: 'Solo',
            currencySymbol: '$',
            amount: '19',
            currencyCode: 'USD',
            billingPeriod: 'per month',
            cta: 'Start solo trial',
            featuresTitle: 'Includes',
            features: [
              'Unlimited personal courses',
              'Block library and learner playback',
              'Shareable review link',
              'Email support',
            ],
          },
          {
            brand: 'ORION',
            tier: 'Creator',
            currencySymbol: '$',
            amount: '39',
            currencyCode: 'USD',
            billingPeriod: 'per month',
            cta: 'Start creator trial',
            featuresTitle: 'Everything in Solo, plus',
            features: [
              'AI outline & draft assist',
              'Templates and style presets',
              'Export formats (coming soon)',
              'Priority support',
              'Early access to new blocks',
            ],
            isFeatured: true,
            demoTitle: 'Preview the workflow',
          },
        ],
        info: [
          {
            title: 'Made for momentum',
            body: 'Start with a template or build blank. Orion stays out of your way when you’re in flow.',
          },
          {
            title: 'Own the outcome',
            body: 'AI helps you begin—not finish. You decide pacing, tone, and structure.',
          },
          {
            title: 'Ship-ready playback',
            body: 'Preview as a learner with progress and quizzes, then share a clean review link.',
          },
        ],
      },
    };
  }, []);

  const current = pricing[planType];
  const [standard, featured] = current.plans;

  const startCheckout = async (plan: Plan) => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    setCheckoutError(null);

    const tierByName: Record<string, CheckoutTier> = {
      Team: 'team',
      Pro: 'pro',
      Solo: 'solo',
      Creator: 'creator',
    };

    const tier = tierByName[plan.tier];
    if (!tier) {
      setCheckoutError('Could not resolve the selected billing tier.');
      return;
    }

    setCheckoutTier(tier);
    try {
      const url = await billingService.createCheckoutUrl({ tier });
      window.location.assign(url);
    } catch (err: unknown) {
      setCheckoutTier(null);
      setCheckoutError(err instanceof Error ? err.message : 'Failed to start checkout');
    }
  };

  const openBillingPortal = async () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    setCheckoutError(null);
    setIsPortalLoading(true);
    try {
      const url = await billingService.createPortalUrl();
      window.location.assign(url);
    } catch (err: unknown) {
      setIsPortalLoading(false);
      setCheckoutError(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  return (
    <div className={`pricing-page ${theme}`}>
      <SpaceScene />

      {/* Decorative crosses */}
      <div className="deco-cross top-left">+</div>
      <div className="deco-cross top-right">+</div>
      <div className="deco-cross bottom-left">+</div>
      <div className="deco-cross bottom-right">+</div>

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
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/pricing" className="nav-link active">Pricing</Link>
          <Link to={dashboardHref} className="nav-link">{dashboardLabel}</Link>
          {isAuthenticated && <Link to="/account" className="nav-link">Account</Link>}
        </div>

        <div className="nav-right">
          {isAuthenticated && <span className="user-pill" title={user?.email || ''}>{user?.email}</span>}
          {isAuthenticated && (
            <button className="signout-btn" onClick={handleSignOut} type="button">
              Sign out
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>

      {/* Main content */}
      <main className={`main-content ${mounted ? 'mounted' : ''}`}>
        <div className="content-container">
          {/* Header */}
          <header className="pricing-header">
            <h1 className="page-title">{current.header.title}</h1>
            <p className="page-subtitle">{current.header.subtitle}</p>
            {isAuthenticated && (
              <div className="billing-row">
                <button className="manage-billing" onClick={openBillingPortal} disabled={isPortalLoading || checkoutTier !== null}>
                  {isPortalLoading ? 'Opening billing...' : 'Manage billing'}
                </button>
              </div>
            )}
          </header>

          {checkoutError && (
            <div className="checkout-error" role="alert">
              {checkoutError}
            </div>
          )}

          {/* Plan type toggle */}
          <div className="plan-toggle">
            <button
              className={`toggle-option ${planType === 'teams' ? 'active' : ''}`}
              onClick={() => setPlanType('teams')}
              aria-pressed={planType === 'teams'}
            >
              Teams
            </button>
            <button
              className={`toggle-option ${planType === 'personal' ? 'active' : ''}`}
              onClick={() => setPlanType('personal')}
              aria-pressed={planType === 'personal'}
            >
              Personal
            </button>
          </div>

          {/* Pricing cards - two side by side */}
          <div className="pricing-grid">
            {/* Standard Plan */}
            <div className="pricing-card">
              <div className="card-top">
                <h3 className="plan-name">
                  <span className="plan-brand">{standard.brand} </span>
                  <span className="plan-tier">{standard.tier}</span>
                </h3>
              </div>

              <div className="price-box">
                <div className="price-display">
                  <span className="currency">{standard.currencySymbol}</span>
                  <span className="amount">{standard.amount}</span>
                  <div className="price-meta">
                    <span className="currency-code">{standard.currencyCode}</span>
                    <span className="billing-period">{standard.billingPeriod}</span>
                  </div>
                </div>
                <button className="buy-button" onClick={() => startCheckout(standard)} disabled={checkoutTier !== null}>
                  {checkoutTier ? 'Redirecting...' : standard.cta}
                </button>
              </div>

              <div className="features-highlight">
                <h4 className="features-title">{standard.featuresTitle}</h4>
                <ul className="features-list">
                  {standard.features.map((feature) => (
                    <li key={feature}><span className="check-icon">✓</span><span>{feature}</span></li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Featured Plan (AI/Pro) */}
            <div className="pricing-card featured">
              <div className="card-top">
                <h3 className="plan-name featured-name">
                  <span className="plan-brand">{featured.brand} </span>
                  <span className="plan-tier">{featured.tier}</span>
                </h3>
              </div>

              <div className="price-box">
                <div className="price-display">
                  <span className="currency">{featured.currencySymbol}</span>
                  <span className="amount">{featured.amount}</span>
                  <div className="price-meta">
                    <span className="currency-code">{featured.currencyCode}</span>
                    <span className="billing-period">{featured.billingPeriod}</span>
                  </div>
                </div>
                <button className="buy-button featured-button" onClick={() => startCheckout(featured)} disabled={checkoutTier !== null}>
                  {checkoutTier ? 'Redirecting...' : featured.cta}
                </button>
              </div>

              <div className="features-highlight">
                <h4 className="features-title">{featured.featuresTitle}</h4>
                <ul className="features-list">
                  {featured.features.map((feature) => (
                    <li key={feature}><span className="check-icon">✓</span><span>{feature}</span></li>
                  ))}
                </ul>
              </div>

              {/* Demo/Video section */}
              <div className="demo-section">
                <div className="demo-header">
                  <span className="demo-icon">✦</span>
                  <span className="demo-title">{featured.demoTitle || 'Preview'}</span>
                </div>
                <div
                  className="demo-preview"
                  onClick={() => (isAuthenticated ? navigate('/app') : navigate('/auth'))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      isAuthenticated ? navigate('/app') : navigate('/auth');
                    }
                  }}
                >
                  <div className="play-button">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional info section */}
          <section className="additional-section">
            <div className="info-cards">
              {current.info.map((info) => (
                <div key={info.title} className="info-card">
                  <h4>{info.title}</h4>
                  <p>{info.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .pricing-page {
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
          --accent-gradient: linear-gradient(135deg, #D4A84B 0%, #8B5CF6 50%, #3B82F6 100%);
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

        .pricing-page.light {
          --bg-primary: #F8FAFC;
          --bg-secondary: rgba(255, 255, 255, 0.9);
          --bg-card: rgba(255, 255, 255, 0.95);
          --bg-card-solid: #FFFFFF;
          --border-color: rgba(0, 0, 0, 0.06);
          --border-active: rgba(0, 0, 0, 0.15);
          --text-primary: #1A1A2E;
          --text-secondary: rgba(26, 26, 46, 0.7);
          --text-muted: rgba(26, 26, 46, 0.4);
          --accent: #B8942F;
          --accent-hover: #A8841F;
          background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%);
        }

        .pricing-page.light .nebula {
          opacity: 0.15;
          filter: saturate(0.4) brightness(1.4);
        }

        .pricing-page.light .star {
          background: rgba(0, 0, 0, 0.2);
          opacity: 0.3 !important;
        }

        .pricing-page.light .star.bright {
          background: var(--accent);
          opacity: 0.5 !important;
        }

        .pricing-page.light .deco-cross {
          color: var(--accent);
          opacity: 0.3;
        }

        /* Decorative crosses */
        .deco-cross {
          position: fixed;
          font-size: 1.5rem;
          color: var(--accent);
          opacity: 0.4;
          z-index: 1;
          font-weight: 300;
        }

        .deco-cross.top-left { top: 15%; left: 5%; }
        .deco-cross.top-right { top: 20%; right: 8%; }
        .deco-cross.bottom-left { bottom: 25%; left: 3%; }
        .deco-cross.bottom-right { bottom: 15%; right: 5%; }

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

        .pricing-page.light .sun {
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
        }

        .pricing-page.light .sun-rays {
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

        .user-pill {
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding: 0.35rem 0.6rem;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 0.78rem;
        }
        .signout-btn {
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          border-radius: 999px;
          padding: 0.38rem 0.72rem;
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 650;
          transition: all 0.2s ease;
        }
        .signout-btn:hover { color: var(--text-primary); border-color: var(--border-active); }

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
          .user-pill { max-width: 140px; }
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
          max-width: 1100px;
          margin: 0 auto;
        }

        .pricing-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .billing-row { margin-top: 1.1rem; display: flex; justify-content: center; }
        .manage-billing {
          padding: 0.65rem 1rem;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
          cursor: pointer;
          font-weight: 650;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }
        .manage-billing:hover { transform: translateY(-1px); border-color: var(--border-active); background: rgba(255,255,255,0.06); }
        .manage-billing:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .checkout-error {
          max-width: 820px;
          margin: 0 auto 1.25rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 190, 190, 0.25);
          background: rgba(255, 190, 190, 0.08);
          padding: 0.9rem 1rem;
          color: rgba(255,255,255,0.9);
          line-height: 1.55;
          font-weight: 650;
        }
        .pricing-page.light .checkout-error {
          color: rgba(26, 26, 46, 0.85);
          border-color: rgba(180, 40, 60, 0.25);
          background: rgba(180, 40, 60, 0.08);
        }

        .page-title {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 300;
          line-height: 1.2;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .page-subtitle {
          font-size: 1.125rem;
          line-height: 1.75;
          color: var(--text-secondary);
          max-width: 500px;
          margin: 0 auto;
        }

        /* Plan toggle */
        .plan-toggle {
          display: flex;
          justify-content: center;
          margin-bottom: 3rem;
        }

        .toggle-option {
          padding: 0.875rem 2rem;
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .toggle-option:first-child {
          border-radius: 50px 0 0 50px;
          border-right: none;
        }

        .toggle-option:last-child {
          border-radius: 0 50px 50px 0;
        }

        .toggle-option:hover {
          color: var(--text-primary);
        }

        .toggle-option.active {
          background: var(--bg-card-solid);
          color: var(--text-primary);
          border-color: var(--border-active);
        }

        /* Pricing grid - two cards side by side */
        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 4rem;
        }

        @media (max-width: 900px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }
        }

        .pricing-card {
          background: var(--bg-card-solid);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 2rem;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
        }

        .pricing-card.featured {
          position: relative;
          border: none;
        }

        .pricing-card.featured::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          padding: 2px;
          background: var(--accent-gradient);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .card-top {
          margin-bottom: 1.5rem;
        }

        .plan-name {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 400;
          color: var(--text-primary);
        }

        .plan-brand {
          color: var(--text-secondary);
        }

        .plan-tier {
          font-weight: 500;
        }

        .featured-name .plan-tier {
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .price-box {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .price-display {
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }

        .currency {
          font-size: 1.5rem;
          font-weight: 500;
          color: var(--text-primary);
          align-self: flex-start;
          margin-top: 0.5rem;
        }

        .amount {
          font-family: var(--font-display);
          font-size: 3.5rem;
          font-weight: 300;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .price-meta {
          display: flex;
          flex-direction: column;
          margin-left: 0.5rem;
        }

        .currency-code {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .billing-period {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .buy-button {
          padding: 0.875rem 2rem;
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
          background: transparent;
          border: 1px solid var(--border-active);
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 120px;
        }

        .buy-button:hover {
          background: var(--bg-card);
          border-color: var(--text-primary);
        }

        .featured-button {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .featured-button:hover {
          background: var(--accent-hover);
          border-color: var(--accent-hover);
        }

        .features-highlight {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .pricing-card.featured .features-highlight {
          border-left: 3px solid;
          border-image: var(--accent-gradient) 1;
        }

        .features-title {
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .features-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.5rem 0;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .check-icon {
          color: var(--accent);
          font-weight: bold;
          flex-shrink: 0;
        }

        .demo-section {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }

        .demo-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .demo-icon {
          color: var(--accent);
        }

        .demo-title {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .demo-preview {
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(20, 25, 40, 0.9) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .demo-preview:hover {
          background: linear-gradient(135deg, rgba(40, 50, 70, 0.8) 0%, rgba(30, 35, 50, 0.9) 100%);
        }

        .play-button {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .play-button:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.1);
        }

        .play-button svg {
          width: 24px;
          height: 24px;
          color: white;
          margin-left: 4px;
        }

        /* Additional section */
        .additional-section {
          margin-top: 4rem;
        }

        .info-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .info-card {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .info-card h4 {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
          color: var(--text-primary);
        }

        .info-card p {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 6rem 1.5rem 3rem;
          }

          .price-box {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .buy-button {
            width: 100%;
          }

          .deco-cross {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
