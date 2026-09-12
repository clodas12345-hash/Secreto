import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface FieldShiftArrowsProps {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  labelUp?: string;
  labelDown?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Helper to smoothly move or swap values between two fields
 * - If one field has text and the other is empty, moves the text over and clears the origin.
 * - If both have text, swaps their values.
 */
export function shiftOrSwapFields(
  valA: string,
  setValA: (val: string) => void,
  valB: string,
  setValB: (val: string) => void,
  onSuccessNotice?: (msg: string) => void
) {
  if (valA && !valB) {
    setValB(valA);
    setValA('');
    onSuccessNotice?.('Texto movido para o outro campo!');
  } else if (!valA && valB) {
    setValA(valB);
    setValB('');
    onSuccessNotice?.('Texto movido para o outro campo!');
  } else {
    const temp = valA;
    setValA(valB);
    setValB(temp);
    onSuccessNotice?.('Conteúdo dos campos invertido!');
  }
}

/**
 * Arrow buttons component to move/swap content to the field above or below.
 */
export function FieldShiftArrows({
  onMoveUp,
  onMoveDown,
  labelUp = 'Mover/trocar com campo de cima',
  labelDown = 'Mover/trocar com campo de baixo',
  className = '',
  size = 'sm'
}: FieldShiftArrowsProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMoveUp) {
      onMoveUp();
      setFeedback('Subiu ↑');
      setTimeout(() => setFeedback(null), 1200);
    }
  };

  const handleDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMoveDown) {
      onMoveDown();
      setFeedback('Desceu ↓');
      setTimeout(() => setFeedback(null), 1200);
    }
  };

  const isSm = size === 'sm';

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {feedback && (
        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 rounded animate-in fade-in">
          {feedback}
        </span>
      )}

      {onMoveUp && (
        <button
          type="button"
          onClick={handleUp}
          title={labelUp}
          className={`group flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
            isSm ? 'w-6 h-6' : 'w-7 h-7'
          } bg-zinc-800/80 hover:bg-blue-600/30 border-zinc-700/80 hover:border-blue-500/50 text-zinc-400 hover:text-blue-300 shadow-sm active:scale-90`}
        >
          <ArrowUp className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-transform group-hover:-translate-y-0.5`} />
        </button>
      )}

      {onMoveDown && (
        <button
          type="button"
          onClick={handleDown}
          title={labelDown}
          className={`group flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
            isSm ? 'w-6 h-6' : 'w-7 h-7'
          } bg-zinc-800/80 hover:bg-blue-600/30 border-zinc-700/80 hover:border-blue-500/50 text-zinc-400 hover:text-blue-300 shadow-sm active:scale-90`}
        >
          <ArrowDown className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-transform group-hover:translate-y-0.5`} />
        </button>
      )}
    </div>
  );
}

/**
 * Divider button placed between two fields to quickly swap their content.
 */
export function FieldSwapDivider({
  onSwap,
  label = 'Inverter campos (Cima / Baixo)',
  className = ''
}: {
  onSwap: () => void;
  label?: string;
  className?: string;
}) {
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSwap();
    setClicked(true);
    setTimeout(() => setClicked(false), 900);
  };

  return (
    <div className={`relative flex items-center justify-center my-1.5 ${className}`}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-dashed border-zinc-800" />
      </div>
      <button
        type="button"
        onClick={handleClick}
        title={label}
        className={`relative z-10 px-2.5 py-0.5 text-[10px] font-bold rounded-full border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
          clicked
            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-cyan-500/20'
            : 'bg-zinc-900 hover:bg-blue-600/20 border-zinc-700/80 hover:border-blue-500/40 text-zinc-400 hover:text-blue-300'
        }`}
      >
        <ArrowUpDown className={`w-3 h-3 ${clicked ? 'rotate-180 text-cyan-400' : ''} transition-transform duration-300`} />
        <span>{clicked ? 'Campos Invertidos!' : 'Trocar Cima/Baixo'}</span>
      </button>
    </div>
  );
}
