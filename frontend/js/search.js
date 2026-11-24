/* ==========================================================
   search.js — the search form on index.html
   ========================================================== */

/* grabbing every entry area from index.html by its id so we can use them in JS. same id's as the ones in styles.css
(#from, #to, etc). const means these variables never get reassigned, they will always point to the same element */
const form = document.getElementById("search-form");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const departDate = document.getElementById("depart-date");
const returnDate = document.getElementById("return-date");
const budgetInput = document.getElementById("budget");
const carryOnSelect = document.getElementById("carry-on");
const checkedSelect = document.getElementById("checked");

/* autofill/complete */
/* the datalist is the list of suggestions that pops up while you type in depart/arrive.
Object.entries turns AIRPORTS into pairs of [code, city], like ["LAX", "Los Angeles"], so we can loop thru all of them
and make one <option> for each airport. value is what gets typed into the box (LAX), label is the grey text next to it
(Los Angeles) */
const datalist = document.getElementById("airport-list");
for (const [code, city] of Object.entries(AIRPORTS)) {
  const opt = document.createElement("option");
  opt.value = code;
  opt.label = city;
  datalist.appendChild(opt);
}

/* dropdown for hints */
/* changes the little text under an entry area (the .hint in styles.css). isError = false means if we dont pass in a 3rd
value, it defaults to false. classList.toggle with a 2nd value basically means: add the "error" class if isError is
true, remove it if its false */
function setHint(id, text, isError = false) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.classList.toggle("error", isError);
}

