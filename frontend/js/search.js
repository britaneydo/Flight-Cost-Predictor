/* ==========================================================
   search.js — the search form on index.html
   ========================================================== */

const form = document.getElementById("search-form");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const departDate = document.getElementById("depart-date");
const returnDate = document.getElementById("return-date");
const budgetInput = document.getElementById("budget");
const carryOnSelect = document.getElementById("carry-on");
const checkedSelect = document.getElementById("checked");

/* autofill/complete */
const datalist = document.getElementById("airport-list");
for (const [code, city] of Object.entries(AIRPORTS)) {
  const opt = document.createElement("option");
  opt.value = code;
  opt.label = city;
  datalist.appendChild(opt);
}

/* dropdown for hints */
function setHint(id, text, isError = false) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.classList.toggle("error", isError);
}

function markInvalid(input, invalid) {
  if (invalid) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

/* subtitle for city name */
function updateAirportHint(input, hintId) {
  const code = resolveAirport(input.value);
  markInvalid(input, false);
  if (!input.value.trim()) return setHint(hintId, "");
  if (code && airportCity(code)) return setHint(hintId, airportCity(code));
  setHint(hintId, code ? "" : "Enter a 3-letter airport code");
}

fromInput.addEventListener("input", () => updateAirportHint(fromInput, "from-hint"));
toInput.addEventListener("input", () => updateAirportHint(toInput, "to-hint"));


/* swap button */
document.getElementById("swap-btn").addEventListener("click", () => {
  [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
  updateAirportHint(fromInput, "from-hint");
  updateAirportHint(toInput, "to-hint");
});

/* dates */
departDate.min = todayISO();
returnDate.min = todayISO();

departDate.addEventListener("change", () => {
  // return can't be before departure
  returnDate.min = departDate.value || todayISO();
  if (returnDate.value && returnDate.value < departDate.value) returnDate.value = "";
  markInvalid(departDate, false);
  setHint("dates-hint", "");
});
returnDate.addEventListener("change", () => {
  markInvalid(returnDate, false);
  setHint("dates-hint", "");
});

budgetInput.addEventListener("input", () => {
  markInvalid(budgetInput, false);
  setHint("budget-hint", "");
});
for (const sel of [carryOnSelect, checkedSelect]) {
  sel.addEventListener("change", () => {
    markInvalid(sel, false);
    setHint("luggage-hint", "");
  });
}

/* edit search will take you back to PREVIOUS results you had instead of emptying
your selections. just UX/QOL inprovements */
(function prefillFromURL() {
  const p = new URLSearchParams(location.search);
  if (p.get("from")) fromInput.value = p.get("from");
  if (p.get("to")) toInput.value = p.get("to");
  if (p.get("depart")) departDate.value = p.get("depart");
  if (p.get("return")) returnDate.value = p.get("return");
  if (p.get("budget")) budgetInput.value = p.get("budget");
  if (p.get("carry_on")) carryOnSelect.value = p.get("carry_on");
  if (p.get("checked")) checkedSelect.value = p.get("checked");
  updateAirportHint(fromInput, "from-hint");
  updateAirportHint(toInput, "to-hint");
  if (departDate.value) returnDate.min = departDate.value;
})();

/* good to go? submit! */
function validate() {
  const errors = [];
  const from = resolveAirport(fromInput.value);
  const to = resolveAirport(toInput.value);

  if (!from) {
    errors.push(fromInput);
    setHint("from-hint", "Enter a departure airport", true);
  }
  if (!to) {
    errors.push(toInput);
    setHint("to-hint", "Enter an arrival airport", true);
  } else if (from && from === to) {
    errors.push(toInput);
    setHint("to-hint", "Arrival must differ from departure", true);
  }

  const today = todayISO();
  if (!departDate.value || !returnDate.value) {
    if (!departDate.value) errors.push(departDate);
    if (!returnDate.value) errors.push(returnDate);
    setHint("dates-hint", "Pick a departure and return date", true);
  } else if (departDate.value < today) {
    errors.push(departDate);
    setHint("dates-hint", "Departure can't be in the past", true);
  } else if (returnDate.value < departDate.value) {
    errors.push(returnDate);
    setHint("dates-hint", "Return must be on or after departure", true);
  }

  const budget = Number(budgetInput.value);
  if (!budgetInput.value || !Number.isFinite(budget) || budget <= 0) {
    errors.push(budgetInput);
    setHint("budget-hint", "Enter a budget greater than $0", true);
  }

  if (carryOnSelect.value === "" || checkedSelect.value === "") {
    if (carryOnSelect.value === "") errors.push(carryOnSelect);
    if (checkedSelect.value === "") errors.push(checkedSelect);
    setHint("luggage-hint", "Choose how many bags you're bringing", true);
  }

  errors.forEach((el) => markInvalid(el, true));
  return { ok: errors.length === 0, firstError: errors[0], from, to, budget };
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = validate();
  if (!result.ok) {
    result.firstError.focus();
    return;
  }

  // results won't get blown up upon refresh
  const params = new URLSearchParams({
    from: result.from,
    to: result.to,
    depart: departDate.value,
    return: returnDate.value,
    budget: String(Math.round(result.budget)),
    carry_on: carryOnSelect.value,
    checked: checkedSelect.value,
  });
  window.location.href = `results.html?${params}`;
});
