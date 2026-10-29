import React, { useState } from 'react';
import { Copy, Check, Users, Bot, RefreshCw, Volume2, VolumeX, LogOut, Music, Compass } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects.js';

interface LobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  onChangeRoom: (newRoomId: string) => void;
  onAddBot: () => void;
  onRebuy: () => void;
  onLeaveSeat: () => void;
  onReturnToLounge?: () => void;
  isSeated: boolean;
  canRebuy: boolean;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  isOpen,
  onClose,
  roomId,
  playerName,
  onUpdatePlayerName,
  onChangeRoom,
  onAddBot,
  onRebuy,
  onLeaveSeat,
  onReturnToLounge,
  isSeated,
  canRebuy
}) => {
  const [copied, setCopied] = useState(false);
  const [targetRoom, setTargetRoom] = useState('');
  const [nameInput, setNameInput] = useState(playerName);
  const [soundOn, setSoundOn] = useState(soundEffects.enabled);
  const [bgmOn, setBgmOn] = useState(soundEffects.isBgmPlaying);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdatePlayerName(nameInput.trim());
    }
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetRoom.trim()) {
      onChangeRoom(targetRoom.trim().toLowerCase());
      setTargetRoom('');
      onClose();
    }
  };

  const toggleSound = () => {
    soundEffects.enabled = !soundEffects.enabled;
    setSoundOn(soundEffects.enabled);
  };

  const toggleBgm = () => {
    const next = soundEffects.toggleBgm();
    setBgmOn(next);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#f59e0b" />
            <span className="modal-title">Lobby & Pengaturan Meja</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Room & Invite Link */}
        <div className="modal-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8' }}>Kode Meja Aktif:</span>
            <strong style={{ color: '#f59e0b', letterSpacing: '0.1em' }}>
              {roomId.toUpperCase()}
            </strong>
          </div>

          <button onClick={handleCopyLink} className="btn-wide-emerald">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Link Meja Berhasil Disalin!' : 'Salin Link Undangan Teman'}</span>
          </button>
          <span style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
            Bagikan link ini ke teman agar bisa langsung bergabung ke meja ini.
          </span>
        </div>

        {/* Player Name Form */}
        <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Nama Anda:</label>
          <div className="input-row">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="input-field"
            />
            <button
              type="submit"
              className="btn-pill btn-pill-dark"
              style={{ borderRadius: '10px', padding: '8px 14px' }}
            >
              Simpan
            </button>
          </div>
        </form>

        {/* Switch / Create Room Form */}
        <form onSubmit={handleRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
            Pindah / Buat Meja Baru:
          </label>
          <div className="input-row">
            <input
              type="text"
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value)}
              placeholder="Contoh: meja-vip / poker-teman"
              className="input-field"
            />
            <button
              type="submit"
              className="btn-pill btn-pill-gold"
              style={{ borderRadius: '10px', padding: '8px 14px' }}
            >
              Masuk
            </button>
          </div>
        </form>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px' }}>
          <button
            onClick={() => {
              onAddBot();
              onClose();
            }}
            className="btn-pill btn-pill-dark"
            style={{ justifyContent: 'center', padding: '10px' }}
          >
            <Bot size={16} color="#c084fc" />
            <span>+ Bot AI</span>
          </button>

          <button
            onClick={toggleSound}
            className="btn-pill btn-pill-dark"
            style={{ justifyContent: 'center', padding: '10px' }}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>SFX: {soundOn ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={toggleBgm}
            className={`btn-pill ${bgmOn ? 'btn-pill-gold' : 'btn-pill-dark'}`}
            style={{ justifyContent: 'center', padding: '10px' }}
          >
            <Music size={16} />
            <span>Tokyo Drift: {bgmOn ? 'ON' : 'OFF'}</span>
          </button>

          {canRebuy && (
            <button
              onClick={() => {
                onRebuy();
                onClose();
              }}
              className="btn-pill btn-pill-gold"
              style={{ gridColumn: 'span 2', justifyContent: 'center', padding: '10px' }}
            >
              <RefreshCw size={15} />
              <span>Ambil Modal dari Dompet</span>
            </button>
          )}

          {onReturnToLounge && (
            <button
              onClick={() => {
                onClose();
                onReturnToLounge();
              }}
              style={{
                gridColumn: 'span 2',
                padding: '11px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(180, 83, 9, 0.3))',
                border: '1px solid #f59e0b',
                color: '#fef08a',
                fontSize: '13px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Compass size={16} color="#f59e0b" />
              <span>Keluar Meja & Kembali ke Lounge 3D</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
