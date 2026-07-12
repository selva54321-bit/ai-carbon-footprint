import { useMemo, useState } from 'react';
import {
  buildings,
  generateData,
  getRowsForDay,
  groupDaily,
  groupByBuilding,
  statusFor,
  forecastNextDays,
  formatKg,
  formatNumber,
  getBreakdown,
  getAnomalies,
  getRecommendations,
  getSimulatorInsights
} from './data.js';
import TopBar from './components/TopBar.jsx';
import StatusStrip from './components/StatusStrip.jsx';
import SummaryGrid from './components/SummaryGrid.jsx';
import TrendPanel from './components/TrendPanel.jsx';
import BreakdownPanel from './components/BreakdownPanel.jsx';
import ForecastPanel from './components/ForecastPanel.jsx';
import FeedPanel from './components/FeedPanel.jsx';
import SimulatorPanel from './components/SimulatorPanel.jsx';
import {
  CampusMapPanel,
  BuildingDetailPanel,
  RankingPanel,
  ReportsPanel
} from './components/SidebarPanels.jsx';

function sum(rows, key) {
  return rows.reduce((value, row) => value + (row[key] || 0), 0);
}

function App() {
  const data = useMemo(() => generateData(45), []);
  const daily = useMemo(() => groupDaily(data), [data]);
  const [selectedDay, setSelectedDay] = useState(44);
  const [selectedBuilding, setSelectedBuilding] = useState(buildings[0].name);
  const [trend, setTrend] = useState('carbon');
  const [solarImpact, setSolarImpact] = useState(20);
  const [busAdoption, setBusAdoption] = useState(70);
  const [ledConversion, setLedConversion] = useState(50);
  const [reportType, setReportType] = useState('daily');

  const dayRows = useMemo(() => getRowsForDay(data, selectedDay), [data, selectedDay]);
  const yesterdayRows = useMemo(() => getRowsForDay(data, Math.max(0, selectedDay - 1)), [data, selectedDay]);
  const mapData = useMemo(() => groupByBuilding(dayRows), [dayRows]);
  const selectedBuildingData = mapData.find((item) => item.name === selectedBuilding) || mapData[0];
  const forecast = useMemo(() => forecastNextDays(daily, selectedDay, 7), [daily, selectedDay]);
  const trendPoints = daily.slice(Math.max(0, selectedDay - 29), selectedDay + 1).map((item) => ({ ...item, label: item.date.slice(5) }));
  const forecastPoints = [...trendPoints.slice(-4), ...forecast.map((item, index) => ({ ...item, label: `F${index + 1}` }))];
  const breakdown = useMemo(() => getBreakdown(dayRows), [dayRows]);
  const anomalies = useMemo(() => getAnomalies(dayRows), [dayRows]);
  const recommendations = useMemo(() => getRecommendations(dayRows), [dayRows]);
  const simulator = useMemo(() => getSimulatorInsights(solarImpact, busAdoption, ledConversion), [solarImpact, busAdoption, ledConversion]);

  const carbon = sum(dayRows, 'carbon');
  const yesterdayCarbon = sum(yesterdayRows, 'carbon') || carbon;
  const change = ((carbon - yesterdayCarbon) / Math.max(1, yesterdayCarbon)) * 100;
  const solarOffsetValue = sum(dayRows, 'solar') * 0.82;
  const forecastCarbonValue = forecast[0]?.carbon || carbon;
  const score = Math.max(45, Math.min(98, 100 - carbon / 36000 * 28 + solarOffsetValue / 1000 * 2));
  const goalProgress = Math.round((carbon * 30 / 100000) * 100);
  const rankedBuildings = mapData.slice().sort((a, b) => b.carbon - a.carbon);
  const topDepartment = rankedBuildings.map((item) => item.name).slice(0, 5);
  const topBuilding = rankedBuildings[0];
  const chartUnit = trend === 'carbon' ? 'kg CO2e' : trend === 'electricity' ? 'kWh' : 'L';
  const statusTone = change > 3 ? 'alert' : change < -2 ? 'positive' : 'steady';
  const reportDate = daily[selectedDay]?.date;

  const summaryMetrics = [
    {
      label: 'Campus carbon today',
      value: formatKg(carbon),
      detail: `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs yesterday`,
      tone: statusTone
    },
    {
      label: 'Predicted tomorrow',
      value: formatKg(forecastCarbonValue),
      detail: forecastCarbonValue > carbon ? 'Higher cooling load forecast' : 'Solar and lower evening demand',
      tone: forecastCarbonValue > carbon ? 'alert' : 'positive'
    },
    {
      label: 'Solar offset today',
      value: formatKg(solarOffsetValue),
      detail: 'Grid CO2e avoided',
      tone: 'positive'
    },
    {
      label: 'Sustainability score',
      value: `${Math.round(score)} / 100`,
      detail: `${goalProgress}% of annual target`,
      tone: 'steady'
    }
  ];

  return (
    <div className="app-shell">
      <TopBar selectedDay={selectedDay} daily={daily} onDayChange={setSelectedDay} />

      <main className="layout">
        <StatusStrip
          statusTone={statusTone}
          reportDate={reportDate}
          topBuilding={topBuilding?.name}
          selectedBuildingName={selectedBuildingData?.name}
          score={Math.round(score)}
          onDownload={() => alert('Report export is ready in the next release')}
        />

        <SummaryGrid metrics={summaryMetrics} />

        <section className="dashboard-grid">
          <section className="main-column">
            <TrendPanel trend={trend} setTrend={setTrend} trendPoints={trendPoints} chartUnit={chartUnit} />
            <section className="panel-grid">
              <BreakdownPanel breakdown={breakdown} formatKg={formatKg} />
              <ForecastPanel forecastPoints={forecastPoints} formatKg={formatKg} />
            </section>
            <section className="panel-grid">
              <FeedPanel kicker="Detection" title="Anomaly detection" items={anomalies} />
              <FeedPanel kicker="Guidance" title="AI recommendations" items={recommendations} />
            </section>
            <SimulatorPanel
              solarImpact={solarImpact}
              busAdoption={busAdoption}
              ledConversion={ledConversion}
              onSolarChange={setSolarImpact}
              onBusChange={setBusAdoption}
              onLedChange={setLedConversion}
              simulator={simulator}
            />
          </section>

          <aside className="side-column">
            <CampusMapPanel
              mapData={mapData}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={setSelectedBuilding}
              statusFor={statusFor}
              formatKg={formatKg}
            />
            <BuildingDetailPanel
              selectedBuildingData={selectedBuildingData}
              selectedBuilding={selectedBuilding}
              buildings={buildings}
              onSelectBuilding={setSelectedBuilding}
              formatNumber={formatNumber}
              formatKg={formatKg}
            />
            <RankingPanel topDepartment={topDepartment} />
            <ReportsPanel reportType={reportType} setReportType={setReportType} onExport={() => alert(`Exporting ${reportType} report soon...`)} />
          </aside>
        </section>
      </main>
    </div>
  );
}

export default App;