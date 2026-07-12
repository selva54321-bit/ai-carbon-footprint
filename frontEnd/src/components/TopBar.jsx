export default function TopBar({ selectedDay, daily, onDayChange }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-block">
          <p className="eyebrow">AI + IoT Sustainability Platform</p>
          <h1>Campus Carbon Footprint Dashboard</h1>
        </div>

        <div className="top-actions">
          <label style={{ display: 'grid', gap: 2 }}>
            <select value={selectedDay} onChange={(event) => onDayChange(Number(event.target.value))}>
              {daily.map((day) => (
                <option key={day.day} value={day.day}>{day.date}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}