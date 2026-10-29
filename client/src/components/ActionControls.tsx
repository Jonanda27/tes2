import React, { useState, useEffect } from 'react';
import { PlayerPublic } from '../types.js';
import { formatRupiah } from '../utils/formatters.js';
import { LiveHandStrength } from '../utils/handStrength.js';
import { soundEffects } from '../utils/soundEffects.js';
import { ShieldAlert, ArrowUpRight, Check, Coins, Sparkles } from 'lucide-react';

interface ActionControlsProps {
  myPlayer: PlayerPublic;
  currentHighestBet: number;
  minRaise: number;
  pot: number;
  bigBlind: number;
  liveHandStrength?: LiveHandStrength | null;
  onAction: (action: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE', amount?: number) => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  myPlayer,
  currentHighestBet,
  minRaise,
  pot,
  bigBlind,
  liveHandStrength,
  onAction
}) => {
  const callCost = currentHighestBet - myPlayer.currentBet;
  const canCheck = callCost <= 0;
  const maxPossibleBet = myPlayer.chips + myPlayer.currentBet;

  const initialMinRaiseTarget = Math.min(
    maxPossibleBet,
    currentHighestBet === 0 ? bigBlind : currentHighestBet + minRaise
  );

  const [raiseAmount, setRaiseAmount] = useState<number>(initialMinRaiseTarget);

  useEffect(() => {
    setRaiseAmount(initialMinRaiseTarget);
  }, [currentHighestBet, minRaise, myPlayer.currentBet, initialMinRaiseTarget]);

  const handleFold = () => {
    soundEffects.playCheckSound();
    onAction('FOLD');
  };

  const handleCheckOrCall = () => {
    if (canCheck) {
      soundEffects.playCheckSound();
      onAction('CHECK');
    } else {
      soundEffects.playChipSound();
      onAction('CALL');
    }
  };

  const handleRaiseSubmit = () => {
    soundEffects.playChipSound();
    onAction('RAISE', raiseAmount);
  };

  const setPreset = (target: number) => {
    const clamped = Math.max(initialMinRaiseTarget, Math.min(maxPossibleBet, target));
    setRaiseAmount(clamped);
  };

  const isAllInRaise = raiseAmount >= maxPossibleBet;
  const canRaise = myPlayer.chips > callCost && maxPossibleBet > currentHighestBet;

  return (
    <div className="action-console">
      {/* Live Hand Strength Banner inside Console */}
      {liveHandStrength && (
        <div className={`console-hand-banner tier-${liveHandStrength.tier}`}>
          <div className="console-hand-header">
            <Sparkles size={11} />
            <span>Kombinasi Kartu Anda</span>
          </div>
          <div className="console-hand-value">{liveHandStrength.label}</div>
        </div>
      )}

      {/* Raise Slider & Presets */}
      {canRaise && (
        <div className="slider-container">
          <div className="slider-info">
            <span className="slider-info-label">Nominal Taruhan</span>
            <span className="slider-info-val">
              {formatRupiah(raiseAmount)} {isAllInRaise && '(ALL-IN)'}
            </span>
          </div>

          <input
            type="range"
            min={initialMinRaiseTarget}
            max={maxPossibleBet}
            step={1000}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="raise-range"
          />

          <div className="preset-row">
            <button
              type="button"
              onClick={() => setPreset(initialMinRaiseTarget)}
              className="btn-preset"
            >
              Min
            </button>
            <button
              type="button"
              onClick={() => setPreset(currentHighestBet + bigBlind * 2)}
              className="btn-preset"
            >
              2x BB
            </button>
            <button
              type="button"
              onClick={() => setPreset(currentHighestBet + Math.max(minRaise, Math.floor(pot * 0.5)))}
              className="btn-preset"
            >
              1/2 Pot
            </button>
            <button
              type="button"
              onClick={() => setPreset(currentHighestBet + Math.max(minRaise, pot))}
              className="btn-preset"
            >
              Pot
            </button>
            <button
              type="button"
              onClick={() => setPreset(maxPossibleBet)}
              className="btn-preset btn-preset-allin"
            >
              All In
            </button>
          </div>
        </div>
      )}

      {/* Main Action Buttons (Vertical Stack on Left) */}
      <div className="action-buttons-row">
        {/* FOLD */}
        <button onClick={handleFold} className="btn-action btn-fold">
          <div className="action-title">
            <ShieldAlert size={19} />
            <span>FOLD</span>
          </div>
          <span className="action-sub">Tutup Kartu</span>
        </button>

        {/* CHECK / CALL */}
        <button onClick={handleCheckOrCall} className="btn-action btn-check-call">
          <div className="action-title">
            <Check size={19} />
            <span>{canCheck ? 'CHECK' : 'CALL'}</span>
          </div>
          <span className="action-sub">
            {canCheck ? 'Lewati Gratis' : formatRupiah(Math.min(callCost, myPlayer.chips))}
          </span>
        </button>

        {/* RAISE / BET */}
        <button
          onClick={handleRaiseSubmit}
          disabled={!canRaise}
          className="btn-action btn-raise"
        >
          <div className="action-title">
            {currentHighestBet === 0 ? <Coins size={19} /> : <ArrowUpRight size={19} />}
            <span>{currentHighestBet === 0 ? 'BET' : 'RAISE'}</span>
          </div>
          <span className="action-sub">
            {canRaise ? formatRupiah(raiseAmount) : 'Tidak Cukup'}
          </span>
        </button>
      </div>
    </div>
  );
};
