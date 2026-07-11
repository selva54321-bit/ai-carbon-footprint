const buildings = [
  { name: "Library", type: "Academic", baseOcc: 190, baseKwh: 42, baseWater: 420, lab: 0, solar: 16, trees: 18 },
  { name: "CSE Block", type: "Department", baseOcc: 430, baseKwh: 88, baseWater: 720, lab: 46, solar: 22, trees: 10 },
  { name: "AI Block", type: "Department", baseOcc: 310, baseKwh: 70, baseWater: 590, lab: 38, solar: 24, trees: 12 },
  { name: "Mechanical Block", type: "Department", baseOcc: 280, baseKwh: 104, baseWater: 650, lab: 72, solar: 14, trees: 8 },
  { name: "EEE Block", type: "Department", baseOcc: 260, baseKwh: 84, baseWater: 570, lab: 58, solar: 18, trees: 9 },
  { name: "Civil Block", type: "Department", baseOcc: 220, baseKwh: 50, baseWater: 520, lab: 20, solar: 12, trees: 15 },
  { name: "Admin Block", type: "Admin", baseOcc: 160, baseKwh: 48, baseWater: 360, lab: 0, solar: 10, trees: 16 },
  { name: "Hostel A", type: "Hostel", baseOcc: 640, baseKwh: 118, baseWater: 1900, lab: 0, solar: 18, trees: 22 },
  { name: "Hostel B", type: "Hostel", baseOcc: 580, baseKwh: 108, baseWater: 1720, lab: 0, solar: 18, trees: 20 },
  { name: "Canteen", type: "Service", baseOcc: 360, baseKwh: 62, baseWater: 890, lab: 0, solar: 9, trees: 7 },
  { name: "Auditorium", type: "Shared", baseOcc: 140, baseKwh: 44, baseWater: 280, lab: 0, solar: 8, trees: 14 },
  { name: "Sports Complex", type: "Shared", baseOcc: 210, baseKwh: 38, baseWater: 740, lab: 0, solar: 11, trees: 30 }
];

const factors = {
  electricity: 0.82,
  water: 0.00035,
  diesel: 2.68,
  waste: 1.15,
  lpg: 2.98,
  solar: 0.82,
  treeDaily: 0.06
};

const state = {
  selectedDay: 44,
  selectedBuilding: buildings[0].name,
  trend: "carbon"
};

function wave(seed, scale) {
  return Math.sin(seed * 1.7) * scale + Math.cos(seed * 0.63) * scale * 0.5;
}

function generateData(days = 45) {
  const rows = [];
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  for (let day = 0; day < days; day += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + day);
    const weekday = date.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const examBoost = day > 30 ? 1.08 : 1;
    const temp = 29 + Math.max(0, wave(day / 3, 4)) + (day % 9 === 0 ? 2 : 0);
    const rainy = day % 13 === 4;

    for (let hour = 0; hour < 24; hour += 1) {
      const activeHour = hour >= 8 && hour <= 18;
      const hostelPeak = hour <= 7 || hour >= 19;
      const solarCurve = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
      const campusPulse = activeHour ? 1 : 0.36;

      buildings.forEach((building, index) => {
        const weekendFactor = isWeekend && building.type !== "Hostel" ? 0.46 : 1;
        const hostelFactor = building.type === "Hostel" && hostelPeak ? 1.22 : 0.9;
        const serviceFactor = building.name === "Canteen" && [8, 12, 13, 19].includes(hour) ? 1.35 : 1;
        const auditoriumEvent = building.name === "Auditorium" && day % 10 === 2 && hour >= 15 && hour <= 18 ? 2.2 : 1;
        const occupancy = Math.max(8, Math.round(building.baseOcc * campusPulse * weekendFactor * hostelFactor * serviceFactor * auditoriumEvent * examBoost + wave(day + hour + index, 18)));
        const cooling = Math.max(0, temp - 24) * 0.055;
        let electricity = building.baseKwh * campusPulse * weekendFactor * hostelFactor * serviceFactor * auditoriumEvent * (1 + cooling) + building.lab * (activeHour ? 0.45 : 0.06) + wave(day * 2 + hour + index, 4);
        let water = building.baseWater * (0.25 + campusPulse * 0.75) * weekendFactor * hostelFactor * serviceFactor + occupancy * 0.85 + wave(day + index, 35);
        let waste = occupancy * (building.name === "Canteen" ? 0.09 : building.type === "Hostel" ? 0.045 : 0.022);
        let diesel = 0;
        let lpg = building.name === "Canteen" ? 2.2 * serviceFactor : 0;

        if (building.name === "Mechanical Block" && day === 40 && hour >= 10 && hour <= 16) electricity *= 1.52;
        if (building.name === "Hostel A" && day === 41 && hour >= 2 && hour <= 5) water *= 1.85;
        if (building.name === "Library" && day === 42 && hour >= 20) electricity *= 1.9;
        if (hour === 11 && day % 6 === 0) diesel = index % 4 === 0 ? 7 : 0;

        const solar = building.solar * solarCurve * (rainy ? 0.48 : 1);
        const treeOffset = building.trees * factors.treeDaily / 24;
        const gross = electricity * factors.electricity + water * factors.water + waste * factors.waste + diesel * factors.diesel + lpg * factors.lpg;
        const offset = solar * factors.solar + treeOffset;
        const carbon = Math.max(0, gross - offset);

        rows.push({
          day,
          date: date.toISOString().slice(0, 10),
          hour,
          building: building.name,
          type: building.type,
          occupancy,
          electricity: round(electricity),
          water: round(water),
          acHours: round(activeHour ? Math.min(10, 2 + cooling * 22) : building.type === "Hostel" ? 2 : 0),
          labEquipment: round(building.lab * (activeHour ? 1 : 0.12)),
          solar: round(solar),
          waste: round(waste),
          diesel: round(diesel),
          lpg: round(lpg),
          temperature: round(temp),
          carbon: round(carbon)
        });
      });
    }
  }
  return rows;
}

