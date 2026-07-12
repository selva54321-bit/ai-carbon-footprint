import LineChart from './LineChart.jsx';

export default function ForecastPanel({ forecastPoints, formatKg }) {
  const forecastDetail = forecastPoints.length > 4 ? `Tomorrow is projected at ${formatKg(forecastPoints[4].carbon)}, reflecting solar output and campus demand changes.` : 'Forecast model warming up.';

  return (
    <section className="panel">
      <div className="panel-head compact-head">
        <div>
          <p className="section-kicker">Forecasting</p>
          <h2>AI forecasting</h2>
        </div>
      </div>
      <LineChart points={forecastPoints} valueKey="carbon" unit="kg CO2e" forecast />
      <p className="insight-text">{forecastDetail}</p>
    </section>
  );
}
