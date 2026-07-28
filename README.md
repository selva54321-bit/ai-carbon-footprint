# Campus Carbon AI Prototype

This is a full-stack prototype for an AI-powered campus carbon footprint monitoring system. The backend loads the trained Random Forest model from `backEnd/modelTraining/RandomForest_best_model.pkl` and serves dashboard data to the React frontend.

## Run

Backend:

```bash
cd backEnd
uvicorn main:app --reload
```

Frontend:

```bash
cd frontEnd
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Included Features

- FastAPI backend with trained Random Forest inference.
- Three-year campus dataset loaded from `bit_sathy_carbon_daily_3yr.csv`.
- Synthetic building-level allocation derived from real daily campus totals.
- Carbon calculation using electricity, water, diesel, LPG, waste, solar offset and tree offset factors.
- Executive dashboard with today's emissions, forecast, solar offset and sustainability score.
- Live campus building map with low, medium and high emission status.
- Trend charts for carbon, electricity and water.
- Random Forest forecasting for the next seven days.
- Dedicated next-day prediction tab showing the model target, prediction, actual next-day value when available, driver values, and feature vector.
- Anomaly detection for unusual electricity, water and waste spikes.
- Recommendations with estimated carbon and cost impact.
- Transport, waste and water operational indicators.
- Department efficiency ranking.
- What-if simulator for solar, bus adoption and LED conversion.
- AI insights panel and a question selector that answers common administrator questions.
- Daily, weekly, monthly ESG and synthetic dataset CSV report exports.

## Prototype Scope

The app uses real trained-model inference for daily campus prediction and realistic building allocation for dashboard presentation. It is designed to show what the platform can become once the college provides actual meter, transport, waste and water data.