const data = generateData();

function round(value) {
  return Math.round(value * 10) / 10;
}

function byDay(day) {
  return data.filter(row => row.day === Number(day));
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + row[key], 0);
}

function formatKg(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} t`;
  return `${Math.round(value)} kg`;
}

function formatNumber(value, suffix = "") {
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function groupByBuilding(rows) {
  return buildings.map(building => {
    const subset = rows.filter(row => row.building === building.name);
    return {
      name: building.name,
      type: building.type,
      carbon: sum(subset, "carbon"),
      electricity: sum(subset, "electricity"),
      water: sum(subset, "water"),
      waste: sum(subset, "waste"),
      solar: sum(subset, "solar"),
      occupancy: sum(subset, "occupancy")
    };
  });
}

function groupDaily() {
  const maxDay = Math.max(...data.map(row => row.day));
  return Array.from({ length: maxDay + 1 }, (_, day) => {
    const rows = byDay(day);
    return {
      day,
      date: rows[0].date,
      carbon: sum(rows, "carbon"),
      electricity: sum(rows, "electricity"),
      water: sum(rows, "water"),
      waste: sum(rows, "waste"),
      solar: sum(rows, "solar"),
      diesel: sum(rows, "diesel")
    };
  });
}

function forecastNextDays(currentDay, count = 7) {
  const daily = groupDaily();
  const recent = daily.slice(Math.max(0, currentDay - 6), currentDay + 1);
  const avg = sum(recent, "carbon") / recent.length;
  const trend = recent.length > 1 ? (recent.at(-1).carbon - recent[0].carbon) / recent.length : 0;
  return Array.from({ length: count }, (_, index) => {
    const weatherBump = index % 3 === 1 ? 0.04 : index % 4 === 0 ? -0.025 : 0.015;
    return {
      day: currentDay + index + 1,
      carbon: Math.max(0, avg + trend * (index + 1) + avg * weatherBump)
    };
  });
}

function statusFor(value) {
  if (value > 1450) return "high";
  if (value > 900) return "mid";
  return "low";
}

function updateControls() {
  const daySelect = document.getElementById("daySelect");
  const uniqueDays = groupDaily();
  daySelect.innerHTML = uniqueDays.map(day => `<option value="${day.day}">${day.date}</option>`).join("");
  daySelect.value = state.selectedDay;

  const buildingSelect = document.getElementById("buildingSelect");
  buildingSelect.innerHTML = buildings.map(building => `<option value="${building.name}">${building.name}</option>`).join("");
  buildingSelect.value = state.selectedBuilding;
}

function updateSummary(rows, yesterdayRows) {
  const carbon = sum(rows, "carbon");
  const yesterday = sum(yesterdayRows, "carbon") || carbon;
  const change = ((carbon - yesterday) / yesterday) * 100;
  const forecast = forecastNextDays(state.selectedDay, 1)[0].carbon;
  const solarOffset = sum(rows, "solar") * factors.solar;
  const annualTarget = 100000;
  const monthEstimate = carbon * 30;
  const score = Math.max(45, Math.min(98, 100 - (carbon / 36000) * 28 + (solarOffset / 1000) * 2));

  document.getElementById("todayCarbon").textContent = formatKg(carbon);
  document.getElementById("todayChange").textContent = `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs yesterday`;
  document.getElementById("forecastCarbon").textContent = formatKg(forecast);
  document.getElementById("forecastWhy").textContent = forecast > carbon ? "Higher occupancy and cooling load" : "Solar and lower evening demand help";
  document.getElementById("solarOffset").textContent = formatKg(solarOffset);
  document.getElementById("campusScore").textContent = `${Math.round(score)}/100`;
  document.getElementById("goalProgress").textContent = `${Math.round((monthEstimate / annualTarget) * 100)}% of annual target if repeated`;
}

function updateMap(rows) {
  const grouped = groupByBuilding(rows);
  const map = document.getElementById("campusMap");
  map.innerHTML = grouped.map(item => `
    <button class="building ${statusFor(item.carbon)}" type="button" data-building="${item.name}" aria-label="${item.name}, ${Math.round(item.carbon)} kilograms CO2e">
      <span>${item.name}</span>
      <strong>${formatKg(item.carbon)}</strong>
    </button>
  `).join("");
  map.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedBuilding = button.dataset.building;
      document.getElementById("buildingSelect").value = state.selectedBuilding;
      render();
    });
  });
}

function updateBuildingDetail(rows) {
  const grouped = groupByBuilding(rows).find(item => item.name === state.selectedBuilding);
  document.getElementById("buildingCarbon").textContent = formatKg(grouped.carbon);
  document.getElementById("buildingElectricity").textContent = formatNumber(grouped.electricity, " kWh");
  document.getElementById("buildingWater").textContent = formatNumber(grouped.water, " L");
  document.getElementById("buildingWaste").textContent = formatNumber(grouped.waste, " kg");
}

function drawLineChart(svgId, points, key, options = {}) {
  const svg = document.getElementById(svgId);
  const width = svg.clientWidth || 680;
  const height = options.height || (svgId === "forecastChart" ? 200 : 300);
  const pad = { left: 48, right: 24, top: 24, bottom: 38 };
  const values = points.map(point => point[key]);
  const min = Math.min(...values) * 0.94;
  const max = Math.max(...values) * 1.06;
  const x = index => pad.left + (index / Math.max(1, points.length - 1)) * (width - pad.left - pad.right);
  const y = value => height - pad.bottom - ((value - min) / Math.max(1, max - min)) * (height - pad.top - pad.bottom);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(point[key]).toFixed(1)}`).join(" ");
  const labels = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = `
    <line class="axis" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}"></line>
    <line class="axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}"></line>
    <text x="${pad.left}" y="15">${options.unit || ""}</text>
    ${labels.map(index => `<text x="${x(index)}" y="${height - 12}" text-anchor="middle">${points[index].label || points[index].date || `D${points[index].day}`}</text>`).join("")}
    <path class="series ${options.forecast ? "forecast" : ""}" d="${path}"></path>
    ${points.map((point, index) => `<circle class="${options.forecast ? "forecast-point" : "point"}" cx="${x(index)}" cy="${y(point[key])}" r="4"><title>${point.label || point.date}: ${Math.round(point[key])} ${options.unit || ""}</title></circle>`).join("")}
    <text x="${width - pad.right}" y="${Math.max(18, y(points.at(-1)[key]) - 10)}" text-anchor="end">${Math.round(points.at(-1)[key]).toLocaleString()}</text>
  `;
}

