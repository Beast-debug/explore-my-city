
const API_URL = "http://localhost:5000/api";

let places = [];
let selectedCategory = "All";
let trip = [];
let editingTripId = null;

const placesGrid = document.getElementById("placesGrid");
const searchInput = document.getElementById("searchInput");
const resultCount = document.getElementById("resultCount");
const tripList = document.getElementById("tripList");

const tripNameInput = document.getElementById("tripName");
const saveTripBtn = document.getElementById("saveTripBtn");
const tripMessage = document.getElementById("tripMessage");
const savedTripsSelect = document.getElementById("savedTripsSelect");
const loadTripBtn = document.getElementById("loadTripBtn");
const editTripBtn = document.getElementById("editTripBtn");
const deleteTripBtn = document.getElementById("deleteTripBtn");

// -------------------- API HELPER --------------------
async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    console.error("Unexpected server response:", text.slice(0, 300));
    throw new Error(
      "Server returned an unexpected response. Check the backend."
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

// -------------------- STATUS MESSAGE --------------------
function setTripMessage(message) {
  if (tripMessage) {
    tripMessage.textContent = message;
  }
}

// -------------------- LOAD DESTINATIONS --------------------
async function loadPlaces() {
  placesGrid.innerHTML = '<p class="empty">Loading destinations...</p>';

  try {
    const data = await apiRequest(`${API_URL}/places`);

    places = data.map(place => ({
      id: Number(place.id),
      name: place.name,
      city: "Bengaluru",
      category: place.category,
      cost: Number(place.estimated_cost) || 0,
      description: place.description || "",
      image: place.image_url || "",
      location: place.location || ""
    }));

    renderPlaces();
  } catch (error) {
    console.error("Load places error:", error);
    placesGrid.innerHTML =
      '<p class="empty">Could not load destinations. Check your backend.</p>';
    resultCount.textContent = "Unable to load places";
  }
}

// -------------------- RENDER DESTINATIONS --------------------
function renderPlaces() {
  const query = searchInput.value.trim().toLowerCase();

  const filteredPlaces = places.filter(place => {
    const matchesCategory =
      selectedCategory === "All" ||
      place.category === selectedCategory;

    const searchableText =
      `${place.name} ${place.city} ${place.category} ${place.description} ${place.location}`
        .toLowerCase();

    return matchesCategory && searchableText.includes(query);
  });

  resultCount.textContent = `${filteredPlaces.length} places found`;

  if (filteredPlaces.length === 0) {
    placesGrid.innerHTML =
      '<p class="empty">No places found. Try another search.</p>';
    return;
  }

  placesGrid.innerHTML = filteredPlaces.map(place => {
    const added = trip.some(item => item.id === place.id);

    const imageMarkup = place.image
      ? `<img class="place-image"
              src="${place.image}"
              alt="${place.name}"
              loading="lazy"
              onerror="this.style.display='none'">`
      : "";

    return `
      <article class="place-card">
        ${imageMarkup}

        <div class="place-info">
          <span class="category">${place.category}</span>
          <h3>${place.name}</h3>
          <p>${place.location || place.city} · ${place.description}</p>

          <div class="place-bottom">
            <strong>Est. ₹${place.cost.toLocaleString("en-IN")}</strong>

            <button
              class="add-btn"
              data-id="${place.id}"
              ${added ? "disabled" : ""}
            >
              ${added ? "Added ✓" : "Add to trip +"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// -------------------- RENDER CURRENT TRIP --------------------
function renderTrip() {
  if (trip.length === 0) {
    tripList.innerHTML =
      '<p class="empty">Your trip is empty. Add a destination to begin!</p>';
  } else {
    tripList.innerHTML = trip.map(place => `
      <div class="trip-item">
        <div>
          <strong>${place.name}</strong>
          <p>${place.city} · ${place.category}</p>
        </div>

        <div>
          <strong>₹${place.cost.toLocaleString("en-IN")}</strong>
          <button class="remove-btn" data-id="${place.id}">
            Remove
          </button>
        </div>
      </div>
    `).join("");
  }

  document.getElementById("tripCount").textContent = trip.length;

  const total = trip.reduce((sum, place) => sum + place.cost, 0);

  document.getElementById("tripCost").textContent =
    `₹${total.toLocaleString("en-IN")}`;
}

// -------------------- CATEGORY FILTERS --------------------
document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;

    document.querySelectorAll(".filter").forEach(filter => {
      filter.classList.remove("active");
    });

    button.classList.add("active");
    renderPlaces();
  });
});

// -------------------- SEARCH --------------------
searchInput.addEventListener("input", renderPlaces);

document.getElementById("searchBtn").addEventListener("click", renderPlaces);

// -------------------- ADD DESTINATION --------------------
placesGrid.addEventListener("click", event => {
  const button = event.target.closest(".add-btn");

  if (!button || button.disabled) return;

  const id = Number(button.dataset.id);
  const place = places.find(item => item.id === id);

  if (place && !trip.some(item => item.id === id)) {
    trip.push(place);
    renderPlaces();
    renderTrip();
    setTripMessage("");
  }
});

// -------------------- REMOVE DESTINATION --------------------
tripList.addEventListener("click", event => {
  const button = event.target.closest(".remove-btn");

  if (!button) return;

  const id = Number(button.dataset.id);
  trip = trip.filter(place => place.id !== id);

  renderPlaces();
  renderTrip();
  setTripMessage("");
});

// -------------------- CLEAR CURRENT TRIP --------------------
document.getElementById("clearTrip").addEventListener("click", () => {
  trip = [];
  renderPlaces();
  renderTrip();
  setTripMessage("Current trip cleared. Saved trips remain unchanged.");
});

// -------------------- SAVE OR UPDATE TRIP --------------------
saveTripBtn.addEventListener("click", async () => {
  const tripName = tripNameInput.value.trim();

  if (!tripName) {
    setTripMessage("Please enter a trip name.");
    tripNameInput.focus();
    return;
  }

  if (trip.length === 0) {
    setTripMessage("Add at least one destination first.");
    return;
  }

  saveTripBtn.disabled = true;

  const isEditing = editingTripId !== null;

  setTripMessage(isEditing ? "Updating trip..." : "Saving trip...");

  try {
    const url = isEditing
      ? `${API_URL}/trips/${editingTripId}`
      : `${API_URL}/trips`;

    const result = await apiRequest(url, {
      method: isEditing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        trip_name: tripName,
        place_ids: trip.map(place => place.id)
      })
    });

    const savedId = result.id || editingTripId;

    editingTripId = null;
    saveTripBtn.textContent = "Save Trip";

    await loadSavedTrips();

    savedTripsSelect.value = String(savedId);

    setTripMessage(
      isEditing
        ? "Trip updated successfully!"
        : `Trip saved successfully! ID: ${savedId}`
    );
  } catch (error) {
    console.error("Save/update error:", error);
    setTripMessage(error.message);
  } finally {
    saveTripBtn.disabled = false;
  }
});

// -------------------- LOAD SAVED TRIPS DROPDOWN --------------------
async function loadSavedTrips() {
  try {
    const savedTrips = await apiRequest(`${API_URL}/trips`);
    const previousSelection = savedTripsSelect.value;

    savedTripsSelect.innerHTML =
      '<option value="">Select a saved trip</option>';

    savedTrips.forEach(savedTrip => {
      const option = document.createElement("option");
      option.value = savedTrip.id;
      option.textContent =
        `${savedTrip.trip_name} (#${savedTrip.id})`;

      savedTripsSelect.appendChild(option);
    });

    if (savedTrips.some(item => String(item.id) === previousSelection)) {
      savedTripsSelect.value = previousSelection;
    }
  } catch (error) {
    console.error("Load saved trips error:", error);
    setTripMessage(`Could not retrieve saved trips: ${error.message}`);
  }
}

// -------------------- LOAD SELECTED TRIP --------------------
loadTripBtn.addEventListener("click", async () => {
  const tripId = savedTripsSelect.value;

  if (!tripId) {
    setTripMessage("Please select a saved trip first.");
    return;
  }

  loadTripBtn.disabled = true;
  setTripMessage("Loading saved trip...");

  try {
    const savedTrip = await apiRequest(
      `${API_URL}/trips/${encodeURIComponent(tripId)}`
    );

    trip = savedTrip.places.map(place => {
      const existingPlace = places.find(
        item => item.id === Number(place.id)
      );

      return existingPlace || {
        id: Number(place.id),
        name: place.name,
        city: "Bengaluru",
        category: place.category,
        description: place.description || "",
        image: place.image_url || "",
        location: place.location || "",
        cost: Number(place.cost) || 0
      };
    });

    editingTripId = null;
    saveTripBtn.textContent = "Save Trip";
    tripNameInput.value = savedTrip.trip_name;

    renderPlaces();
    renderTrip();

    setTripMessage(`"${savedTrip.trip_name}" loaded successfully!`);
  } catch (error) {
    console.error("Load trip error:", error);
    setTripMessage(error.message);
  } finally {
    loadTripBtn.disabled = false;
  }
});

// -------------------- EDIT SELECTED SAVED TRIP --------------------
editTripBtn.addEventListener("click", async () => {
  const tripId = savedTripsSelect.value;

  if (!tripId) {
    setTripMessage("Select a saved trip to edit.");
    return;
  }

  editTripBtn.disabled = true;
  setTripMessage("Opening trip for editing...");

  try {
    const savedTrip = await apiRequest(
      `${API_URL}/trips/${encodeURIComponent(tripId)}`
    );

    trip = savedTrip.places.map(place => {
      const existingPlace = places.find(
        item => item.id === Number(place.id)
      );

      return existingPlace || {
        id: Number(place.id),
        name: place.name,
        city: "Bengaluru",
        category: place.category,
        description: place.description || "",
        image: place.image_url || "",
        location: place.location || "",
        cost: Number(place.cost) || 0
      };
    });

    editingTripId = Number(savedTrip.id);
    tripNameInput.value = savedTrip.trip_name;
    saveTripBtn.textContent = "Update Trip";

    renderPlaces();
    renderTrip();

    setTripMessage(
      "Edit mode: change the name or destinations, then click Update Trip."
    );

    document.getElementById("trip-planner").scrollIntoView({
      behavior: "smooth"
    });
  } catch (error) {
    console.error("Edit trip error:", error);
    setTripMessage(error.message);
  } finally {
    editTripBtn.disabled = false;
  }
});

// -------------------- DELETE SELECTED SAVED TRIP --------------------
deleteTripBtn.addEventListener("click", async () => {
  const tripId = savedTripsSelect.value;

  if (!tripId) {
    setTripMessage("Select a saved trip to delete.");
    return;
  }

  const selectedOption =
    savedTripsSelect.options[savedTripsSelect.selectedIndex];

  const confirmed = window.confirm(
    `Permanently delete "${selectedOption.textContent}"?`
  );

  if (!confirmed) return;

  deleteTripBtn.disabled = true;

  try {
    const result = await apiRequest(
      `${API_URL}/trips/${encodeURIComponent(tripId)}`,
      { method: "DELETE" }
    );

    if (editingTripId === Number(tripId)) {
      editingTripId = null;
      saveTripBtn.textContent = "Save Trip";
      trip = [];
      renderPlaces();
      renderTrip();
    }

    await loadSavedTrips();

    setTripMessage(result.message || "Trip deleted successfully!");
  } catch (error) {
    console.error("Delete trip error:", error);
    setTripMessage(error.message);
  } finally {
    deleteTripBtn.disabled = false;
  }
});

// -------------------- INITIALIZE --------------------
renderTrip();
loadPlaces();
loadSavedTrips();
