export function CampusMapPanel({ mapData, selectedBuilding, onSelectBuilding, statusFor, formatKg }) {
  return (
    <section className="panel map-panel">
      <div className="panel-head">
        <div>
          <p className="section-kicker">Campus view</p>
          <h2>Live campus map</h2>
        </div>
        <span className="legend"><b className="low" />Low <b className="mid" />Medium <b className="high" />High</span>
      </div>
      <div className="campus-map" role="list">
        {mapData.map((item) => (
          <button
            key={item.name}
            type="button"
            className={`building ${statusFor(item.carbon)} ${selectedBuilding === item.name ? 'active' : ''}`}
            onClick={() => onSelectBuilding(item.name)}
          >
            <span>{item.name}</span>
            <small>{item.type}</small>
            <strong>{formatKg(item.carbon)}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

export function BuildingDetailPanel({ selectedBuildingData, selectedBuilding, buildings, onSelectBuilding, formatNumber, formatKg }) {
  return (
    <section className="panel detail-panel">
      <div className="panel-head">
        <div>
          <p className="section-kicker">Selected building</p>
          <h2>Building detail</h2>
        </div>
        <select value={selectedBuilding} onChange={(event) => onSelectBuilding(event.target.value)}>
          {buildings.map((building) => (
            <option key={building.name} value={building.name}>{building.name}</option>
          ))}
        </select>
      </div>
      <div className="detail-list">
        <div>
          <span>Carbon</span>
          <strong>{formatKg(selectedBuildingData.carbon)}</strong>
        </div>
        <div>
          <span>Electricity</span>
          <strong>{formatNumber(selectedBuildingData.electricity, ' kWh')}</strong>
        </div>
        <div>
          <span>Water</span>
          <strong>{formatNumber(selectedBuildingData.water, ' L')}</strong>
        </div>
        <div>
          <span>Waste</span>
          <strong>{formatNumber(selectedBuildingData.waste, ' kg')}</strong>
        </div>
      </div>
    </section>
  );
}

export function RankingPanel({ topDepartment }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="section-kicker">Ranking</p>
          <h2>Department ranking</h2>
        </div>
        <span className="muted">Efficiency score</span>
      </div>
      <div className="ranking">
        {topDepartment.map((name, index) => (
          <div key={name} className="ranking-item">
            <span>{index + 1}. {name}</span>
            <strong>{100 - index * 6}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReportsPanel({ reportType, setReportType, onExport }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="section-kicker">Exports</p>
          <h2>Reports</h2>
        </div>
      </div>
      <label className="chat-label">
        Report type
        <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
          <option value="daily">Daily building report</option>
          <option value="weekly">Weekly summary report</option>
          <option value="monthly">Monthly ESG report</option>
          <option value="dataset">Synthetic IoT dataset sample</option>
        </select>
      </label>
      <button type="button" className="primary-button" onClick={onExport} style={{ width: '100%' }}>
        Export selected report
      </button>
      <p className="chat-answer">Exports include calculated carbon, resource usage and offsets for the selected scope.</p>
    </section>
  );
}