/**
 * Rappresentazione grafica di una carta WCST: `number` simboli di `shape`
 * nel colore `color`. Forme disegnate in SVG.
 */
import type { WcstCard, WcstColor, WcstShape } from '../../engine/tests/wcst';

const COLOR_HEX: Record<WcstColor, string> = {
  red: '#D0021B',
  green: '#2E7D32',
  yellow: '#F5A623',
  blue: '#1565C0',
};

const COLOR_IT: Record<WcstColor, string> = { red: 'rosso', green: 'verde', yellow: 'giallo', blue: 'blu' };
const SHAPE_IT: Record<WcstShape, string> = { triangle: 'triangoli', star: 'stelle', cross: 'croci', circle: 'cerchi' };

function ShapeGlyph({ shape, color }: { shape: WcstShape; color: WcstColor }): JSX.Element {
  const fill = COLOR_HEX[color];
  const size = 22;
  switch (shape) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="9" fill={fill} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <polygon points="12,3 22,21 2,21" fill={fill} />
        </svg>
      );
    case 'cross':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill={fill} />
        </svg>
      );
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <polygon
            points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,16.5 5.5,21 7.5,13.5 2,9 9,9"
            fill={fill}
          />
        </svg>
      );
  }
}

interface CardFaceProps {
  card: WcstCard;
  onClick?: () => void;
  interactive?: boolean;
}

/** Faccia di una carta con i simboli disposti verticalmente. */
export function CardFace({ card, onClick, interactive = false }: CardFaceProps): JSX.Element {
  const symbols = Array.from({ length: card.number }, (_, i) => (
    <ShapeGlyph key={i} shape={card.shape} color={card.color} />
  ));
  const Comp = interactive ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`flex h-32 w-24 flex-col items-center justify-center gap-1 rounded-card border bg-white ${
        interactive ? 'border-line hover:border-accent cursor-pointer' : 'border-line'
      }`}
      role={interactive ? undefined : 'img'}
      aria-label={`${card.number} ${SHAPE_IT[card.shape]} ${COLOR_IT[card.color]}`}
    >
      {symbols}
    </Comp>
  );
}