function updateTrend() {
  const daily = groupDaily().slice(Math.max(0, state.selectedDay - 29), state.selectedDay + 1);
  const unit = state.trend === "carbon" ? "kg CO2e" : state.trend === "electricity" ? "kWh" : "L";
  drawLineChart("trendChart", daily, state.trend, { unit });
}

function updateBreakdown(rows) {
  const electricity = sum(rows, "electricity") * factors.electricity;
  const water = sum(rows, "water") * factors.water;
  const diesel = sum(rows, "diesel") * factors.diesel;
  const waste = sum(rows, "waste") * factors.waste;
  const lpg = sum(rows, "lpg") * factors.lpg;
  const solar = sum(rows, "solar") * factors.solar;
  const tree = buildings.reduce((total, building) => total + building.trees * factors.treeDaily, 0);
  const parts = [
    ["Electricity", electricity, false],
    ["Water pumping", water, false],
    ["Diesel generator", diesel, false],
    ["Waste and food", waste, false],
    ["Canteen LPG", lpg, false],
    ["Solar offset", solar, true],
    ["Tree offset", tree, true]
  ];
  const max = Math.max(...parts.map(part => part[1]), 1);
  document.getElementById("carbonBreakdown").innerHTML = parts.map(([label, value, offset]) => `
    <div class="bar-row">
      <div class="bar-label"><span>${label}</span><strong>${offset ? "-" : ""}${formatKg(value)}</strong></div>
      <div class="bar-track"><div class="bar-fill ${offset ? "offset" : ""}" style="width:${Math.max(4, (value / max) * 100)}%"></div></div>
    </div>
  `).join("");
}

