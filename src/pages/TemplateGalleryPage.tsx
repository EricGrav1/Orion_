import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { OrionClock } from '../components/space/OrionClock';
import { SpaceScene } from '../components/space/SpaceScene';
import { courseService } from '../services/course.service';
import { blockService } from '../services/block.service';
import { buildTemplateSettings, courseTemplates, instantiateTemplateBlocks } from '../utils/courseTemplates';
import type { CourseTemplate } from '../utils/courseTemplates';
import type { CourseFormat } from '../types/courseTheme.types';

type TemplateFilter = 'all' | CourseFormat;

function formatLabel(value: TemplateFilter): string {
  if (value === 'microlearning') return 'Microlearning';
  if (value === 'course') return 'Full Course';
  return 'All';
}

export function TemplateGalleryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useOrionTheme();
  const [filter, setFilter] = useState<TemplateFilter>('all');
  const [query, setQuery] = useState('');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return courseTemplates
      .filter((template) => {
        if (filter !== 'all' && template.format !== filter) return false;
        if (!normalizedQuery) return true;
        const haystack = `${template.title} ${template.description} ${template.category}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (left.featured === right.featured) return 0;
        return left.featured ? -1 : 1;
      });
  }, [filter, query]);

  const handleCreate = async (template: CourseTemplate) => {
    setError(null);
    setCreatingId(template.id);
    try {
      const newCourse = await courseService.createCourse({
        title: template.title,
        description: template.description,
        settings: buildTemplateSettings(template),
      });
      const blocks = instantiateTemplateBlocks(newCourse.id, template);
      if (blocks.length > 0) {
        await blockService.createBlocks(blocks);
      }
      navigate(`/course/${newCourse.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create course from template');
      setCreatingId(null);
    }
  };

  return (
    <div className={`templates-page ${theme}`}>
      <SpaceScene />

      <nav className="nav">
        <div className="nav-left">
          <Link to="/app" className="logo" aria-label="Orion Home">
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
          <Link to="/courses" className="nav-link">Courses</Link>
          <span className="nav-link active">Templates</span>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
        </div>
        <div className="nav-right">
          <span className="user-email" title={user?.email || ''}>{user?.email}</span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>

      <main className="content">
        <header className="hero">
          <div className="hero-copy">
            <div className="kicker">
              <span className="k-dot" />
              Start with structure, then customize
            </div>
            <h1>Template Gallery</h1>
            <p>
              Choose a full course or microlearning template. Orion creates the blocks, theme, and pacing so you can focus on content.
            </p>
          </div>
          <div className="hero-controls">
            <div className="filters" role="tablist" aria-label="Template filters">
              {(['all', 'course', 'microlearning'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  className={`pill ${filter === value ? 'active' : ''}`}
                  aria-selected={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {formatLabel(value)}
                </button>
              ))}
            </div>
            <label className="search">
              <span className="sr-only">Search templates</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates..."
              />
            </label>
          </div>
        </header>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        <section className="grid" aria-label="Templates">
          {visibleTemplates.map((template) => {
            const busy = creatingId === template.id;
            return (
              <article
                key={template.id}
                className="card"
                style={{
                  ['--t-brand' as never]: template.theme.brandColor,
                  ['--t-accent' as never]: template.theme.accentColor,
                }}
              >
                <div className="card-top">
                  <div className="meta">
                    {template.featured && <span className="badge featured">Gold</span>}
                    <span className="badge">{template.category}</span>
                    <span className="tag">{template.format === 'microlearning' ? 'Microlearning' : 'Course'}</span>
                  </div>
                  <div className="title">{template.title}</div>
                  <div className="desc">{template.description}</div>
                </div>

                <div className="preview" aria-hidden="true">
                  <div className="preview-head">Includes</div>
                  <div className="preview-list">
                    {template.blocks.slice(0, 4).map((block, index) => (
                      <div key={`${template.id}-${index}`} className="preview-item">
                        <span className="dot" />
                        <span className="text">{String(block.type).toUpperCase()}</span>
                      </div>
                    ))}
                    {template.blocks.length > 4 && (
                      <div className="preview-item more">
                        <span className="dot faint" />
                        <span className="text">+{template.blocks.length - 4} more blocks</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="actions">
                  <button
                    type="button"
                    className="use"
                    onClick={() => handleCreate(template)}
                    disabled={creatingId !== null}
                  >
                    {busy ? 'Creating…' : 'Use template'}
                  </button>
                  <Link className="secondary" to="/courses">
                    Back to courses
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <style>{`
        .templates-page {
          --bg: #0B0D1A;
          --card: rgba(20, 24, 45, 0.72);
          --card2: rgba(20, 24, 45, 0.82);
          --border: rgba(255, 255, 255, 0.08);
          --text: #FAFAFA;
          --muted: rgba(255, 255, 255, 0.66);
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .nav {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: rgba(10, 12, 24, 0.62);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(14px);
        }
        .nav-left { display: flex; align-items: center; gap: 12px; }
        .logo { display: inline-flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; }
        .logo-icon { width: 26px; height: 26px; color: rgba(255,255,255,0.9); }
        .logo-text { font-weight: 900; letter-spacing: 0.12em; font-size: 0.9rem; }
        .nav-center { display: flex; align-items: center; gap: 14px; }
        .nav-link { color: rgba(255,255,255,0.72); text-decoration: none; font-weight: 700; font-size: 0.92rem; }
        .nav-link.active { color: rgba(255,255,255,0.95); }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .user-email { color: rgba(255,255,255,0.58); font-size: 0.85rem; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .content { position: relative; z-index: 1; max-width: 1160px; margin: 0 auto; padding: 22px 18px 56px; }
        .hero {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          box-shadow: 0 20px 70px rgba(0,0,0,0.35);
          padding: 18px 18px 16px;
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 16px;
          align-items: end;
          overflow: hidden;
          position: relative;
        }
        .hero:before {
          content: '';
          position: absolute;
          inset: -40% -20% auto -20%;
          height: 220px;
          background: radial-gradient(circle at 30% 40%, rgba(122,201,255,0.22), transparent 55%),
                      radial-gradient(circle at 70% 60%, rgba(212,168,75,0.22), transparent 55%);
          filter: blur(2px);
          opacity: 0.9;
          pointer-events: none;
        }
        .hero-copy { position: relative; }
        .kicker { display: inline-flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.66); font-size: 0.82rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .k-dot { width: 10px; height: 10px; border-radius: 999px; background: rgba(212,168,75,0.9); box-shadow: 0 0 0 6px rgba(212,168,75,0.14); }
        .hero h1 { margin: 10px 0 8px; font-size: 2.1rem; letter-spacing: -0.03em; line-height: 1.05; }
        .hero p { margin: 0; color: rgba(255,255,255,0.72); line-height: 1.55; max-width: 56ch; }

        .hero-controls { position: relative; display: grid; gap: 10px; justify-items: end; }
        .filters { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .pill {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.78);
          border-radius: 999px;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 800;
          font-size: 0.86rem;
          transition: transform 0.15s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .pill:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.2); }
        .pill.active {
          background: color-mix(in srgb, rgba(122,201,255,0.3) 50%, rgba(255,255,255,0.02));
          border-color: rgba(122,201,255,0.55);
          color: rgba(255,255,255,0.92);
        }
        .search input {
          width: 320px;
          max-width: 100%;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          background: rgba(0,0,0,0.22);
          color: rgba(255,255,255,0.9);
          padding: 10px 12px;
          font: inherit;
          outline: none;
        }
        .search input:focus { border-color: rgba(212,168,75,0.55); box-shadow: 0 0 0 4px rgba(212,168,75,0.14); }

        .error {
          margin-top: 14px;
          border: 1px solid rgba(255, 190, 190, 0.25);
          background: rgba(255, 190, 190, 0.08);
          color: rgba(255,255,255,0.9);
          border-radius: 14px;
          padding: 12px 14px;
        }

        .grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .card {
          --t-brand: #D4A84B;
          --t-accent: #264B8C;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          background: radial-gradient(circle at 15% 15%, color-mix(in srgb, var(--t-accent) 28%, rgba(255,255,255,0.06)), rgba(255,255,255,0.02)),
                      radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--t-brand) 26%, rgba(255,255,255,0.04)), transparent 60%),
                      rgba(255,255,255,0.02);
          padding: 14px 14px 12px;
          display: grid;
          gap: 12px;
          box-shadow: 0 18px 60px rgba(0,0,0,0.35);
          transition: transform 0.16s ease, border-color 0.2s ease;
        }
        .card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.18); }

        .meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .badge {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.82);
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 900;
          font-size: 0.78rem;
          letter-spacing: 0.02em;
        }
        .badge.featured {
          border-color: color-mix(in srgb, var(--t-brand) 60%, white);
          background: color-mix(in srgb, var(--t-brand) 24%, rgba(255,255,255,0.04));
          color: #fff;
        }
        .tag {
          color: rgba(255,255,255,0.65);
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .title { font-weight: 900; font-size: 1.1rem; letter-spacing: -0.02em; line-height: 1.15; }
        .desc { color: rgba(255,255,255,0.72); line-height: 1.5; font-size: 0.92rem; }

        .preview {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          background: rgba(0,0,0,0.18);
          padding: 10px 10px 8px;
          display: grid;
          gap: 8px;
        }
        .preview-head { color: rgba(255,255,255,0.62); font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 900; }
        .preview-list { display: grid; gap: 6px; }
        .preview-item { display: flex; gap: 8px; align-items: center; color: rgba(255,255,255,0.78); font-weight: 800; font-size: 0.84rem; }
        .preview-item.more { color: rgba(255,255,255,0.6); }
        .dot { width: 10px; height: 10px; border-radius: 999px; background: color-mix(in srgb, var(--t-accent) 70%, white); box-shadow: 0 0 0 6px color-mix(in srgb, var(--t-accent) 18%, transparent); }
        .dot.faint { opacity: 0.7; box-shadow: none; }
        .text { letter-spacing: 0.06em; }

        .actions { display: grid; grid-template-columns: 1fr; gap: 8px; }
        .use {
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 14px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--t-brand) 85%, white), color-mix(in srgb, var(--t-accent) 50%, white));
          color: #0B0D1A;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 900;
          letter-spacing: 0.02em;
          transition: transform 0.15s ease;
        }
        .use:disabled { opacity: 0.65; cursor: not-allowed; }
        .use:not(:disabled):hover { transform: translateY(-1px); }
        .secondary {
          text-align: center;
          color: rgba(255,255,255,0.72);
          text-decoration: none;
          font-weight: 800;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.02);
        }
        .secondary:hover { border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.86); }

        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }

        @media (max-width: 1040px) {
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .hero { grid-template-columns: 1fr; align-items: start; }
          .hero-controls { justify-items: start; }
          .filters { justify-content: flex-start; }
        }
        @media (max-width: 640px) {
          .grid { grid-template-columns: 1fr; }
          .user-email { display: none; }
          .hero h1 { font-size: 1.8rem; }
          .search input { width: 100%; }
        }
      `}</style>
    </div>
  );
}
