import { useEffect, useMemo, useState } from 'react';

function formatClock(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

function formatFull(date: Date) {
  const d = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const t = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
  return `${d} at ${t}`;
}

export function OrionClock({ className = 'nav-time' }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const label = useMemo(() => formatClock(now), [now]);
  const title = useMemo(() => formatFull(now), [now]);

  return (
    <time className={className} dateTime={now.toISOString()} title={title}>
      {label}
    </time>
  );
}