function updateForecast() {
  const daily = groupDaily().slice(Math.max(0, state.selectedDay - 6), state.selectedDay + 1).map(item => ({ ...item, label: `D${item.day}` }));
  const forecast = forecastNextDays(state.selectedDay, 7).map(item => ({ ...item, label: `F${item.day - state.selectedDay}` }));
  drawLineChart("forecastChart", [...daily.slice(-4), ...forecast], "carbon", { unit: "kg CO2e", forecast: true, height: 210 });
  const current = daily.at(-1).carbon;
  const next = forecast[0].carbon;
  document.getElementById("forecastExplanation").textContent = `Tomorrow is projected at ${formatKg(next)}, ${next > current ? "above" : "below"} today because the model weighs the last seven days, cooling demand, solar output and campus occupancy.`;
}

function detectAnomalies(rows) {
  const anomalies = [];
  buildings.forEach(building => {
    ["electricity", "water", "waste"].forEach(metric => {
      const today = sum(rows.filter(row => row.building === building.name), metric);
      const history = [];
      for (let day = Math.max(0, state.selectedDay - 14); day < state.selectedDay; day += 1) {
        history.push(sum(byDay(day).filter(row => row.building === building.name), metric));
      }
      const avg = history.reduce((a, b) => a + b, 0) / Math.max(1, history.length);
      const variance = history.reduce((total, value) => total + Math.pow(value - avg, 2), 0) / Math.max(1, history.length);
      const std = Math.sqrt(variance) || 1;
      const z = (today - avg) / std;
      if (z > 2.1) anomalies.push({ building: building.name, metric, today, avg, z });
    });
  });
  return anomalies.sort((a, b) => b.z - a.z).slice(0, 4);
}

function updateAnomalies(rows) {
  const anomalies = detectAnomalies(rows);
  const list = document.getElementById("anomalyList");
  if (!anomalies.length) {
    list.innerHTML = "<article><strong>No major anomaly found</strong><p>All monitored sources are within expected operating range for this date.</p></article>";
    return;
  }
  list.innerHTML = anomalies.map(item => {
    const reason = item.metric === "water" ? "Possible leak or unusually high hostel usage." : item.metric === "electricity" ? "Possible AC overuse, idle equipment or machine fault." : "Likely canteen or hostel waste spike.";
    return `<article class="${item.z > 3 ? "danger" : "warn"}"><strong>${item.building}: ${item.metric} spike</strong><p>${formatNumber(item.today)} vs normal ${formatNumber(item.avg)}. ${reason}</p></article>`;
  }).join("");
}

function updateRecommendations(rows) {
  const grouped = groupByBuilding(rows).sort((a, b) => b.carbon - a.carbon);
  const top = grouped[0];
  const hostel = grouped.find(item => item.name.includes("Hostel"));
  const canteen = grouped.find(item => item.name === "Canteen");
  const mechanical = grouped.find(item => item.name === "Mechanical Block");
  const recs = [
    {
      title: `${top.name}: reduce peak electricity load`,
      body: `Shift non-critical usage outside peak hours. Estimated saving ${formatKg(top.electricity * 0.08 * factors.electricity)} per day.`
    },
    {
      title: `${hostel.name}: optimize AC schedule`,
      body: `Raise thermostat from 21C to 24C during night peak. Estimated saving ${formatNumber(hostel.electricity * 0.11, " kWh")} and ${formatKg(hostel.electricity * 0.11 * factors.electricity)} per day.`
    },
    {
      title: `${mechanical.name}: automatic machine shutdown`,
      body: `Idle lab machines can shut down after 15 minutes. Estimated saving ${formatNumber(mechanical.electricity * 0.09, " kWh")} per day.`
    },
    {
      title: "Canteen: reduce food waste batch size",
      body: `Prepare smaller weekday batches. Expected methane reduction ${formatKg(canteen.waste * 0.18 * factors.waste)} per day.`
    }
  ];
  document.getElementById("recommendationList").innerHTML = recs.map(rec => `<article><strong>${rec.title}</strong><p>${rec.body}</p></article>`).join("");
}

