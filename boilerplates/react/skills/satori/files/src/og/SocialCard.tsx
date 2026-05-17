/**
 * Satori JSX template for a 1200x630 Open Graph / social card.
 *
 * IMPORTANT: this file is imported by the Node-side generator at
 * `scripts/og.ts` via `tsx`. It must NOT import any browser-only APIs
 * (window, document, DOM event handlers, CSS modules, image imports
 * resolved by Vite, etc.). Satori only understands a small subset of
 * CSS — see `upstream/SKILL.md` for the full list. Highlights:
 *
 *   - flexbox only (no `display: block`, no `display: grid`)
 *   - every non-leaf element with multiple children needs `display: flex`
 *   - fixed pixel sizes (no `%`-of-viewport, no `vh`/`vw`)
 *   - no CSS transforms beyond translate/scale/rotate on leaf nodes
 *   - no animations, transitions, or pseudo-elements
 *   - fonts must be loaded explicitly in `scripts/og.ts` and passed
 *     into `satori({ fonts })` — `font-family` strings alone do nothing
 */

export interface SocialCardProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
}

export function SocialCard({
  title = 'Hello from skillpack',
  subtitle = 'Generate Open Graph images with React + satori.',
  eyebrow = 'skillpack · satori',
}: SocialCardProps) {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        color: '#f8fafc',
        fontFamily: 'Inter',
        // Satori supports linear-gradient backgroundImage. Colors inside
        // gradients MUST be hex or rgb — hsl()/named colors crash satori
        // 0.10's gradient parser with "Missing )". See SKILL.md footgun #4.
        backgroundImage:
          'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #7c3aed 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '9999px',
            backgroundColor: '#22d3ee',
          }}
        />
        <span
          style={{
            fontSize: '28px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#cbd5f5',
          }}
        >
          {eyebrow}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <h1
          style={{
            fontSize: '96px',
            lineHeight: 1.05,
            margin: 0,
            fontWeight: 700,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: '36px',
            lineHeight: 1.3,
            margin: 0,
            color: '#e2e8f0',
            maxWidth: '900px',
          }}
        >
          {subtitle}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: '24px',
          color: '#cbd5f5',
        }}
      >
        <span>npm run og:generate</span>
        <span>1200 × 630</span>
      </div>
    </div>
  );
}
