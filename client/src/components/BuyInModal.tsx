import React, { useState, useEffect } from 'react';
import { Wallet, Coins, ShieldCheck, Compass, X, CheckCircle2 } from 'lucide-react';
import { formatRupiah } from '../utils/formatters.js';

interface BuyInModalProps {
  isOpen: boolean;
  mode: 'sit' | 'topup';
  seatIndex: number;
  walletBalance: number;
  bigBlind: number;
  onClose: () => void;
  onConfirm: (buyInAmount: number) => void;
  onGoToLobbyCashier: () => void;
}

export const BuyInModal: React.FC<BuyInModalProps> = ({
  isOpen,
  mode,
  seatIndex,
  walletBalance,
  bigBlind,
  onClose,
  onConfirm,
  onGoToLobbyCashier
}) => {
  const minBuyIn = Math.min(walletBalance, Math.max(1000, bigBlind * 10));
  const maxBuyIn = Math.max(0, walletBalance);
  const recommendedBuyIn = Math.min(maxBuyIn, Math.max(100000, bigBlind * 100));

  const [amount, setAmount] = useState<number>(recommendedBuyIn > 0 ? recommendedBuyIn : maxBuyIn);

  useEffect(() => {
    if (isOpen) {
      const rec = Math.min(walletBalance, Math.max(100000, bigBlind * 100));
      setAmount(rec > 0 ? rec : Math.max(0, walletBalance));
    }
  }, [isOpen, walletBalance, bigBlind]);

  if (!isOpen) return null;

  const safeAmount = Math.min(maxBuyIn, Math.max(minBuyIn, amount));
  const remainingWallet = Math.max(0, walletBalance - safeAmount);
  const isBroke = walletBalance <= 0;

  const presets = [
    { label: 'Rp 50rb', value: 50000 },
    { label: 'Rp 100rb', value: 100000 },
    { label: 'Rp 200rb', value: 200000 },
    { label: 'Rp 500rb', value: 500000 },
    { label: 'Semua', value: maxBuyIn }
  ];

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 120
      }}
    >
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '430px',
          width: '92%',
          padding: '22px 24px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 14, 28, 0.99) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(245, 158, 11, 0.15)',
          borderRadius: '20px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Coins size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#f8fafc' }}>
                {mode === 'sit' ? `Duduk di Kursi #${seatIndex + 1}` : 'Tambah Modal dari Dompet'}
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', fontWeight: 600 }}>
                Pilih nominal chip dari dompet yang dibawa ke meja
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Total Wallet Balance Banner */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={16} color="#fbbf24" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
              Saldo Dompet Tersedia:
            </span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 900, color: isBroke ? '#f43f5e' : '#fef08a', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatRupiah(walletBalance)}
          </span>
        </div>

        {isBroke ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.45)',
              textAlign: 'center',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>🏦👨‍💻</div>
            <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', color: '#fecdd3', fontWeight: 900 }}>
              Saldo Dompet Anda Rp 0 (Habis Total)!
            </p>
            <p style={{ margin: '0 0 14px 0', fontSize: '11.5px', color: '#cbd5e1', lineHeight: 1.45 }}>
              Isi ulang chip tidak bisa dilakukan langsung di meja poker. Silakan kembali ke <strong>Lounge 3D</strong> dan hampiri <strong>Loket Kasir NPC (Pak Python)</strong> untuk menjawab 1 soal Python dan mendapatkan <strong>Rp 1.000.000</strong>!
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToLobbyCashier();
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: '1px solid #fef08a',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Compass size={16} />
              <span>Pergi ke Loket Kasir di Lounge 3D</span>
            </button>
          </div>
        ) : (
          <>
            {/* Selected Buy-In Display & Slider */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                marginBottom: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Modal Dibawa ke Meja (Buy-In)
                </span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#34d399', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatRupiah(safeAmount)}
                </span>
              </div>

              <input
                type="range"
                min={minBuyIn}
                max={maxBuyIn}
                step={Math.min(10000, Math.max(1000, maxBuyIn))}
                value={safeAmount}
                onChange={e => setAmount(Number(e.target.value))}
                className="bet-slider"
                style={{ width: '100%', marginBottom: '12px' }}
              />

              {/* Quick Preset Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {presets.map(p => {
                  const disabled = p.value > maxBuyIn || p.value < minBuyIn;
                  const isSelected = safeAmount === p.value;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      disabled={disabled}
                      onClick={() => setAmount(p.value)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '8px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.35 : 1,
                        background: isSelected
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          : 'rgba(30, 41, 59, 0.9)',
                        color: isSelected ? '#0f172a' : '#e2e8f0',
                        border: isSelected
                          ? '1px solid #fef08a'
                          : '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Breakdown Summary: Seat Chips vs Safe Remaining Wallet */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '14px'
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase' }}>
                  🎯 Chip di Kursi
                </div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#ecfdf5', marginTop: '2px', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatRupiah(safeAmount)}
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#fcd34d', textTransform: 'uppercase' }}>
                  🛡️ Sisa Aman di Dompet
                </div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#fef08a', marginTop: '2px', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatRupiah(remainingWallet)}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 11px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                marginBottom: '16px',
                fontSize: '11px',
                color: '#94a3b8',
                lineHeight: 1.35
              }}
            >
              <ShieldCheck size={16} color="#34d399" style={{ flexShrink: 0 }} />
              <span>
                Sisa saldo dompet <strong>tetap aman</strong> dan tidak ikut hilang jika Anda kalah <em>All-In</em> di meja. Saat berdiri dari kursi, sisa chip di meja otomatis masuk kembali ke dompet.
              </span>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Tutup
          </button>

          {!isBroke && (
            <button
              type="button"
              onClick={() => onConfirm(safeAmount)}
              style={{
                flex: 2,
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: '1px solid #6ee7b7',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(16, 185, 129, 0.35)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>
                {mode === 'sit' ? `Duduk (${formatRupiah(safeAmount)})` : `Tambah (${formatRupiah(safeAmount)})`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
