export function Sun({ className = 'sun' }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="sun-rays" />
    </div>
  );
}

