import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface ImportWorkflowTeaserProps {
  blueprintLabel: string;
  brandColor: string;
  accentColor: string;
}

const STEPS = ['Source', 'Outline', 'Blocks', 'Publish'];

function withAlpha(hexColor: string, alphaHex: string): string {
  if (!/^#([0-9a-fA-F]{6})$/.test(hexColor)) return hexColor;
  return `${hexColor}${alphaHex}`;
}

export function ImportWorkflowTeaser({
  blueprintLabel,
  brandColor,
  accentColor,
}: ImportWorkflowTeaserProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const introOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const progressValue = interpolate(frame, [0, fps * 5], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        padding: 44,
        color: '#f6f8ff',
        fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        background: `radial-gradient(circle at 16% 14%, ${withAlpha(brandColor, '4D')} 0%, rgba(13,17,32,0.96) 56%),
          radial-gradient(circle at 82% 78%, ${withAlpha(accentColor, '4D')} 0%, rgba(12,15,30,0.95) 55%)`,
      }}
    >
      <div style={{ opacity: introOpacity }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            border: `1px solid ${withAlpha(brandColor, '9A')}`,
            color: '#d9e2fc',
            fontSize: 24,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            padding: '8px 16px',
          }}
        >
          Orion AI Builder
        </div>
        <h1 style={{ margin: '22px 0 8px', fontSize: 82, lineHeight: 1.05, letterSpacing: -1.5 }}>
          {blueprintLabel}
        </h1>
        <p style={{ margin: 0, color: '#c3cee8', fontSize: 28 }}>
          Turn source files into production-ready learning content.
        </p>
      </div>

      <div style={{ marginTop: 40, display: 'grid', gap: 14 }}>
        {STEPS.map((step, index) => {
          const delayedFrame = frame - index * Math.round(fps * 0.22);
          const reveal = spring({
            fps,
            frame: delayedFrame,
            config: { damping: 18, stiffness: 110, mass: 0.8 },
          });
          return (
            <div
              key={step}
              style={{
                borderRadius: 14,
                border: `1px solid ${withAlpha(accentColor, '7A')}`,
                background: 'rgba(255,255,255,0.05)',
                padding: '14px 16px',
                transform: `translateX(${(1 - reveal) * 80}px)`,
                opacity: reveal,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 30, fontWeight: 700 }}>{step}</span>
              <span style={{ color: '#aebad7', fontSize: 22 }}>Step {index + 1}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 26 }}>
        <div
          style={{
            width: '100%',
            height: 16,
            borderRadius: 999,
            border: `1px solid ${withAlpha(brandColor, '7A')}`,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressValue}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${brandColor}, ${accentColor})`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}
