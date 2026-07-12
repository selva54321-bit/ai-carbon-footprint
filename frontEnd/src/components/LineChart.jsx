export default function LineChart({ points, valueKey, unit, forecast }) {
  const width = 720;
  const height = 260;
  const pad = { left: 42, right: 28, top: 24, bottom: 44 };
  const values = points.map((point) => point[valueKey]);
  const min = Math.min(...values) * 0.94;
  const max = Math.max(...values) * 1.06;

  const x = (index) => pad.left + (index / Math.max(1, points.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => height - pad.bottom - ((value - min) / Math.max(1, max - min)) * (height - pad.top - pad.bottom);
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(point[valueKey]).toFixed(1)}`).join(' ');

  // Figure out how many labels can fit without overlapping.
  // Each label needs roughly 46px of horizontal room at this font size.
  const plotWidth = width - pad.left - pad.right;
  const minLabelSpacing = 46;
  const maxLabels = Math.max(2, Math.floor(plotWidth / minLabelSpacing));
  const step = Math.max(1, Math.ceil(points.length / maxLabels));

  const labelIndices = points
    .map((_, index) => index)
    .filter((index) => index % step === 0 || index === points.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label={`Line chart for ${valueKey}`}>
      <line className="axis" x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} />
      <line className="axis" x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} />
      <text x={pad.left} y={18} className="chart-label">{unit}</text>

      {labelIndices.map((index) => {
        const point = points[index];
        const labelText = point.label || point.date || `D${point.day}`;
        return (
          <text
            key={`label-${index}`}
            x={x(index)}
            y={height - pad.bottom + 16}
            textAnchor="end"
            transform={`rotate(-40 ${x(index)} ${height - pad.bottom + 16})`}
            className="chart-axis-label"
          >
            {labelText}
          </text>
        );
      })}

      <path className={`series ${forecast ? 'forecast' : ''}`} d={path} />
      {points.map((point, index) => (
        <circle
          key={`dot-${index}`}
          className={forecast ? 'forecast-point' : 'point'}
          cx={x(index)}
          cy={y(point[valueKey])}
          r={3.5}
        >
          <title>{`${point.label || point.date}: ${Math.round(point[valueKey])} ${unit}`}</title>
        </circle>
      ))}

      <text x={width - pad.right} y={Math.max(18, y(points.at(-1)[valueKey]) - 10)} textAnchor="end" className="chart-value">
        {Math.round(points.at(-1)[valueKey]).toLocaleString()}
      </text>
    </svg>
  );
}