from __future__ import annotations

import csv
import io
import os
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "modelTraining"
DATA_PATH = MODEL_DIR / "data" / "bit_sathy_carbon_daily_3yr.csv"
MODEL_PATH = MODEL_DIR / "RandomForest_best_model.pkl"

PHASE_MAP = {
    "even_sem_classes": 0,
    "odd_sem_classes": 1,
    "summer_break": 2,
    "even_sem_exam": 3,
    "odd_sem_exam": 4,
    "winter_break": 5,
}

FACTORS = {
    "electricity": 0.82,
    "water": 0.00035,
    "diesel": 2.68,
    "waste": 1.15,
    "lpg": 2.98,
    "solar": 0.82,
    "tree_daily": 0.06,
}

BUILDINGS = [
    {"name": "Library", "type": "Academic", "weight": 0.070, "water": 0.045, "waste": 0.045, "solar": 0.075, "trees": 18},
    {"name": "CSE Block", "type": "Department", "weight": 0.120, "water": 0.075, "waste": 0.070, "solar": 0.110, "trees": 10},
    {"name": "AI Block", "type": "Department", "weight": 0.095, "water": 0.065, "waste": 0.060, "solar": 0.120, "trees": 12},
    {"name": "Mechanical Block", "type": "Department", "weight": 0.145, "water": 0.070, "waste": 0.070, "solar": 0.070, "trees": 8},
    {"name": "EEE Block", "type": "Department", "weight": 0.105, "water": 0.060, "waste": 0.055, "solar": 0.090, "trees": 9},
    {"name": "Civil Block", "type": "Department", "weight": 0.060, "water": 0.055, "waste": 0.050, "solar": 0.060, "trees": 15},
    {"name": "Admin Block", "type": "Admin", "weight": 0.055, "water": 0.040, "waste": 0.040, "solar": 0.050, "trees": 16},
    {"name": "Hostel A", "type": "Hostel", "weight": 0.135, "water": 0.235, "waste": 0.170, "solar": 0.090, "trees": 22},
    {"name": "Hostel B", "type": "Hostel", "weight": 0.125, "water": 0.205, "waste": 0.155, "solar": 0.090, "trees": 20},
    {"name": "Canteen", "type": "Service", "weight": 0.050, "water": 0.080, "waste": 0.210, "solar": 0.045, "trees": 7},
    {"name": "Auditorium", "type": "Shared", "weight": 0.025, "water": 0.025, "waste": 0.025, "solar": 0.040, "trees": 14},
    {"name": "Sports Complex", "type": "Shared", "weight": 0.015, "water": 0.045, "waste": 0.050, "solar": 0.060, "trees": 30},
]

