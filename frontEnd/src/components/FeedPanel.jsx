export default function FeedPanel({ kicker, title, items }) {
  return (
    <section className="panel">
      <div className="panel-head compact-head">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="feed">
        {items.map((item) => (
          <article key={item.title} className="feed-item">
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
