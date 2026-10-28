import React from 'react';
import { formatRupiah } from '../utils/formatters.js';

interface ChipStackProps {
  amount: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ChipStack: React.FC<ChipStackProps> = ({ amount, label }) => {
  if (amount <= 0) return null;

  const getChipClass = (val: number) => {
    if (val >= 100000) return 'chip-gold';
    if (val >= 50000) return 'chip-purple';
    if (val >= 20000) return 'chip-green';
    if (val >= 5000) return 'chip-red';
    return 'chip-blue';
  };

  return (
    <div className="chip-pill">
      <div className={`chip-coin ${getChipClass(amount)}`}>
        <span>Rp</span>
      </div>

      <div className="chip-text-group">
        {label && <span className="chip-label">{label}</span>}
        <span className="chip-amount">{formatRupiah(amount)}</span>
      </div>
    </div>
  );
};
