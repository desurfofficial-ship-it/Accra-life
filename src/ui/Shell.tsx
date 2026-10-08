/** Minimal HUD shell — dark glass + yellow accent (style from salvage). */
export function Shell() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(9,13,22,0.88)',
        border: '1px solid rgba(250,204,21,0.35)',
        fontSize: 13,
        lineHeight: 1.4,
        maxWidth: 280,
        pointerEvents: 'none',
      }}
    >
      <div style={{ color: '#facc15', fontWeight: 700 }}>Chalé Life</div>
      <div style={{ color: '#94a3b8', marginTop: 4 }}>
        Clean restart. Step 1 scaffold — Walk comes next.
      </div>
    </div>
  );
}
