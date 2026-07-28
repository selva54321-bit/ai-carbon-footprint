import { useEffect, useMemo, useState } from 'react';
import { fetchDashboard, reportUrl } from './api.js';
import TopBar from './components/TopBar.jsx';
import StatusStrip from './components/StatusStrip.jsx';
import SummaryGrid from './components/SummaryGrid.jsx';
import TrendPanel from './components/TrendPanel.jsx';
import BreakdownPanel from './components/BreakdownPanel.jsx';
import ForecastPanel from './components/ForecastPanel.jsx';
import FeedPanel from './components/FeedPanel.jsx';
import SimulatorPanel from './components/SimulatorPanel.jsx';
import NextDayPredictionPanel from './components/NextDayPredictionPanel.jsx';
import {
  CampusMapPanel,
  BuildingDetailPanel,
  RankingPanel,
  ReportsPanel
} from './components/SidebarPanels.jsx';

function formatKg(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} t`;
  return `${Math.round(value)} kg`;
}

function formatNumber(value, suffix = '') {
  return `${Math.round(value || 0).toLocaleString()}${suffix}`;
}

function statusFor(value) {
  if (value > 1450) return 'high';
  if (value > 900) return 'mid';
  return 'low';
}

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [trend, setTrend] = useState('carbon');
  const [solarImpact, setSolarImpact] = useState(20);
  const [busAdoption, setBusAdoption] = useState(70);
  const [ledConversion, setLedConversion] = useState(50);
  const [reportType, setReportType] = useState('daily');
  const [question, setQuestion] = useState('top');
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError('');
    fetchDashboard({
      dayIndex: selectedDay,
      solar: solarImpact,
      bus: busAdoption,
      led: ledConversion
    })
      .then((payload) => {
        if (!isActive) return;
        setDashboard(payload);
        setSelectedDay(payload.selectedDay);
        if (!selectedBuilding) {
          setSelectedBuilding(payload.mapData[0]?.name || '');
        }
      })
      .catch((apiError) => {
        if (isActive) setError(apiError.message);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [selectedDay, solarImpact, busAdoption, ledConversion]);

  const selectedBuildingData = useMemo(() => {
    if (!dashboard?.mapData?.length) return null;
    return dashboard.mapData.find((item) => item.name === selectedBuilding) || dashboard.mapData[0];
  }, [dashboard, selectedBuilding]);

  if (error) {
    return (
      <div className="app-state">
        <h1>Backend connection failed</h1>
        <p>{error}</p>
        <p>Start the backend with <code>uvicorn main:app --reload</code> inside <code>backEnd</code>, then run the frontend.</p>
      </div>
    );
  }

  if (!dashboard || isLoading && !dashboard) {
    return (
      <div className="app-state">
        <h1>Loading campus carbon model...</h1>
        <p>Fetching dashboard data from the FastAPI backend.</p>
      </div>
    );
  }

  const trendPoints = dashboard.daily
    .slice(Math.max(0, dashboard.selectedDay - 29), dashboard.selectedDay + 1)
    .map((item) => ({ ...item, label: item.date.slice(5) }));
  const forecastPoints = [
    ...trendPoints.slice(-4),
    ...dashboard.forecast.map((item, index) => ({ ...item, label: `F${index + 1}` }))
  ];
  const chartUnit = trend === 'carbon' ? 'kg CO2e' : trend === 'electricity' ? 'kWh' : 'L';
  const summary = dashboard.summary;
  const summaryMetrics = [
    {
      label: 'Campus carbon today',
      value: formatKg(summary.carbon),
      detail: `${summary.change >= 0 ? '+' : ''}${summary.change.toFixed(1)}% vs previous day`,
      tone: summary.statusTone
    },
    {
      label: 'Predicted tomorrow',
      value: formatKg(summary.forecastCarbon),
      detail: 'Random Forest model output',
      tone: summary.forecastCarbon > summary.carbon ? 'alert' : 'positive'
    },
    {
      label: 'Solar offset today',
      value: formatKg(summary.solarOffset),
      detail: 'Grid CO2e avoided',
      tone: 'positive'
    },
    {
      label: 'Sustainability score',
      value: `${summary.score} / 100`,
      detail: `${summary.goalProgress}% of annual target`,
      tone: 'steady'
    }
  ];

  function downloadReport(type = reportType) {
    window.location.href = reportUrl(type, dashboard.selectedDay);
  }

  return (
    <div className="app-shell">
      <TopBar selectedDay={dashboard.selectedDay} daily={dashboard.daily} onDayChange={setSelectedDay} />

      <main className="layout">
        <StatusStrip
          statusTone={summary.statusTone}
          reportDate={dashboard.reportDate}
          topBuilding={summary.topBuilding}
          selectedBuildingName={selectedBuildingData?.name}
          score={summary.score}
          onDownload={() => downloadReport('daily')}
        />

        <SummaryGrid metrics={summaryMetrics} />

        <nav className="page-tabs" aria-label="Dashboard sections">
          <button type="button" className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            Overview
          </button>
          <button type="button" className={activeTab === 'prediction' ? 'active' : ''} onClick={() => setActiveTab('prediction')}>
            Next day prediction
          </button>
        </nav>

        {activeTab === 'overview' ? (
          <section className="dashboard-grid">
            <section className="main-column">
              <TrendPanel trend={trend} setTrend={setTrend} trendPoints={trendPoints} chartUnit={chartUnit} />
              <section className="panel-grid">
                <BreakdownPanel breakdown={dashboard.breakdown} formatKg={formatKg} />
                <ForecastPanel forecastPoints={forecastPoints} formatKg={formatKg} modelName={dashboard.model.name} />
              </section>
              <section className="panel-grid">
                <FeedPanel kicker="Detection" title="Anomaly detection" items={dashboard.anomalies} />
                <FeedPanel kicker="Guidance" title="AI recommendations" items={dashboard.recommendations} />
              </section>
              <SimulatorPanel
                solarImpact={solarImpact}
                busAdoption={busAdoption}
                ledConversion={ledConversion}
                onSolarChange={setSolarImpact}
                onBusChange={setBusAdoption}
                onLedChange={setLedConversion}
                simulator={dashboard.simulator}
              />
              <section className="panel-grid">
                <FeedPanel
                  kicker="Insights"
                  title="AI insights panel"
                  items={dashboard.insights.map((detail, index) => ({ title: `Insight ${index + 1}`, detail }))}
                />
                <section className="panel">
                  <div className="panel-head compact-head">
                    <div>
                      <p className="section-kicker">Assistant</p>
                      <h2>Ask campus AI</h2>
                    </div>
                  </div>
                  <label className="chat-label">
                    Question
                    <select value={question} onChange={(event) => setQuestion(event.target.value)}>
                      <option value="top">Which building emits the most today?</option>
                      <option value="why">Why did emissions change?</option>
                      <option value="waste">Show waste trend insight.</option>
                      <option value="next">Predict tomorrow's carbon footprint.</option>
                    </select>
                  </label>
                  <p className="chat-answer">{dashboard.chatAnswers[question]}</p>
                </section>
              </section>
            </section>

            <aside className="side-column">
              <CampusMapPanel
                mapData={dashboard.mapData}
                selectedBuilding={selectedBuildingData?.name}
                onSelectBuilding={setSelectedBuilding}
                statusFor={statusFor}
                formatKg={formatKg}
              />
              {selectedBuildingData && (
                <BuildingDetailPanel
                  selectedBuildingData={selectedBuildingData}
                  selectedBuilding={selectedBuildingData.name}
                  buildings={dashboard.buildings}
                  onSelectBuilding={setSelectedBuilding}
                  formatNumber={formatNumber}
                  formatKg={formatKg}
                />
              )}
              <RankingPanel ranking={dashboard.ranking} />
              <ReportsPanel reportType={reportType} setReportType={setReportType} onExport={() => downloadReport(reportType)} />
            </aside>
          </section>
        ) : (
          <NextDayPredictionPanel prediction={dashboard.nextDayPrediction} forecastPoints={forecastPoints} />
        )}
      </main>
    </div>
  );
}

export default App;
