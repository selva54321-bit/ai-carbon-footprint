import LineChart from './LineChart.jsx';

const trendOptions = ['carbon', 'electricity', 'water'];

export default function TrendPanel({ trend, setTrend, trendPoints, chartUnit }) {
  return (
    <section className="panel feature-panel">
      <div className="panel-head">
        <div>
          <p className="section-kicker">Performance</p>
          <h2>Energy and carbon trend</h2>
        </div>
        <div className="segmented" role="group" aria-label="Trend measure">
          {trendOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={trend === option ? 'active' : ''}
              onClick={() => setTrend(option)}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <LineChart points={trendPoints} valueKey={trend} unit={chartUnit} />
    </section>
  );
}
