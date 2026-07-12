export default function SimulatorPanel({ solarImpact, busAdoption, ledConversion, onSolarChange, onBusChange, onLedChange, simulator }) {
  return (
    <section className="panel wide-panel">
      <div className="panel-head">
        <div>
          <p className="section-kicker">Scenario Planning</p>
          <h2>What-if simulator</h2>
        </div>
      </div>

      <div className="sim-layout">
        <div className="sim-grid">
          <label>
            Solar increase <strong>{solarImpact}%</strong>
            <input type="range" min="0" max="60" value={solarImpact} onChange={(event) => onSolarChange(Number(event.target.value))} />
          </label>
          <label>
            Bus adoption <strong>{busAdoption}%</strong>
            <input type="range" min="20" max="95" value={busAdoption} onChange={(event) => onBusChange(Number(event.target.value))} />
          </label>
          <label>
            LED conversion <strong>{ledConversion}%</strong>
            <input type="range" min="0" max="100" value={ledConversion} onChange={(event) => onLedChange(Number(event.target.value))} />
          </label>
        </div>
        <div className="sim-result">
          <p>{simulator.savings}</p>
          <small>{simulator.summary}</small>
        </div>
      </div>
    </section>
  );
}
