import {
  AbsoluteFill,
  Img,
  Series,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { EditorBlock } from '../types/blocks.types';
import type { CourseTheme } from '../types/courseTheme.types';

export interface CourseVideoCompositionProps {
  courseTitle: string;
  blocks: EditorBlock[];
  theme: CourseTheme;
}

const INTRO_SECONDS = 2.5;
const SCENE_SECONDS = 3.2;
const OUTRO_SECONDS = 2.2;

const stripHtml = (html: string): string =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function withAlpha(hexColor: string, alphaHex: string): string {
  if (!/^#([0-9a-fA-F]{6})$/.test(hexColor)) return `${hexColor}`;
  return `${hexColor}${alphaHex}`;
}

function IntroScene({ title, theme }: { title: string; theme: CourseTheme }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    fps,
    frame,
    config: { damping: 20, stiffness: 120, mass: 0.7 },
  });
  const glow = interpolate(frame, [0, fps * 1.2], [0.2, 0.8], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: `radial-gradient(circle at 20% 20%, ${withAlpha(theme.brandColor, '2E')} 0%, rgba(9, 11, 23, 0.96) 52%),
          radial-gradient(circle at 80% 75%, ${withAlpha(theme.accentColor, '3C')} 0%, rgba(7, 9, 17, 0.95) 58%)`,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - reveal) * 70}px) scale(${0.9 + reveal * 0.1})`,
          opacity: reveal,
          textAlign: 'center',
          maxWidth: 980,
          padding: '0 64px',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            border: `1px solid ${withAlpha(theme.brandColor, '90')}`,
            borderRadius: 999,
            fontSize: 22,
            letterSpacing: 2,
            textTransform: 'uppercase',
            padding: '8px 18px',
            color: '#d7dbe8',
            marginBottom: 26,
            boxShadow: `0 0 ${Math.round(glow * 24)}px ${withAlpha(theme.brandColor, '6B')}`,
          }}
        >
          Orion Video Draft
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: theme.fontFamily,
            fontSize: 86,
            lineHeight: 1.05,
            fontWeight: 600,
            letterSpacing: -1.2,
            color: '#f8fbff',
          }}
        >
          {title}
        </h1>
        <p style={{ marginTop: 22, color: '#aab4cc', fontSize: 28 }}>
          Auto-generated from your course blocks.
        </p>
      </div>
    </AbsoluteFill>
  );
}

function getBlockSnapshot(block: EditorBlock): { title: string; body: string; imageSrc: string | null } {
  switch (block.type) {
    case 'heading':
      return { title: block.content.text || 'Heading', body: `Level H${block.content.level}`, imageSrc: null };
    case 'text': {
      const text = stripHtml(block.content.html || '');
      return {
        title: text.slice(0, 95) || 'Text section',
        body: text.slice(95, 220) || 'Narrative segment',
        imageSrc: null,
      };
    }
    case 'image':
      return {
        title: block.content.caption || block.content.alt || 'Image section',
        body: block.content.alt || 'Visual explanation',
        imageSrc: block.content.src || null,
      };
    case 'video':
      return {
        title: 'Video segment',
        body: block.content.url || 'Embedded media block',
        imageSrc: null,
      };
    case 'divider':
      return {
        title: 'Section break',
        body: `Divider: ${block.content.style}`,
        imageSrc: null,
      };
    case 'quote':
      return {
        title: block.content.text || 'Quote',
        body: block.content.attribution ? `— ${block.content.attribution}` : 'Pull quote section',
        imageSrc: null,
      };
    case 'cta':
      return {
        title: block.content.label || 'Call to action',
        body: block.content.url || 'Action step',
        imageSrc: null,
      };
    case 'button':
      return {
        title: block.content.label || 'Button',
        body: block.content.url || 'Linked action',
        imageSrc: null,
      };
    case 'accordion':
      return {
        title: block.content.items[0]?.title || 'Accordion section',
        body: `${block.content.items.length} expandable item(s)`,
        imageSrc: null,
      };
    case 'tabs':
      return {
        title: block.content.tabs[0]?.title || 'Tabbed section',
        body: `${block.content.tabs.length} tab(s)`,
        imageSrc: null,
      };
    case 'flipcard':
      return {
        title: block.content.frontTitle || 'Flip card',
        body: block.content.backTitle || 'Reveal interaction',
        imageSrc: null,
      };
    case 'timeline':
      return {
        title: block.content.items[0]?.title || 'Timeline',
        body: `${block.content.items.length} step(s)`,
        imageSrc: null,
      };
    case 'imagetext':
      return {
        title: block.content.heading || 'Image + text',
        body: block.content.body || 'Mixed media section',
        imageSrc: block.content.imageSrc || null,
      };
    case 'quiz':
      return {
        title: block.content.question || 'Knowledge check',
        body: `${block.content.options.length} option(s)`,
        imageSrc: null,
      };
    default:
      return { title: 'Course block', body: 'Generated scene', imageSrc: null };
  }
}

function BlockScene({
  block,
  index,
  total,
  theme,
}: {
  block: EditorBlock;
  index: number;
  total: number;
  theme: CourseTheme;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const snapshot = getBlockSnapshot(block);

  const enter = spring({
    fps,
    frame,
    config: { damping: 22, stiffness: 130, mass: 0.7 },
  });
  const fade = interpolate(frame, [0, fps * 0.35], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const lineWipe = interpolate(frame, [0, fps * 0.6], [0, 100], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 10% 8%, rgba(255,255,255,0.08) 0%, rgba(12, 16, 32, 0.92) 42%), linear-gradient(135deg, rgba(6,8,16,0.97), rgba(13,18,34,0.98))',
        color: '#f4f7ff',
        padding: '68px 88px',
        fontFamily: theme.fontFamily,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 36,
        }}
      >
        <div style={{ fontSize: 20, color: '#c2cadf' }}>
          Scene {index + 1} / {total}
        </div>
        <div
          style={{
            fontSize: 18,
            border: `1px solid ${withAlpha(theme.brandColor, '99')}`,
            borderRadius: 999,
            padding: '6px 12px',
            color: '#dce2f4',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}
        >
          {block.type}
        </div>
      </div>

      <div
        style={{
          height: 2,
          width: `${lineWipe}%`,
          background: `linear-gradient(90deg, ${theme.brandColor}, ${theme.accentColor})`,
          marginBottom: 34,
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: snapshot.imageSrc ? '1.1fr 0.9fr' : '1fr',
          gap: 34,
          transform: `translateY(${(1 - enter) * 56}px)`,
          opacity: fade,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 62,
              lineHeight: 1.05,
              margin: '0 0 24px',
              letterSpacing: -0.9,
              fontWeight: 580,
            }}
          >
            {snapshot.title}
          </h2>
          <p style={{ margin: 0, color: '#b7c1d7', fontSize: 30, lineHeight: 1.35 }}>
            {snapshot.body}
          </p>
        </div>
        {snapshot.imageSrc && (
          <div
            style={{
              borderRadius: 18,
              overflow: 'hidden',
              border: `2px solid ${withAlpha(theme.brandColor, '88')}`,
              boxShadow: `0 16px 50px ${withAlpha(theme.accentColor, '55')}`,
            }}
          >
            <Img
              src={snapshot.imageSrc}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              alt={snapshot.title}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

function OutroScene({ theme }: { theme: CourseTheme }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = interpolate(frame, [0, fps * 0.65], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: `linear-gradient(150deg, rgba(8,11,20,0.98), ${withAlpha(theme.accentColor, '22')}, rgba(8,11,20,0.98))`,
        fontFamily: theme.fontFamily,
        color: '#ecf1ff',
      }}
    >
      <div style={{ textAlign: 'center', opacity: reveal, transform: `scale(${0.94 + reveal * 0.06})` }}>
        <h2 style={{ margin: 0, fontSize: 74, letterSpacing: -1, fontWeight: 580 }}>Draft Ready</h2>
        <p style={{ marginTop: 16, fontSize: 30, color: '#b8c3da' }}>
          Refine this timeline and export a final render.
        </p>
      </div>
    </AbsoluteFill>
  );
}

export function getCourseVideoDurationInFrames(blockCount: number, fps: number): number {
  const introFrames = Math.round(INTRO_SECONDS * fps);
  const sceneFrames = Math.round(SCENE_SECONDS * fps) * Math.max(blockCount, 1);
  const outroFrames = Math.round(OUTRO_SECONDS * fps);
  return introFrames + sceneFrames + outroFrames;
}

export function CourseVideoComposition({
  courseTitle,
  blocks,
  theme,
}: CourseVideoCompositionProps) {
  const { fps } = useVideoConfig();
  const introFrames = Math.round(INTRO_SECONDS * fps);
  const sceneFrames = Math.round(SCENE_SECONDS * fps);
  const outroFrames = Math.round(OUTRO_SECONDS * fps);
  const visibleBlocks = blocks.filter((block) => !block.settings.hidden);
  const renderBlocks =
    visibleBlocks.length > 0
      ? visibleBlocks
      : [
          {
            id: 'fallback-scene',
            course_id: 'fallback',
            type: 'text' as const,
            content: { html: '<p>No blocks yet. Add content in the editor first.</p>' },
            settings: {},
            order: 0,
            created_at: new Date().toISOString(),
          },
        ];

  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence durationInFrames={introFrames} premountFor={Math.round(fps * 0.25)}>
          <IntroScene title={courseTitle} theme={theme} />
        </Series.Sequence>
        {renderBlocks.map((block, index) => (
          <Series.Sequence
            key={block.id}
            durationInFrames={sceneFrames}
            premountFor={Math.round(fps * 0.25)}
          >
            <BlockScene block={block} index={index} total={renderBlocks.length} theme={theme} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={outroFrames} premountFor={Math.round(fps * 0.25)}>
          <OutroScene theme={theme} />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
}
