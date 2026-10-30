import React, { useEffect } from 'react';

export interface FlyingChipEvent {
  id: string;
  type: 'bet' | 'pot-splash';
  from: { top: string; left: string };
  to: { top: string; left: string };
  count: number;
  color?: 'gold' | 'purple' | 'green' | 'red' | 'blue';
}

interface FlyingChipLayerProps {
  events: FlyingChipEvent[];
  onFinishEvent: (id: string) => void;
}

export const FlyingChipLayer: React.FC<FlyingChipLayerProps> = ({ events, onFinishEvent }) => {
  useEffect(() => {
    events.forEach(evt => {
      // Auto-cleanup event after animation completes (longest delay + flight duration ~950ms)
      const maxDuration = evt.type === 'pot-splash' ? 1100 : 850;
      const timer = setTimeout(() => {
        onFinishEvent(evt.id);
      }, maxDuration);
      return () => clearTimeout(timer);
    });
  }, [events, onFinishEvent]);

  if (events.length === 0) return null;

  return (
    <div
      className="flying-chips-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 40
      }}
    >
      {events.map(evt => {
        const chipCount = Math.max(1, evt.count);
        const chipsArray = Array.from({ length: chipCount });

        return (
          <React.Fragment key={evt.id}>
            {chipsArray.map((_, i) => {
              // Scatter offsets in px to make it look like a physical flurry of chips
              const scatterX = (Math.random() - 0.5) * (evt.type === 'pot-splash' ? 36 : 18);
              const scatterY = (Math.random() - 0.5) * (evt.type === 'pot-splash' ? 36 : 18);
              const delayMs = i * (evt.type === 'pot-splash' ? 35 : 45);
              const rotDeg = Math.floor(Math.random() * 360) + 180;

              // Color gradient
              const colorType = evt.color || (evt.type === 'pot-splash' ? 'gold' : i % 2 === 0 ? 'gold' : 'green');
              const gradClass =
                colorType === 'gold'
                  ? 'chip-gold'
                  : colorType === 'purple'
                  ? 'chip-purple'
                  : colorType === 'green'
                  ? 'chip-green'
                  : colorType === 'red'
                  ? 'chip-red'
                  : 'chip-blue';

              return (
                <div
                  key={`${evt.id}-chip-${i}`}
                  className={`flying-chip-item ${gradClass}`}
                  style={{
                    '--from-top': evt.from.top,
                    '--from-left': evt.from.left,
                    '--to-top': evt.to.top,
                    '--to-left': evt.to.left,
                    '--scatter-x': `${scatterX}px`,
                    '--scatter-y': `${scatterY}px`,
                    '--rot-deg': `${rotDeg}deg`,
                    animationDelay: `${delayMs}ms`,
                    animationDuration: evt.type === 'pot-splash' ? '0.72s' : '0.62s'
                  } as React.CSSProperties}
                >
                  <span>Rp</span>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};

