const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csvParser');

const CSV_PATH = path.resolve(__dirname, '..', '..', 'ngos.csv');

let cache = {
  mtimeMs: 0,
  ngos: []
};

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalize = (value) => clean(value).toLowerCase();

const normalizePhone = (value) => {
  const phone = clean(value);
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
};

const mapNgoRow = (row, index) => ({
  sourceId: clean(row[1]) || `ngos-csv-${index}`,
  nominationNumber: clean(row[2]),
  validFrom: clean(row[3]),
  validUpTo: clean(row[4]),
  name: clean(row[5]),
  district: clean(row[7]),
  state: clean(row[8]),
  contactNumber: normalizePhone(row[9]),
  email: clean(row[10]).toLowerCase(),
  remarks: clean(row[12]),
  source: 'ngos.csv'
});

const loadNgos = () => {
  const stat = fs.statSync(CSV_PATH);
  if (cache.ngos.length && cache.mtimeMs === stat.mtimeMs) return cache.ngos;

  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(csv);

  cache = {
    mtimeMs: stat.mtimeMs,
    ngos: rows
      .slice(2)
      .map(mapNgoRow)
      .filter((ngo) => ngo.name && (ngo.email || ngo.contactNumber))
  };

  return cache.ngos;
};

const scoreNgo = (ngo, filters) => {
  const state = normalize(filters.state);
  const district = normalize(filters.district);
  const ngoState = normalize(ngo.state);
  const ngoDistrict = normalize(ngo.district);
  let score = 0;

  if (state) {
    if (ngoState === state) score += 60;
    else if (ngoState.includes(state) || state.includes(ngoState)) score += 25;
    else return 0;
  }

  if (district) {
    if (ngoDistrict === district) score += 100;
    else if (ngoDistrict.includes(district) || district.includes(ngoDistrict)) score += 45;
    else if (state) score += 5;
    else return 0;
  }

  if (!state && !district) score = 1;
  return score;
};

const findNgos = ({ state, district, limit = 25 } = {}) => {
  const ngos = loadNgos();
  const max = Math.min(Number(limit) || 25, 100);

  return ngos
    .map((ngo) => ({ ...ngo, matchScore: scoreNgo(ngo, { state, district }) }))
    .filter((ngo) => ngo.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name))
    .slice(0, max);
};

const listStates = () => {
  const states = new Set(loadNgos().map((ngo) => ngo.state).filter(Boolean));
  return Array.from(states).sort((a, b) => a.localeCompare(b));
};

module.exports = {
  findNgos,
  listStates,
  loadNgos
};
