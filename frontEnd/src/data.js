const buildings = [
  { name: 'Library', type: 'Academic', baseOcc: 190, baseKwh: 42, baseWater: 420, lab: 0, solar: 16, trees: 18 },
  { name: 'CSE Block', type: 'Department', baseOcc: 430, baseKwh: 88, baseWater: 720, lab: 46, solar: 22, trees: 10 },
  { name: 'AI Block', type: 'Department', baseOcc: 310, baseKwh: 70, baseWater: 590, lab: 38, solar: 24, trees: 12 },
  { name: 'Mechanical Block', type: 'Department', baseOcc: 280, baseKwh: 104, baseWater: 650, lab: 72, solar: 14, trees: 8 },
  { name: 'EEE Block', type: 'Department', baseOcc: 260, baseKwh: 84, baseWater: 570, lab: 58, solar: 18, trees: 9 },
  { name: 'Civil Block', type: 'Department', baseOcc: 220, baseKwh: 50, baseWater: 520, lab: 20, solar: 12, trees: 15 },
  { name: 'Admin Block', type: 'Admin', baseOcc: 160, baseKwh: 48, baseWater: 360, lab: 0, solar: 10, trees: 16 },
  { name: 'Hostel A', type: 'Hostel', baseOcc: 640, baseKwh: 118, baseWater: 1900, lab: 0, solar: 18, trees: 22 },
  { name: 'Hostel B', type: 'Hostel', baseOcc: 580, baseKwh: 108, baseWater: 1720, lab: 0, solar: 18, trees: 20 },
  { name: 'Canteen', type: 'Service', baseOcc: 360, baseKwh: 62, baseWater: 890, lab: 0, solar: 9, trees: 7 },
  { name: 'Auditorium', type: 'Shared', baseOcc: 140, baseKwh: 44, baseWater: 280, lab: 0, solar: 8, trees: 14 },
  { name: 'Sports Complex', type: 'Shared', baseOcc: 210, baseKwh: 38, baseWater: 740, lab: 0, solar: 11, trees: 30 }
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

function round(value) {
  return Math.round(value * 10) / 10;
}

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
        const weekendFactor = isWeekend && building.type !== 'Hostel' ? 0.46 : 1;
        const hostelFactor = building.type === 'Hostel' && hostelPeak ? 1.22 : 0.9;
        const serviceFactor = building.name === 'Canteen' && [8, 12, 13, 19].includes(hour) ? 1.35 : 1;
        const auditoriumEvent = building.name === 'Auditorium' && day % 10 === 2 && hour >= 15 && hour <= 18 ? 2.2 : 1;
        const occupancy = Math.max(8, Math.round(building.baseOcc * campusPulse * weekendFactor * hostelFactor * serviceFactor * auditoriumEvent * examBoost + wave(day + hour + index, 18)));
        const cooling = Math.max(0, temp - 24) * 0.055;
        let electricity = building.baseKwh * campusPulse * weekendFactor * hostelFactor * serviceFactor * auditoriumEvent * (1 + cooling) + building.lab * (activeHour ? 0.45 : 0.06) + wave(day * 2 + hour + index, 4);
        let water = building.baseWater * (0.25 + campusPulse * 0.75) * weekendFactor * hostelFactor * serviceFactor + occupancy * 0.85 + wave(day + index, 35);
        let waste = occupancy * (building.name === 'Canteen' ? 0.09 : building.type === 'Hostel' ? 0.045 : 0.022);
        let diesel = 0;
        let lpg = building.name === 'Canteen' ? 2.2 * serviceFactor : 0;

        if (building.name === 'Mechanical Block' && day === 40 && hour >= 10 && hour <= 16) electricity *= 1.52;
        if (building.name === 'Hostel A' && day === 41 && hour >= 2 && hour <= 5) water *= 1.85;
        if (building.name === 'Library' && day === 42 && hour >= 20) electricity *= 1.9;
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
          acHours: round(activeHour ? Math.min(10, 2 + cooling * 22) : building.type === 'Hostel' ? 2 : 0),
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

function sum(rows, key) {
  return rows.reduce((value, row) => value + (row[key] || 0), 0);
}

function getRowsForDay(data, day) {
  return data.filter((row) => row.day === Number(day));
}

function groupByBuilding(rows) {
  return buildings.map((building) => {
    const subset = rows.filter((row) => row.building === building.name);
    return {
      name: building.name,
      type: building.type,
      carbon: sum(subset, 'carbon'),
      electricity: sum(subset, 'electricity'),
      water: sum(subset, 'water'),
      waste: sum(subset, 'waste'),
      solar: sum(subset, 'solar'),
      occupancy: sum(subset, 'occupancy')
    };
  });
}

function groupDaily(data) {
  const days = Array.from(new Set(data.map((row) => row.day))).sort((a, b) => a - b);
  return days.map((day) => {
    const rows = getRowsForDay(data, day);
    return {
      day,
      date: rows[0].date,
      carbon: sum(rows, 'carbon'),
      electricity: sum(rows, 'electricity'),
      water: sum(rows, 'water'),
      waste: sum(rows, 'waste'),
      solar: sum(rows, 'solar'),
      diesel: sum(rows, 'diesel')
    };
  });
}

function statusFor(value) {
  if (value > 1450) return 'high';
  if (value > 900) return 'mid';
  return 'low';
}

function forecastNextDays(daily, currentDay, count = 7) {
  const index = daily.findIndex((item) => item.day === Number(currentDay));
  const recent = daily.slice(Math.max(0, index - 6), index + 1);
  const avg = recent.reduce((total, row) => total + row.carbon, 0) / Math.max(1, recent.length);
  const trend = recent.length > 1 ? (recent.at(-1).carbon - recent[0].carbon) / Math.max(1, recent.length - 1) : 0;

  return Array.from({ length: count }, (_, index) => {
    const weatherBump = index % 3 === 1 ? 0.04 : index % 4 === 0 ? -0.025 : 0.015;
    return {
      day: Number(currentDay) + index + 1,
      carbon: Math.max(0, avg + trend * (index + 1) + avg * weatherBump)
    };
  });
}

function formatKg(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} t`;
  return `${Math.round(value)} kg`;
}

function formatNumber(value, suffix = '') {
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function getBreakdown(rows) {
  const electricity = sum(rows, 'electricity') * factors.electricity;
  const water = sum(rows, 'water') * factors.water;
  const diesel = sum(rows, 'diesel') * factors.diesel;
  const waste = sum(rows, 'waste') * factors.waste;
  const lpg = sum(rows, 'lpg') * factors.lpg;
  const solar = sum(rows, 'solar') * factors.solar;
  const tree = buildings.reduce((total, building) => total + building.trees * factors.treeDaily, 0);

  return [
    { label: 'Electricity', value: electricity },
    { label: 'Water pumping', value: water },
    { label: 'Diesel generator', value: diesel },
    { label: 'Waste and food', value: waste },
    { label: 'Canteen LPG', value: lpg },
    { label: 'Solar offset', value: solar, offset: true },
    { label: 'Tree offset', value: tree, offset: true }
  ];
}

function getAnomalies(rows) {
  const topBuildings = groupByBuilding(rows).sort((a, b) => b.carbon - a.carbon).slice(0, 3);
  return topBuildings.map((building) => ({
    title: `${building.name} spike detected`,
    detail: `Carbon footprint is elevated at ${formatKg(building.carbon)} today, driven by energy and water load.`
  }));
}

function getRecommendations(rows) {
  const topBuilding = groupByBuilding(rows).sort((a, b) => b.carbon - a.carbon)[0];
  return [
    { title: 'Increase solar cover', detail: `Scale solar capacity at ${topBuilding.name} to offset peak electricity demand.` },
    { title: 'Optimize lighting', detail: 'LED conversion across departments reduces baseline energy by up to 18%.' },
    { title: 'Shift cooling schedules', detail: 'Moderating evening HVAC runtime can cut campus carbon intensity.' }
  ];
}

function getSimulatorInsights(solar, bus, led) {
  const reduction = 0.06 * solar + 0.05 * led + 0.03 * bus;
  return {
    savings: `${Math.round(reduction * 100)}% projected reduction in campus CO2e`,
    summary: `A combination of ${solar}% solar, ${bus}% bus adoption, and ${led}% LED retrofit reduces peak demand and offsets carbon.`
  };
}

export {
  buildings,
  factors,
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
};