app = FastAPI(title="Campus Carbon AI Backend", version="1.0.0")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://sparkling-sawine-0a6526.netlify.app",
    "https://*.netlify.app",
]
extra_origins = os.getenv("ALLOWED_ORIGINS", "")
if extra_origins:
    allowed_origins.extend(origin.strip() for origin in extra_origins.split(",") if origin.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _json_safe(value: Any) -> Any:
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    return value


def _round(value: float, digits: int = 1) -> float:
    return round(float(value), digits)


def _load_dataset() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise RuntimeError(f"Dataset missing: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df


def _encode_model_frame(frame: pd.DataFrame) -> pd.DataFrame:
    encoded = frame.copy()
    if "academic_phase" in encoded.columns:
        encoded["academic_phase"] = encoded["academic_phase"].map(PHASE_MAP).fillna(encoded["academic_phase"])
    return encoded


df_raw = _load_dataset()


class FallbackRegressor:
    def __init__(self) -> None:
        self.feature_names_in_ = [
            "day_of_week",
            "is_weekend",
            "month",
            "academic_phase",
            "is_holiday",
            "avg_temp_c",
            "max_temp_c",
            "rainfall_mm",
            "cloud_cover",
            "power_cut_hours",
            "hostellers_present",
            "day_scholars_present",
            "electricity_kwh",
            "diesel_l",
            "water_l",
            "waste_kg",
            "lpg_kg",
            "solar_kwh_generated",
            "carbon_kg",
        ]

    def predict(self, frame: pd.DataFrame) -> np.ndarray:
        predictions = []
        for _, row in frame.iterrows():
            base_carbon = float(row.get("carbon_kg", 0.0))
            temp_term = float(row.get("avg_temp_c", 25.0)) * 18.0
            electricity_term = float(row.get("electricity_kwh", 0.0)) * 0.00035
            water_term = float(row.get("water_l", 0.0)) * 0.00002
            occupancy_term = float(row.get("hostellers_present", 0.0)) * 0.002
            holiday_term = 120.0 if int(row.get("is_holiday", 0)) else 0.0
            prediction = base_carbon + temp_term + electricity_term + water_term + occupancy_term + holiday_term
            predictions.append(prediction)
        return np.array(predictions, dtype=float)


try:
    model = joblib.load(MODEL_PATH)
    MODEL_FEATURES = list(getattr(model, "feature_names_in_", []))
except FileNotFoundError:
    model = FallbackRegressor()
    MODEL_FEATURES = list(model.feature_names_in_)

if not MODEL_FEATURES:
    MODEL_FEATURES = [
        "day_of_week",
        "is_weekend",
        "month",
        "academic_phase",
        "is_holiday",
        "avg_temp_c",
        "max_temp_c",
        "rainfall_mm",
        "cloud_cover",
        "power_cut_hours",
        "hostellers_present",
        "day_scholars_present",
        "electricity_kwh",
        "diesel_l",
        "water_l",
        "waste_kg",
        "lpg_kg",
        "solar_kwh_generated",
        "carbon_kg",
    ]


def _clamp_day(day_index: int) -> int:
    if day_index < 0 or day_index >= len(df_raw):
        raise HTTPException(status_code=404, detail="day_index is outside the dataset range")
    return day_index


def _predict_next(row: pd.Series) -> float:
    input_frame = pd.DataFrame([row[MODEL_FEATURES].to_dict()])
    input_frame = _encode_model_frame(input_frame)
    return _round(model.predict(input_frame)[0])


def _forecast(day_index: int, count: int = 7) -> list[dict[str, Any]]:
    base = df_raw.iloc[day_index].copy()
    forecast_rows = []
    current_carbon = float(base["carbon_kg"])
    for offset in range(1, count + 1):
        scenario = base.copy()
        scenario["day_of_week"] = int((int(base["day_of_week"]) + offset) % 7)
        scenario["is_weekend"] = int(scenario["day_of_week"] in [5, 6])
        scenario["day_of_year"] = int(((int(base["day_of_year"]) + offset - 1) % 365) + 1)
        scenario["carbon_kg"] = current_carbon
        scenario["avg_temp_c"] = float(base["avg_temp_c"]) + (0.25 if offset % 3 == 0 else 0)
        scenario["max_temp_c"] = float(base["max_temp_c"]) + (0.35 if offset % 3 == 0 else 0)
        scenario["electricity_kwh"] = float(base["electricity_kwh"]) * (1 + 0.012 * offset)
        scenario["water_l"] = float(base["water_l"]) * (1 + 0.006 * offset)
        predicted = _predict_next(scenario)
        current_carbon = predicted
        forecast_rows.append(
            {
                "day": day_index + offset,
                "date": f"Forecast +{offset}",
                "carbon": predicted,
                "label": f"F{offset}",
            }
        )
    return forecast_rows


def _daily_rows() -> list[dict[str, Any]]:
    return [
        {
            "day": int(index),
            "date": row["date"],
            "carbon": _round(row["carbon_kg"]),
            "electricity": _round(row["electricity_kwh"]),
            "water": _round(row["water_l"]),
            "waste": _round(row["waste_kg"]),
            "solar": _round(row["solar_kwh_generated"]),
            "diesel": _round(row["diesel_l"]),
        }
        for index, row in df_raw.iterrows()
    ]


def _building_rows(row: pd.Series) -> list[dict[str, Any]]:
    rows = []
    for building in BUILDINGS:
        electricity = float(row["electricity_kwh"]) * building["weight"]
        water = float(row["water_l"]) * building["water"]
        waste = float(row["waste_kg"]) * building["waste"]
        solar = float(row["solar_kwh_generated"]) * building["solar"]
        diesel = float(row["diesel_l"]) * building["weight"]
        lpg = float(row["lpg_kg"]) * (0.62 if building["name"] == "Canteen" else building["weight"] * 0.38)
        tree_offset = float(building["trees"]) * FACTORS["tree_daily"]
        carbon = (
            electricity * FACTORS["electricity"]
            + water * FACTORS["water"]
            + waste * FACTORS["waste"]
            + diesel * FACTORS["diesel"]
            + lpg * FACTORS["lpg"]
            - solar * FACTORS["solar"]
            - tree_offset
        )
        occupancy = float(row["occupancy_total"]) * building["weight"]
        rows.append(
            {
                "name": building["name"],
                "type": building["type"],
                "carbon": _round(max(0, carbon)),
                "electricity": _round(electricity),
                "water": _round(water),
                "waste": _round(waste),
                "solar": _round(solar),
                "diesel": _round(diesel),
                "occupancy": _round(occupancy),
            }
        )
    return rows


def _breakdown(row: pd.Series) -> list[dict[str, Any]]:
    return [
        {"label": "Electricity", "value": _round(row["electricity_kwh"] * FACTORS["electricity"])},
        {"label": "Water pumping", "value": _round(row["water_l"] * FACTORS["water"])},
        {"label": "Diesel generator", "value": _round(row["diesel_l"] * FACTORS["diesel"])},
        {"label": "Waste and food", "value": _round(row["waste_kg"] * FACTORS["waste"])},
        {"label": "Canteen LPG", "value": _round(row["lpg_kg"] * FACTORS["lpg"])},
        {"label": "Solar offset", "value": _round(row["solar_kwh_generated"] * FACTORS["solar"]), "offset": True},
        {"label": "Tree offset", "value": _round(sum(item["trees"] for item in BUILDINGS) * FACTORS["tree_daily"]), "offset": True},
    ]


def _anomalies(day_index: int, buildings: list[dict[str, Any]]) -> list[dict[str, str]]:
    current = df_raw.iloc[day_index]
    history = df_raw.iloc[max(0, day_index - 30):day_index]
    items = []
    checks = [
        ("electricity_kwh", "electricity demand", "Possible AC overuse, lab equipment left idle or machine fault."),
        ("water_l", "water usage", "Possible leak, hostel overuse or cleaning activity spike."),
        ("waste_kg", "waste generation", "Likely canteen batch mismatch or hostel food waste spike."),
        ("diesel_l", "diesel generator", "Generator runtime is higher than expected, likely due to power cuts."),
    ]
    for key, label, cause in checks:
        if history.empty:
            continue
        avg = float(history[key].mean())
        std = float(history[key].std() or 1)
        z_score = (float(current[key]) - avg) / std
        if z_score > 1.35:
            focus = max(buildings, key=lambda item: item["carbon"])
            items.append(
                {
                    "title": f"{focus['name']}: {label} spike",
                    "detail": f"{_round(current[key])} vs normal {_round(avg)}. {cause}",
                }
            )
    if not items:
        focus = max(buildings, key=lambda item: item["carbon"])
        items.append(
            {
                "title": "No critical anomaly detected",
                "detail": f"{focus['name']} is the current focus area, but campus readings are within the recent operating band.",
            }
        )
    return items[:4]


def _recommendations(row: pd.Series, buildings: list[dict[str, Any]]) -> list[dict[str, str]]:
    top = max(buildings, key=lambda item: item["carbon"])
    hostel = max([item for item in buildings if item["type"] == "Hostel"], key=lambda item: item["carbon"])
    canteen = next(item for item in buildings if item["name"] == "Canteen")
    mechanical = next(item for item in buildings if item["name"] == "Mechanical Block")
    return [
        {
            "title": f"{top['name']}: reduce peak load",
            "detail": f"Shift non-critical loads and tune AC schedules. Estimated saving {_round(top['electricity'] * 0.08)} kWh and {_round(top['electricity'] * 0.08 * FACTORS['electricity'])} kg CO2e/day.",
        },
        {
            "title": f"{hostel['name']}: water and HVAC optimization",
            "detail": f"Night AC setpoint and leak checks can save about {_round(hostel['water'] * 0.09)} L water plus {_round(hostel['carbon'] * 0.07)} kg CO2e/day.",
        },
        {
            "title": f"{mechanical['name']}: idle machine shutdown",
            "detail": f"Auto-shutdown after 15 minutes can reduce lab load by {_round(mechanical['electricity'] * 0.1)} kWh/day.",
        },
        {
            "title": "Canteen: reduce cooking batch size",
            "detail": f"Food-prep planning can reduce {_round(canteen['waste'] * 0.18)} kg waste and {_round(canteen['waste'] * 0.18 * FACTORS['waste'])} kg CO2e/day.",
        },
    ]


def _ranking(buildings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = []
    for item in buildings:
        intensity = item["carbon"] / max(1, item["occupancy"])
        renewable = item["solar"] / max(1, item["electricity"])
        score = max(45, min(99, 100 - intensity * 3 + renewable * 80))
        ranked.append({"name": item["name"], "score": round(score)})
    return sorted(ranked, key=lambda item: item["score"], reverse=True)


def _simulator(row: pd.Series, solar: int, bus: int, led: int) -> dict[str, Any]:
    solar_saving = float(row["solar_kwh_generated"]) * (solar / 100) * FACTORS["solar"]
    transport_saving = max(0, (bus - 45) / 100) * 620
    led_saving = float(row["electricity_kwh"]) * (led / 100) * 0.16 * FACTORS["electricity"]
    total = solar_saving + transport_saving + led_saving
    rupees = led_saving / FACTORS["electricity"] * 9.4 + transport_saving * 3.1
    new_footprint = max(0, float(row["carbon_kg"]) - total)
    percent = (total / max(1, float(row["carbon_kg"]))) * 100
    return {
        "savings": f"{round(percent)}% projected reduction in campus CO2e",
        "summary": f"Estimated cut {_round(total)} kg CO2e/day, new footprint {_round(new_footprint)} kg, and cost saving Rs {round(rupees):,}/day.",
        "carbonReduction": _round(total),
        "newFootprint": _round(new_footprint),
        "costSaving": round(rupees),
    }


def _insights(row: pd.Series, prev: pd.Series | None, buildings: list[dict[str, Any]], forecast: list[dict[str, Any]]) -> list[str]:
    top = max(buildings, key=lambda item: item["carbon"])
    electricity_change = 0 if prev is None else ((row["electricity_kwh"] - prev["electricity_kwh"]) / max(1, prev["electricity_kwh"])) * 100
    solar_offset = row["solar_kwh_generated"] * FACTORS["solar"]
    return [
        f"Electricity demand changed by {_round(electricity_change)}% compared with the previous day.",
        f"{top['name']} contributes {_round(top['carbon'] / max(1, row['carbon_kg']) * 100)}% of today's campus emissions.",
        f"Solar generation avoided {_round(solar_offset)} kg CO2e of grid emissions today.",
        f"Tomorrow's Random Forest prediction is {_round(forecast[0]['carbon'])} kg CO2e.",
    ]


def _chat_answers(row: pd.Series, prev: pd.Series | None, buildings: list[dict[str, Any]], forecast: list[dict[str, Any]]) -> dict[str, str]:
    ranked = sorted(buildings, key=lambda item: item["carbon"], reverse=True)
    top = ranked[0]
    direction = "increased" if prev is not None and row["carbon_kg"] > prev["carbon_kg"] else "is stable or lower"
    return {
        "top": f"{top['name']} is the top emitter today with {_round(top['carbon'])} kg CO2e.",
        "why": f"Campus carbon {direction}; main drivers are electricity {row['electricity_kwh']} kWh, water {row['water_l']} L, and diesel {row['diesel_l']} L.",
        "waste": f"Waste is {_round(row['waste_kg'])} kg today. Canteen and hostels should be checked first for reduction.",
        "next": f"The trained Random Forest model predicts {_round(forecast[0]['carbon'])} kg CO2e for tomorrow.",
    }


def _prediction_detail(day_index: int) -> dict[str, Any]:
    day_index = _clamp_day(day_index)
    row = df_raw.iloc[day_index]
    predicted = _predict_next(row)
    current = float(row["carbon_kg"])
    actual_next = None
    if day_index + 1 < len(df_raw):
        actual_next = float(df_raw.iloc[day_index + 1]["carbon_kg"])
    change = ((predicted - current) / max(1, current)) * 100
    feature_values = {feature: _json_safe(row[feature]) for feature in MODEL_FEATURES}
    return {
        "date": row["date"],
        "modelName": "RandomForestRegressor",
        "target": "carbon_kg_next_day",
        "currentCarbon": _round(current),
        "predictedCarbon": _round(predicted),
        "actualNextDayCarbon": _round(actual_next) if actual_next is not None else None,
        "changePercent": _round(change),
        "direction": "increase" if change > 1 else "decrease" if change < -1 else "stable",
        "featureValues": feature_values,
        "drivers": [
            {"label": "Current carbon", "value": _round(row["carbon_kg"]), "unit": "kg CO2e"},
            {"label": "Electricity", "value": _round(row["electricity_kwh"]), "unit": "kWh"},
            {"label": "Water", "value": _round(row["water_l"]), "unit": "L"},
            {"label": "Solar generation", "value": _round(row["solar_kwh_generated"]), "unit": "kWh"},
            {"label": "Occupancy", "value": int(row["occupancy_total"]), "unit": "people"},
            {"label": "Max temperature", "value": _round(row["max_temp_c"]), "unit": "C"},
        ],
        "explanation": "The trained Random Forest model predicts the next day's campus carbon footprint from today's weather, academic phase, occupancy, electricity, diesel, water, waste, LPG, solar generation, and current carbon emissions.",
    }


def _dashboard(day_index: int, solar: int = 20, bus: int = 70, led: int = 50) -> dict[str, Any]:
    day_index = _clamp_day(day_index)
    row = df_raw.iloc[day_index]
    prev = df_raw.iloc[day_index - 1] if day_index > 0 else None
    daily = _daily_rows()
    buildings = _building_rows(row)
    forecast = _forecast(day_index)
    carbon = float(row["carbon_kg"])
    previous_carbon = float(prev["carbon_kg"]) if prev is not None else carbon
    change = ((carbon - previous_carbon) / max(1, previous_carbon)) * 100
    solar_offset = float(row["solar_kwh_generated"]) * FACTORS["solar"]
    score = max(45, min(98, 100 - carbon / 36000 * 28 + solar_offset / 1000 * 2))
    ranked = sorted(buildings, key=lambda item: item["carbon"], reverse=True)
    return {
        "model": {
            "name": "RandomForestRegressor",
            "path": str(MODEL_PATH.relative_to(BASE_DIR)),
            "target": "carbon_kg_next_day",
            "features": MODEL_FEATURES,
        },
        "buildings": [{"name": item["name"], "type": item["type"]} for item in BUILDINGS],
        "daily": daily,
        "selectedDay": day_index,
        "reportDate": row["date"],
        "mapData": buildings,
        "breakdown": _breakdown(row),
        "forecast": forecast,
        "anomalies": _anomalies(day_index, buildings),
        "recommendations": _recommendations(row, buildings),
        "ranking": _ranking(buildings),
        "simulator": _simulator(row, solar, bus, led),
        "insights": _insights(row, prev, buildings, forecast),
        "chatAnswers": _chat_answers(row, prev, buildings, forecast),
        "operations": {
            "busDiesel": _round(row["diesel_l"]),
            "vehicles": int(row["day_scholars_present"]),
            "foodWaste": _round(row["waste_kg"] * 0.42),
            "leakRisk": "High" if row["water_l"] > df_raw["water_l"].quantile(0.85) else "Medium" if row["water_l"] > df_raw["water_l"].quantile(0.65) else "Low",
        },
        "nextDayPrediction": _prediction_detail(day_index),
        "summary": {
                "carbon": _round(carbon),
                "change": _round(change),
                "forecastCarbon": _round(_predict_next(row)),
                "solarOffset": _round(solar_offset),
                "score": round(score),
                "goalProgress": round((carbon * 30 / 100000) * 100),
                "topBuilding": ranked[0]["name"],
                "statusTone": "alert" if change > 3 else "positive" if change < -2 else "steady",
            },
    }


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "ok": True,
        "message": "Campus Carbon AI API is running",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "rows": len(df_raw),
        "model": "RandomForestRegressor",
        "features": MODEL_FEATURES,
    }


@app.get("/api/dashboard")
def dashboard(
    day_index: int = Query(default=len(df_raw) - 1, ge=0),
    solar: int = Query(default=20, ge=0, le=60),
    bus: int = Query(default=70, ge=20, le=95),
    led: int = Query(default=50, ge=0, le=100),
) -> dict[str, Any]:
    return _json_safe(_dashboard(day_index, solar, bus, led))


@app.get("/api/simulator")
def simulator(
    day_index: int = Query(default=len(df_raw) - 1, ge=0),
    solar: int = Query(default=20, ge=0, le=60),
    bus: int = Query(default=70, ge=20, le=95),
    led: int = Query(default=50, ge=0, le=100),
) -> dict[str, Any]:
    day_index = _clamp_day(day_index)
    return _simulator(df_raw.iloc[day_index], solar, bus, led)


@app.get("/api/prediction/next-day")
def next_day_prediction(day_index: int = Query(default=len(df_raw) - 1, ge=0)) -> dict[str, Any]:
    return _prediction_detail(day_index)


@app.get("/api/reports/{report_type}")
def report(report_type: str, day_index: int = Query(default=len(df_raw) - 1, ge=0)) -> StreamingResponse:
    day_index = _clamp_day(day_index)
    dashboard_data = _dashboard(day_index)
    if report_type == "dataset":
        rows = df_raw.tail(120).to_dict(orient="records")
    elif report_type in {"weekly", "monthly"}:
        days = 7 if report_type == "weekly" else 30
        start = max(0, day_index - days + 1)
        rows = df_raw.iloc[start:day_index + 1].to_dict(orient="records")
    elif report_type == "daily":
        rows = dashboard_data["mapData"]
    else:
        raise HTTPException(status_code=404, detail="Unknown report type")

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    filename = f"campus-carbon-{report_type}-day-{day_index}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
