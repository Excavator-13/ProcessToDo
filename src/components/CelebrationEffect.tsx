interface CelebrationEffectProps {
  active: boolean;
}

const CONFETTI_COLORS = [
  "bg-neon-cyan",
  "bg-neon-green",
  "bg-neon-red",
  "bg-neon-yellow",
  "bg-neon-blue",
];

const FIXED_PIECES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${10 + ((i * 37 + 13) % 80)}%`,
  delay: `${i * 0.03}s`,
  size: i % 2 === 0 ? "w-2 h-2" : "w-1.5 h-1.5",
}));

export default function CelebrationEffect({ active }: CelebrationEffectProps) {
  if (!active) return null;

  return (
    <div className="relative pointer-events-none">
      {FIXED_PIECES.map((piece) => (
        <div
          key={piece.id}
          className={`absolute -top-2 ${piece.size} ${piece.color} rounded-sm animate-confetti`}
          style={{
            left: piece.left,
            animationDelay: piece.delay,
          }}
        />
      ))}
    </div>
  );
}
