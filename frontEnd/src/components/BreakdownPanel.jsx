export default function BreakdownPanel({ breakdown, formatKg }) {
  const maxValue = Math.max(...breakdown.map((item) => item.value));

  return (
    <section className="panel">
      <div className="panel-head compact-head">
        <div>
          <p className="section-kicker">Breakdown</p>
          <h2>Carbon calculator</h2>
        </div>
      </div>

      <div className="stacked-bars">
        {breakdown.map((item) => (
          <div key={item.label} className="bar-row">
            <div className="bar-label">
              <span>{item.label}</span>
              <strong>{item.offset ? '-' : ''}{formatKg(item.value)}</strong>
            </div>
            <div className="bar-track">
              <div
                className={`bar-fill ${item.offset ? 'offset' : ''}`}
                style={{ width: `${Math.max(6, (item.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