function updateOperations(rows) {
  const diesel = sum(rows, "diesel");
  const vehicles = Math.round(800 + wave(state.selectedDay, 70));
  const food = sum(rows.filter(row => row.building === "Canteen"), "waste");
  const hostelWater = groupByBuilding(rows).filter(item => item.type === "Hostel").reduce((total, item) => total + item.water, 0);
  document.getElementById("busDiesel").textContent = formatNumber(diesel, " L");
  document.getElementById("vehicles").textContent = formatNumber(vehicles);
  document.getElementById("foodWaste").textContent = formatNumber(food, " kg");
  document.getElementById("leakRisk").textContent = hostelWater > 95000 ? "High" : hostelWater > 78000 ? "Medium" : "Low";
}

function updateRanking(rows) {
  const ranking = groupByBuilding(rows).map(item => {
    const intensity = item.carbon / Math.max(1, item.occupancy / 24);
    const renewable = item.solar / Math.max(1, item.electricity);
    const score = Math.max(45, Math.min(99, 100 - intensity * 0.8 + renewable * 120));
    return { ...item, score };
  }).sort((a, b) => b.score - a.score);
  document.getElementById("rankingList").innerHTML = ranking.slice(0, 8).map((item, index) => `
    <div class="rank-row">
      <strong>${index + 1}</strong>
      <div>
        <span>${item.name}</span>
        <div class="rank-track"><div class="rank-fill" style="width:${item.score}%"></div></div>
      </div>
      <strong>${Math.round(item.score)}</strong>
    </div>
  `).join("");
}

function updateSimulator(rows) {
  const solarIncrease = Number(document.getElementById("solarSlider").value);
  const busAdoption = Number(document.getElementById("busSlider").value);
  const led = Number(document.getElementById("ledSlider").value);
  document.getElementById("solarValue").textContent = `${solarIncrease}%`;
  document.getElementById("busValue").textContent = `${busAdoption}%`;
  document.getElementById("ledValue").textContent = `${led}%`;

  const carbon = sum(rows, "carbon");
  const solarSaving = sum(rows, "solar") * (solarIncrease / 100) * factors.solar;
  const transportSaving = Math.max(0, (busAdoption - 45) / 100) * 620;
  const ledSaving = sum(rows, "electricity") * (led / 100) * 0.16 * factors.electricity;
  const total = solarSaving + transportSaving + ledSaving;
  const rupees = (ledSaving / factors.electricity) * 9.4 + transportSaving * 3.1;
  document.getElementById("simulatorResult").innerHTML = `
    <div><span>Carbon reduction</span><strong>${formatKg(total)}</strong></div>
    <div><span>New daily footprint</span><strong>${formatKg(Math.max(0, carbon - total))}</strong></div>
    <div><span>Estimated saving</span><strong>Rs ${Math.round(rupees).toLocaleString()}</strong></div>
  `;
}

function updateInsights(rows, yesterdayRows) {
  const grouped = groupByBuilding(rows).sort((a, b) => b.carbon - a.carbon);
  const carbon = sum(rows, "carbon");
  const yesterday = sum(yesterdayRows, "carbon") || carbon;
  const electricityChange = ((sum(rows, "electricity") - sum(yesterdayRows, "electricity")) / Math.max(1, sum(yesterdayRows, "electricity"))) * 100;
  const solarOffset = sum(rows, "solar") * factors.solar;
  const canteenWaste = sum(rows.filter(row => row.building === "Canteen"), "waste");
  const insights = [
    `Electricity demand changed by ${electricityChange.toFixed(1)}% compared with yesterday.`,
    `${grouped[0].name} contributes ${((grouped[0].carbon / carbon) * 100).toFixed(1)}% of today's campus emissions.`,
    `Solar generation avoided ${formatKg(solarOffset)} of grid emissions today.`,
    `Canteen food waste is ${formatNumber(canteenWaste, " kg")}; batch planning has the fastest waste impact.`
  ];
  document.getElementById("insightList").innerHTML = insights.map(text => `<article><p>${text}</p></article>`).join("");
}

