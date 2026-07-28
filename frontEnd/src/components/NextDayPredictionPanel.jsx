import LineChart from './LineChart.jsx';

function formatKg(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} t`;
  return `${Math.round(value)} kg`;
}

function formatNumber(value, suffix = '') {
  return `${Math.round(value || 0).toLocaleString()}${suffix}`;
}

export default function NextDayPredictionPanel({ prediction, forecastPoints }) {
  const driverItems = prediction.drivers || [];
  const featureEntries = Object.entries(prediction.featureValues || {});
  const directionText = {
    increase: 'Expected to increase',
    decrease: 'Expected to decrease',
    stable: 'Expected to stay stable'
  }[prediction.direction] || 'Prediction ready';

  return (
    <section className="prediction-page">
      <section className="panel prediction-hero">
        <div>
          <p className="section-kicker">Model output</p>
          <h2>Next day carbon prediction</h2>
          <p className="prediction-copy">{prediction.explanation}</p>
        </div>
        <div className={`prediction-badge ${prediction.direction}`}>
          <span>{directionText}</span>
          <strong>{prediction.changePercent >= 0 ? '+' : ''}{prediction.changePercent}%</strong>
        </div>
      </section>

      <section className="prediction-metrics">
        <article className="metric metric-steady">
          <span>Selected date carbon</span>
          <strong>{formatKg(prediction.currentCarbon)}</strong>
          <small>{prediction.date}</small>
        </article>
        <article className={`metric ${prediction.direction === 'increase' ? 'metric-alert' : 'metric-positive'}`}>
          <span>Predicted next day</span>
          <strong>{formatKg(prediction.predictedCarbon)}</strong>
          <small>Target: {prediction.target}</small>
        </article>
        <article className="metric metric-steady">
          <span>Actual next day</span>
          <strong>{prediction.actualNextDayCarbon ? formatKg(prediction.actualNextDayCarbon) : 'N/A'}</strong>
          <small>Available for historical days</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="section-kicker">Forecast curve</p>
            <h2>Current day to predicted days</h2>
          </div>
        </div>
        <LineChart points={forecastPoints} valueKey="carbon" unit="kg CO2e" forecast />
      </section>

      <section className="panel-grid">
        <section className="panel">
          <div className="panel-head compact-head">
            <div>
              <p className="section-kicker">Input drivers</p>
              <h2>Important values sent to model</h2>
            </div>
          </div>
          <div className="prediction-driver-grid">
            {driverItems.map((item) => (
              <div key={item.label} className="driver-card">
                <span>{item.label}</span>
                <strong>{formatNumber(item.value, ` ${item.unit}`)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head compact-head">
            <div>
              <p className="section-kicker">Feature vector</p>
              <h2>Random Forest input columns</h2>
            </div>
          </div>
          <div className="feature-table">
            {featureEntries.map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>
    </section>
  );
}
