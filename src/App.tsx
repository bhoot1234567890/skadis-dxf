
import { useState } from 'react';
import './App.css';

const DEFAULTS = {
  boardWidth: 30 * 25.4, // mm
  boardHeight: 22 * 25.4, // mm
  cornerRadius: 8, // mm
  // The following values are chosen to match IKEA SKÅDIS hole pattern
  holeWidth: 5, // mm (fixed)
  holeHeight: 15, // mm (fixed)
  holeRadius: 3, // mm (fixed)
  hSpacing: 20, // mm (fixed)
  vSpacing: 40, // mm (fixed)
  offsetTop: 40, // mm (fixed)
  offsetRight: 20, // mm (fixed)
};


function App() {
  const [params, setParams] = useState({ ...DEFAULTS });
  const [dxfUrl, setDxfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams((prev) => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleReset = () => {
    setParams({ ...DEFAULTS });
  };

  // Helper to draw a vertical capsule (rounded rectangle) as a closed LWPolyline analogue
  // matching the Python add_rounded_rectangle (180° arcs at top & bottom, straight sides).
  function drawCapsule(d: any, x: number, y: number, w: number, h: number, radius: number) {
    const { tan, PI } = Math;
    // radius is clamped in the Python version; we do the same here
    const r = Math.min(radius, w / 2, h / 2);

    // Tangent points for semicircles
    const topY = y + h / 2 - r;
    const botY = y - h / 2 + r;
    const leftX = x - r;
    const rightX = x + r;

    // Python uses bulge_180 = -tan(pi/4) for 180° arcs
    const bulge180 = -tan(PI / 4);

    // Order points CCW with per-segment bulge values, same as Python:
    // TL -> TR: top 180° arc (bulge=-1)
    // TR -> BR: right vertical (bulge=0)
    // BR -> BL: bottom 180° arc (bulge=-1)
    // BL -> TL: left vertical (bulge=0)
    const pts: [number, number, number][] = [
      [leftX, topY, bulge180],
      [rightX, topY, 0],
      [rightX, botY, bulge180],
      [leftX, botY, 0],
    ];

    // dxf-writer drawPolyline takes [x,y,bulge] tuples and a closed flag
    d.drawPolyline(pts as any, true);
  }

  const handleGenerate = async () => {
    setGenerating(true);
    setDxfUrl(null);
    try {
      const Drawing = (await import('dxf-writer')).default;
      const d = new Drawing();
      d.setUnits('Millimeters');
      d.addLayer('BOARD', Drawing.ACI.GREEN, 'CONTINUOUS');
      d.addLayer('HOLES', Drawing.ACI.RED, 'CONTINUOUS');
      d.setActiveLayer('BOARD');
      // Custom board outline polyline with 90° arcs at corners (bulge = tan(pi/8)), matching Python create_board_outline
      const { tan, PI } = Math;
      const r = params.cornerRadius;
      const bulge90 = tan(PI / 8);
      const w = params.boardWidth;
      const h = params.boardHeight;
      // Points: start at (w-r, h), then CCW
      const outlinePts: [number, number, number][] = [
        [w - r, h, 0],                 // top edge after top-right arc
        [r, h, bulge90],               // top-left corner arc
        [0, h - r, 0],
        [0, r, bulge90],               // bottom-left arc
        [r, 0, 0],
        [w - r, 0, bulge90],           // bottom-right arc
        [w, r, 0],
        [w, h - r, bulge90],           // top-right arc back to start
      ];
      d.drawPolyline(outlinePts as any, true);
      d.setActiveLayer('HOLES');
      const {
        boardWidth, boardHeight, holeWidth, holeHeight, holeRadius,
        hSpacing, vSpacing, offsetTop, offsetRight
      } = params;
      let col = 0;
      let x = boardWidth - offsetRight;
      while (x - holeWidth / 2 >= 0) {
        const yOffset = (col % 2) * (vSpacing / 2);
        let y = boardHeight - offsetTop - yOffset;
        while (y - holeHeight / 2 >= 0) {
          drawCapsule(d, x, y, holeWidth, holeHeight, holeRadius);
          y -= vSpacing;
        }
        col++;
        x -= hSpacing;
      }
      const dxfString = d.toDxfString();
      const blob = new Blob([dxfString], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      setDxfUrl(url);
    } catch (err) {
      alert('Failed to generate DXF: ' + (err instanceof Error ? err.message : err));
    }
    setGenerating(false);
  };

  // SVG Preview logic
  const previewSize = 400;
  const margin = 16;
  const {
    boardWidth, boardHeight,
    holeWidth, holeHeight, holeRadius,
    hSpacing, vSpacing, offsetTop, offsetRight
  } = params;
  // Fit board to preview area
  const scale = Math.min(
    (previewSize - 2 * margin) / boardWidth,
    (previewSize - 2 * margin) / boardHeight
  );
  const svgW = boardWidth * scale + 2 * margin;
  const svgH = boardHeight * scale + 2 * margin;

  // Generate holes for preview
  const holes: Array<{ x: number; y: number }> = [];
  let col = 0;
  let x = boardWidth - offsetRight;
  while (x - holeWidth / 2 >= 0) {
    const yOffset = (col % 2) * (vSpacing / 2);
    let y = boardHeight - offsetTop - yOffset;
    while (y - holeHeight / 2 >= 0) {
      holes.push({ x, y });
      y -= vSpacing;
    }
    col++;
    x -= hSpacing;
  }

  return (
    <div className="skadis-app">
      <h1>SKÅDIS DXF Generator</h1>
      <p className="subtitle">Parametric SKÅDIS-style pegboard generator – tweak dimensions, preview instantly, and export a clean DXF for laser cutting or CNC.</p>
      <form className="skadis-form" onSubmit={e => { e.preventDefault(); handleGenerate(); }}>
        <div className="form-section">
          <div className="form-section-title">Board</div>
          <div className="form-row">
            <label>
              Board Width (mm)
              <input type="number" name="boardWidth" value={params.boardWidth} onChange={handleChange} min={100} max={2000} step={0.1} required />
            </label>
            <label>
              Board Height (mm)
              <input type="number" name="boardHeight" value={params.boardHeight} onChange={handleChange} min={100} max={2000} step={0.1} required />
            </label>
            <label>
              Corner Radius (mm)
              <input type="number" name="cornerRadius" value={params.cornerRadius} onChange={handleChange} min={0} max={100} step={0.1} required />
              <span className="field-hint">Rounded board corners in DXF and preview</span>
            </label>
          </div>
        </div>
        <div className="form-section">
          <div className="form-section-title">SKÅDIS standard (locked)</div>
          <div className="form-row">
            <label>
              Hole Width
              <input type="number" value={DEFAULTS.holeWidth} disabled />
              <span className="field-hint">Fixed to match IKEA SKÅDIS slots</span>
            </label>
            <label>
              Hole Height
              <input type="number" value={DEFAULTS.holeHeight} disabled />
            </label>
            <label>
              Hole Corner Radius
              <input type="number" value={DEFAULTS.holeRadius} disabled />
            </label>
          </div>
          <div className="form-row">
            <label>
              Horizontal Spacing
              <input type="number" value={DEFAULTS.hSpacing} disabled />
              <span className="field-hint">Distance between columns (SKÅDIS grid)</span>
            </label>
            <label>
              Vertical Spacing
              <input type="number" value={DEFAULTS.vSpacing} disabled />
              <span className="field-hint">Distance between staggered rows</span>
            </label>
            <label>
              Top / Right Offsets
              <input
                type="text"
                value={`${DEFAULTS.offsetTop.toFixed(1)} mm / ${DEFAULTS.offsetRight.toFixed(1)} mm`}
                disabled
              />
            </label>
          </div>
        </div>
        <div className="form-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="reset-btn" onClick={handleReset} disabled={generating} style={{marginRight: '1em'}}>Reset to Defaults</button>
          <button type="submit" className="generate-btn" disabled={generating}>{generating ? 'Generating…' : 'Generate DXF'}</button>
        </div>
      </form>

      {/* SVG Preview */}
      <div style={{ margin: '2em 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2em', color: '#64748b', marginBottom: '0.5em' }}>Preview</h2>
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ background: '#f8fafc', borderRadius: '1em', boxShadow: '0 2px 8px #0001' }}
        >
          {/* Board outline */}
          <rect
            x={margin}
            y={margin}
            width={boardWidth * scale}
            height={boardHeight * scale}
            rx={params.cornerRadius * scale}
            ry={params.cornerRadius * scale}
            fill="#fff"
            stroke="#22d3ee"
            strokeWidth={2}
          />
          {/* Holes */}
          {holes.map(({ x, y }, i) => (
            <rect
              key={i}
              x={margin + (x - holeWidth / 2) * scale}
              y={margin + (y - holeHeight / 2) * scale}
              width={holeWidth * scale}
              height={holeHeight * scale}
              rx={holeRadius * scale}
              ry={holeRadius * scale}
              fill="#fbbf24"
              stroke="#f59e42"
              strokeWidth={1}
              opacity={0.85}
            />
          ))}
        </svg>
        <div style={{ color: '#222', fontSize: '0.98em', marginTop: '0.5em', fontWeight: 500 }}>
          Board: {Math.round(boardWidth)} × {Math.round(boardHeight)} mm, Holes: {holes.length}
        </div>
      </div>

      {dxfUrl && (
        <div className="download-row">
          <a href={dxfUrl} download="skadis_board.dxf" className="download-btn">Download DXF</a>
        </div>
      )}
      <footer>
        <p>
          CNC tip: when cutting the slots, use an
          {' '}<strong>outside</strong> or <strong>pocket</strong> toolpath for the holes, not
          {' '}<strong>on the line</strong>. This lets the CNC offset by the bit radius so the
          final holes match the intended size.
        </p>
        <p>
          Made with <span role="img" aria-label="love">❤️</span> using
          {' '}<a href="https://github.com/ognjen-petrovic/js-dxf" target="_blank" rel="noopener noreferrer">dxf-writer</a>.
        </p>
      </footer>
    </div>
  );
}

export default App;
