import { useState, useEffect } from 'react';

interface GameProps {
  onHiddenEscape: () => void;
}

export default function Game({ onHiddenEscape }: GameProps) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [clicks, setClicks] = useState(0);

  const calculateWinner = (squares: any[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6] // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (i: number) => {
    if (calculateWinner(board) || board[i]) {
      return;
    }
    const newBoard = board.slice();
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  const winner = calculateWinner(board);
  let status;
  if (winner) {
    status = `Vencedor: ${winner}`;
  } else if (!board.includes(null)) {
    status = 'Empate!';
  } else {
    status = `Próximo jogador: ${xIsNext ? 'X' : 'O'}`;
  }

  // Hidden escape mechanism
  useEffect(() => {
    if (clicks >= 3) {
      onHiddenEscape();
      setClicks(0);
    }
    
    let timer: number;
    if (clicks > 0) {
      timer = window.setTimeout(() => setClicks(0), 1500); // Reset clicks if not fast enough
    }
    return () => clearTimeout(timer);
  }, [clicks, onHiddenEscape]);

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center font-sans text-zinc-300">
      
      {/* Hidden button in top left corner (tapping 3 times) */}
      <div 
        className="absolute top-4 left-4 p-3 opacity-30 hover:opacity-80 cursor-pointer select-none rounded-lg bg-zinc-900/50 border border-zinc-800/40 transition-opacity"
        onClick={() => setClicks(c => c + 1)}
        title="Toque 3 vezes para retornar ao cofre"
      >
        <span className="text-[10px] font-mono text-zinc-500">v2.5 • Discrição</span>
      </div>

      <button 
        className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-zinc-900/60 hover:bg-blue-600/20 border border-zinc-800 hover:border-blue-500/40 text-[11px] font-bold text-zinc-600 hover:text-blue-400 transition-all uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
        onClick={onHiddenEscape}
        title="Retornar ao cofre GKD Secreto"
      >
        <span>🔒 GKD • Voltar ao Cofre</span>
      </button>

      <div className="max-w-md w-full p-6">
        <h1 className="text-3xl font-bold text-center mb-8 text-white tracking-widest uppercase">
          Retro Galaxy
        </h1>

        <div className="text-center mb-6 text-xl font-medium text-zinc-500">
          {status}
        </div>

        <div className="grid grid-cols-3 gap-2 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
          {board.map((square, i) => (
            <button
              key={i}
              className="aspect-square bg-zinc-950 rounded-lg text-5xl font-bold flex items-center justify-center hover:bg-zinc-800 transition-colors border border-zinc-900"
              onClick={() => handleClick(i)}
            >
              <span className={square === 'X' ? 'text-emerald-500' : 'text-amber-500'}>
                {square}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={reset}
            className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full font-medium transition-colors border border-zinc-800 text-white"
          >
            Reiniciar Jogo
          </button>
        </div>
      </div>
    </div>
  );
}
