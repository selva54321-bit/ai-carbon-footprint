import LineChart from './LineChart.jsx';

export default function ForecastPanel({ forecastPoints, formatKg, modelName }) {
  const forecastDetail = forecastPoints.length > 4 ? `Tomorrow is projected at ${formatKg(forecastPoints[4].carbon)} using the trained ${modelName || 'ML'} model.` : 'Forecast model warming up.';

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
