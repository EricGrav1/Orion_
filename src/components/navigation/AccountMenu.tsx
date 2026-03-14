import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, CreditCard, FolderKanban, GraduationCap, LogOut, User } from 'lucide-react';

interface AccountMenuProps {
  email?: string | null;
  onSignOut: () => Promise<void> | void;
  compact?: boolean;
}

function getDisplayName(email?: string | null): string {
  if (!email) return 'Account';
  const [name] = email.split('@');
  if (!name) return email;
  return name.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInitials(email?: string | null): string {
  const name = getDisplayName(email);
  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  return letters || 'A';
}

export function AccountMenu({ email, onSignOut, compact = false }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = useMemo(() => getInitials(email), [email]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
      setOpen(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className={`account-menu ${compact ? 'compact' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden="true">{initials}</span>
        {!compact && (
          <span className="identity">
            <span className="name">{displayName}</span>
            <span className="email">{email || 'No email'}</span>
          </span>
        )}
        <ChevronDown size={16} className={`caret ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="account-popover" role="menu" aria-label="Account menu">
          <div className="account-header">
            <div className="header-name">{displayName}</div>
            <div className="header-email">{email || '—'}</div>
          </div>
          <Link to="/account" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <User size={15} />
            Account
          </Link>
          <Link to="/courses" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <FolderKanban size={15} />
            Courses
          </Link>
          <Link to="/pricing" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <CreditCard size={15} />
            Billing
          </Link>
          <Link to="/lms" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <GraduationCap size={15} />
            LMS Hub
          </Link>
          <button
            type="button"
            className="menu-item signout"
            role="menuitem"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
          >
            <LogOut size={15} />
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}

      <style>{`
        .account-menu { position: relative; }
        .account-trigger {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          border: 1px solid var(--border-color, rgba(255,255,255,0.14));
          border-radius: 999px;
          background: var(--bg-card, rgba(20,24,45,0.75));
          color: var(--text-primary, #FAFAFA);
          padding: 0.28rem 0.4rem 0.28rem 0.32rem;
          cursor: pointer;
          min-height: 38px;
          backdrop-filter: blur(12px);
        }
        .account-trigger:hover { border-color: var(--border-active, rgba(255,255,255,0.3)); }
        .avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          background: linear-gradient(135deg, var(--accent, #D4A84B), #7ac9ff);
          color: #101327;
        }
        .identity { display: grid; text-align: left; line-height: 1.1; }
        .name { font-size: 0.78rem; font-weight: 700; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .email { font-size: 0.68rem; color: var(--text-secondary, rgba(255,255,255,0.66)); max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .caret { color: var(--text-secondary, rgba(255,255,255,0.66)); transition: transform 0.2s ease; }
        .caret.open { transform: rotate(180deg); }
        .account-menu.compact .account-trigger { padding-right: 0.32rem; }
        .account-menu.compact .identity { display: none; }
        .account-popover {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 230px;
          border-radius: 14px;
          border: 1px solid var(--border-color, rgba(255,255,255,0.14));
          background: var(--bg-card-solid, rgba(25,30,55,0.96));
          backdrop-filter: blur(16px);
          box-shadow: 0 16px 32px rgba(0,0,0,0.28);
          overflow: hidden;
          z-index: 120;
        }
        .account-header {
          padding: 0.68rem 0.8rem;
          border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.1));
          background: rgba(255,255,255,0.03);
        }
        .header-name { font-size: 0.82rem; font-weight: 700; color: var(--text-primary, #FAFAFA); }
        .header-email { margin-top: 0.2rem; font-size: 0.72rem; color: var(--text-secondary, rgba(255,255,255,0.66)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.58rem 0.8rem;
          color: var(--text-primary, #FAFAFA);
          text-decoration: none;
          border: none;
          background: transparent;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
        }
        .menu-item:hover { background: rgba(255,255,255,0.06); }
        .menu-item.signout {
          border-top: 1px solid var(--border-color, rgba(255,255,255,0.1));
          color: #ffcdcd;
        }
        .menu-item.signout:disabled { opacity: 0.65; cursor: default; }
      `}</style>
    </div>
  );
}
