/* shared data and helper functions for frontend */

/* Airports offered in the autocomplete list.
   MAKE SURE THIS IS COMPATIBLE W BACKEND DATA */
const AIRPORTS = {
  ATL: "Atlanta, GA",
  AUS: "Austin, TX",
  BOS: "Boston, MA",
  BUR: "Burbank, CA",
  DCA: "Washington, DC",
  DEN: "Denver, CO",
  DFW: "Dallas–Fort Worth, TX",
  DTW: "Detroit, MI",
  EWR: "Newark, NJ",
  HNL: "Honolulu, HI",
  IAD: "Washington Dulles, VA",
  IAH: "Houston, TX",
  JFK: "New York, NY",
  LAS: "Las Vegas, NV",
  LAX: "Los Angeles, CA",
  LGA: "New York LaGuardia, NY",
  LGB: "Long Beach, CA",
  MCO: "Orlando, FL",
  MIA: "Miami, FL",
  MSP: "Minneapolis, MN",
  OAK: "Oakland, CA",
  ONT: "Ontario, CA",
  ORD: "Chicago, IL",
  PDX: "Portland, OR",
  PHL: "Philadelphia, PA",
  PHX: "Phoenix, AZ",
  SAN: "San Diego, CA",
  SEA: "Seattle, WA",
  SFO: "San Francisco, CA",
  SJC: "San Jose, CA",
  SLC: "Salt Lake City, UT",
  SMF: "Sacramento, CA",
  SNA: "Santa Ana / Orange County, CA",
};

/* user can type lax or LAX, or los angeles */
function resolveAirport(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;

  const upper = text.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;

  const lower = text.toLowerCase();
  const match = Object.entries(AIRPORTS).find(([, city]) =>
    city.toLowerCase().startsWith(lower)
  );
  return match ? match[0] : null;
}

function airportCity(code) {
  return AIRPORTS[code] || "";
}

/* turns dates into US date formatting */
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  // return month-day-year formatting
  return m ? `${m[2]}/${m[3]}/${m[1]}` : "";
}

/* today as "YYYY-MM-DD" in the user's local time zone. */
function todayISO() {
  const d = new Date();
  // add 0 to front until it is 2 digits: ex 9 becomes 09. this is just for formatting
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatMoney(n) {
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
