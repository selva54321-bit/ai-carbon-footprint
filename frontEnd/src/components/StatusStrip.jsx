export default function StatusStrip({ statusTone, reportDate, topBuilding, selectedBuildingName, score, onDownload }) {
  const statusLabel = {
    alert: 'Carbon pressure elevated',
    positive: 'Trend improving',
    steady: 'Trend stable'
  }[statusTone];

  return (
    <section className="status-strip">
      <div className="status-strip-left">
        <span className={`status-pill ${statusTone}`}>{statusLabel}</span>
        <span className="status-strip-date">Reporting for {reportDate}</span>
      </div>

      <div className="status-strip-right">
        <div className="status-stat">
          <span>Top emitter</span>
          <strong>{topBuilding || 'N/A'}</strong>
        </div>
        <div className="status-stat">
          <span>Focus building</span>
          <strong>{selectedBuildingName || 'N/A'}</strong>
        </div>
        <div className="status-stat">
          <span>Sustainability score</span>
          <strong>{score} / 100</strong>
        </div>
        <button type="button" className="primary-button" onClick={onDownload}>
          Download report
        </button>
      </div>
    </section>
  );
}