function updateChat(rows, yesterdayRows) {
  const question = document.getElementById("questionSelect").value;
  const grouped = groupByBuilding(rows).sort((a, b) => b.carbon - a.carbon);
  const answer = {
    top: `${grouped[0].name} is the top emitter today with ${formatKg(grouped[0].carbon)}, mainly from electricity demand and occupancy.`,
    why: `The change is driven by ${sum(rows, "electricity") > sum(yesterdayRows, "electricity") ? "higher electricity usage and cooling demand" : "lower solar output and operational mix"}, with hostel and lab loads having the strongest effect.`,
    waste: `Canteen and hostels create most waste. Today's canteen waste is ${formatNumber(sum(rows.filter(row => row.building === "Canteen"), "waste"), " kg")}.`,
    next: `At the current run rate, next month's campus footprint is about ${formatKg(sum(rows, "carbon") * 30)} before extra solar, LED and bus adoption improvements.`
  };
  document.getElementById("chatAnswer").textContent = answer[question];
}

function reportRows(type) {
  if (type === "dataset") {
    return [
      ["Date", "Hour", "Building", "Occupancy", "Electricity kWh", "Water L", "AC Hours", "Lab Equipment", "Solar kWh", "Waste kg", "Temperature C", "Carbon kgCO2e"],
      ...data.slice(-288).map(row => [row.date, row.hour, row.building, row.occupancy, row.electricity, row.water, row.acHours, row.labEquipment, row.solar, row.waste, row.temperature, row.carbon])
    ];
  }

  if (type === "weekly" || type === "monthly") {
    const days = type === "weekly" ? 7 : 30;
    const start = Math.max(0, state.selectedDay - days + 1);
    const rows = data.filter(row => row.day >= start && row.day <= state.selectedDay);
    return [
      ["Building", "Carbon kgCO2e", "Electricity kWh", "Water L", "Waste kg", "Solar kWh", "Diesel L"],
      ...groupByBuilding(rows).map(item => {
        const subset = rows.filter(row => row.building === item.name);
        return [item.name, round(item.carbon), round(item.electricity), round(item.water), round(item.waste), round(item.solar), round(sum(subset, "diesel"))];
      })
    ];
  }

  const grouped = groupByBuilding(byDay(state.selectedDay));
  return [
    ["Building", "Carbon kgCO2e", "Electricity kWh", "Water L", "Waste kg", "Solar kWh"],
    ...grouped.map(item => [item.name, round(item.carbon), round(item.electricity), round(item.water), round(item.waste), round(item.solar)])
  ];
}

function downloadReport(type = "daily") {
  const lines = reportRows(type).map(row => row.join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `campus-carbon-${type}-report-day-${state.selectedDay}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function render() {
  const rows = byDay(state.selectedDay);
  const yesterdayRows = byDay(Math.max(0, state.selectedDay - 1));
  updateSummary(rows, yesterdayRows);
  updateMap(rows);
  updateBuildingDetail(rows);
  updateTrend();
  updateBreakdown(rows);
  updateForecast();
  updateAnomalies(rows);
  updateRecommendations(rows);
  updateOperations(rows);
  updateRanking(rows);
  updateSimulator(rows);
  updateInsights(rows, yesterdayRows);
  updateChat(rows, yesterdayRows);
}

function bindEvents() {
  document.getElementById("daySelect").addEventListener("change", event => {
    state.selectedDay = Number(event.target.value);
    render();
  });
  document.getElementById("buildingSelect").addEventListener("change", event => {
    state.selectedBuilding = event.target.value;
    render();
  });
  document.querySelectorAll("[data-trend]").forEach(button => {
    button.addEventListener("click", () => {
      state.trend = button.dataset.trend;
      document.querySelectorAll("[data-trend]").forEach(item => item.classList.toggle("active", item === button));
      updateTrend();
    });
  });
  ["solarSlider", "busSlider", "ledSlider"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => updateSimulator(byDay(state.selectedDay)));
  });
  document.getElementById("questionSelect").addEventListener("change", () => updateChat(byDay(state.selectedDay), byDay(Math.max(0, state.selectedDay - 1))));
  document.getElementById("downloadReport").addEventListener("click", () => downloadReport("daily"));
  document.getElementById("downloadSelectedReport").addEventListener("click", () => downloadReport(document.getElementById("reportType").value));
  window.addEventListener("resize", () => {
    updateTrend();
    updateForecast();
  });
}

updateControls();
bindEvents();
render();
