export default function SummaryGrid({ metrics }) {
  return (
    <section className="summary-grid">
      {metrics.map((metric) => (
        <article key={metric.label} className={`metric metric-${metric.tone}`}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.detail}</small>
        </article>
      ))}
    </section>
  );
}