/* this is the JS part of the red border! if invalid is true, we add aria-invalid="true" to the entry area, and the
input[aria-invalid="true"] rule in styles.css sees it and turns the border red. if false, we remove it and the border
goes back to normal. aria-invalid is also read out by screen readers so its good for accessibility too */
function markInvalid(input, invalid) {
  if (invalid) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

/* subtitle for entry box. dynamic based on what user enters. */
/* runs every time the user types in depart or arrive. clears the red border first since the user is fixing it, then
goes thru 3 cases in order (only ONE of them runs bc of the else ifs):
1. box is empty (.trim() removes spaces so "   " counts as empty) -> no hint
2. we found the airport -> show the city (LAX -> Los Angeles). the || "" is a backup in case we have the code but no
city name for it, then the hint just stays empty
3. anything else -> tell them to enter a 3 letter code */
function updateAirportHint(input, hintId) {
  // while typing, remove red invalid border
  markInvalid(input, false);
  // from common.js
  const code = resolveAirport(input.value);
  // if box is empty
  if (!input.value.trim()) setHint(hintId, "");
  // if city is valid, show city/airport in hints. if not, then you get blank (or "")
  else if (code) setHint(hintId, airportCity(code) || "");
  // if not empty and also not a city
  else setHint(hintId, "Enter a 3-letter airport code");
}

/* when you get an input from the "from" and "to" IDs, call updateAirportHint. this means whenever the user types
something in depart/arrive, these lines will get called. */
fromInput.addEventListener("input", () => updateAirportHint(fromInput, "from-hint"));
toInput.addEventListener("input", () => updateAirportHint(toInput, "to-hint"));


/* swap button */
/* simply swaps the array. this is the swap button code, and it swaps hints as well so that the city names swap. */
document.getElementById("swap-btn").addEventListener("click", () => {
  [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
  updateAirportHint(fromInput, "from-hint");
  updateAirportHint(toInput, "to-hint");
});

/* dates */
/* .min greys out every day before today in the calendar picker so the user cant pick a date in the past */
departDate.min = todayISO();
returnDate.min = todayISO();

/* runs when the user picks a depart date */
departDate.addEventListener("change", () => {
  // return can't be before departure
  /* moves the earliest return date up to the depart date. the || todayISO() is a backup in case depart got cleared */
  returnDate.min = departDate.value || todayISO();
  /* if they already picked a return date thats now BEFORE the new depart date, wipe it so they have to pick again.
  extra note! comparing dates as text with < only works bc the format is YYYY-MM-DD. "2026-11-02" < "2026-11-15" works
  the same way alphabetical order does */
  if (returnDate.value && returnDate.value < departDate.value) returnDate.value = "";
  markInvalid(departDate, false);
  setHint("dates-hint", "");
});
/* return date picked -> clear the error stuff */
returnDate.addEventListener("change", () => {
  markInvalid(returnDate, false);
  setHint("dates-hint", "");
});

/* same idea for budget. once the user starts typing, the red border + error hint go away */
budgetInput.addEventListener("input", () => {
  markInvalid(budgetInput, false);
  setHint("budget-hint", "");
});
/* both luggage dropdowns do the exact same thing, so instead of writing it twice we loop over both of them. they share
one hint (luggage-hint) since they sit next to eachother in the same .pair */
for (const sel of [carryOnSelect, checkedSelect]) {
  sel.addEventListener("change", () => {
    // remove errors if they were there. if not, then nothing happens.
    markInvalid(sel, false);
    setHint("luggage-hint", "");
  });
}

/* good to go? submit! */
/* checks every entry area before we let the user search. every time something is wrong, that entry area gets pushed
into errors[] and its hint turns into an error message. the checks go in the same order as the page (top left ->
bottom right) so errors[0] is always the first mistake on screen */
function validate() {
  const errors = [];
  /* resolveAirport turns whatever they typed into a real airport code. if it cant find one, we get nothing back
  (which counts as false in the ifs below) */
  const from = resolveAirport(fromInput.value);
  const to = resolveAirport(toInput.value);

  // if depart isnt a real airport, display error
  if (!from) {
    errors.push(fromInput);
    setHint("from-hint", "Enter a departure airport", true);
  }
  // if arrive isnt a real airport, display error
  if (!to) {
    errors.push(toInput);
    setHint("to-hint", "Enter an arrival airport", true);
  } 
  // make sure depart and arrive are not the same; cant travel to the same place.
  else if (from && from === to) {
    errors.push(toInput);
    setHint("to-hint", "Arrival must differ from departure", true);
  }

  // saves today as yyyy-mm-dd
  const today = todayISO();
  // if depart or arrive is empty, error
  if (!departDate.value || !returnDate.value) {
    if (!departDate.value) errors.push(departDate);
    if (!returnDate.value) errors.push(returnDate);
    setHint("dates-hint", "Pick a departure and return date", true);
  } 
  // else if you departure date is before today, error
  else if (departDate.value < today) {
    errors.push(departDate);
    setHint("dates-hint", "Departure can't be in the past", true);
  } 
  // else if you want to return before your departure even starts, error
  else if (returnDate.value < departDate.value) {
    errors.push(returnDate);
    setHint("dates-hint", "Return must be on or after departure", true);
  }

  // if budget is empty or less than 0, error
  const budget = Number(budgetInput.value);
  if (!budget || budget < 0) {
    errors.push(budgetInput);
    setHint("budget-hint", "Enter a budget greater than $0", true);
  }

  // if user selects nothing for carryon/checked bags, error
  if (carryOnSelect.value === "" || checkedSelect.value === "") {
    if (carryOnSelect.value === "") errors.push(carryOnSelect);
    if (checkedSelect.value === "") errors.push(checkedSelect);
    setHint("luggage-hint", "Choose how many bags you're bringing", true);
  }

  /* red border on everything that failed */
  errors.forEach((el) => markInvalid(el, true));
  // returns how many errors there were, where the first error is, the arrive/depart airports, and the budget
  return { ok: errors.length === 0, firstError: errors[0], from, to, budget };
}

/* runs when the user hits search (or presses enter in any box) */
form.addEventListener("submit", (e) => {
  /* by default, submitting a form reloads the page. preventDefault stops that so we can handle everything in JS */
  e.preventDefault();
  const result = validate();
  /* if something is wrong, jump the user's cursor to the first broken entry area and stop here (no search) */
  if (!result.ok) {
    result.firstError.focus();
    return;
  }

  //takes everything the user entered into the results page
  const params = new URLSearchParams({
    from: result.from,
    to: result.to,
    depart: departDate.value,
    return: returnDate.value,
    budget: Math.round(result.budget),
    carry_on: carryOnSelect.value,
    checked: checkedSelect.value,
  });
  /* this line sends the user to the results page */
  window.location.href = `results.html?${params}`;
});