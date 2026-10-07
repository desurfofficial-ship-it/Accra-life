/**
 * TroTroPrompt.tsx — GTA-style tro-tro interaction prompt overlay
 *
 * A clean, semi-transparent black box with white text and a yellow accent.
 * Renders when the player's active interaction target is a Tro-tro stop.
 *
 * Props:
 *   fare          — the tro-tro fare in GHS
 *   playerBalance — the player's current cash balance
 *   visible       — whether to show the prompt (default: true)
 *
 * Renders:
 *   '[E] Board Tro-tro to Circle | Fare: ₵{fare} | Balance: ₵{playerBalance}'
 *
 * If balance < fare, the balance turns red. Otherwise green.
 */

import { type CSSProperties } from 'react';

export interface TroTroPromptProps {
  fare: number;
  playerBalance: number;
  visible?: boolean;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  bottom: '92px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  gap: '0',
  background: 'rgba(8, 8, 8, 0.9)',
  border: '1.5px solid #facc15',
  padding: '10px 18px',
  borderRadius: '4px',
  fontFamily: 'Arial Narrow, Arial, sans-serif',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#f0f0f0',
  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
  pointerEvents: 'none',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  animation: 'trotprompt-in 0.2s ease-out',
};

const keyBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '22px',
  height: '22px',
  background: '#facc15',
  color: '#0a0a0a',
  borderRadius: '3px',
  fontSize: '0.75rem',
  fontWeight: 900,
  marginRight: '8px',
};

const separatorStyle: CSSProperties = {
  color: '#64748b',
  margin: '0 8px',
};

export function TroTroPrompt({ fare, playerBalance, visible = true }: TroTroPromptProps) {
  if (!visible) return null;

  const canAfford = playerBalance >= fare;
  const balanceColor = canAfford ? '#22c55e' : '#ef4444';

  return (
    <div style={overlayStyle}>
      {/* [E] key badge */}
      <span style={keyBadgeStyle}>E</span>

      {/* Board prompt */}
      <span>Board Tro-tro to Circle</span>

      <span style={separatorStyle}>|</span>

      {/* Fare */}
      <span style={{ color: '#facc15' }}>Fare: ₵{fare}</span>

      <span style={separatorStyle}>|</span>

      {/* Balance — green if affordable, red if not */}
      <span style={{ color: balanceColor, fontWeight: 800 }}>
        Balance: ₵{playerBalance}
      </span>

      {/* Inline CSS for the entry animation */}
      <style>{`
        @keyframes trotprompt-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
