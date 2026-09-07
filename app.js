/* Booking, conflict, rendering, and interaction logic. */
(function () {
  "use strict";

  const store = window.FacilityStore;
  const timeSlots = [
    "09:00 - 11:00",
    "11:00 - 13:00",
    "14:00 - 16:00",
    "18:00 - 20:00"
  ];

  const elements = {
    form: document.querySelector("#booking-form"),
    facility: document.querySelector("#facility"),
    date: document.querySelector("#booking-date"),
    timeSlot: document.querySelector("#time-slot"),
    attendees: document.querySelector("#attendees"),
    feedback: document.querySelector("#feedback-region"),
    summary: document.querySelector("#facility-summary"),
    bookingsBody: document.querySelector("#bookings-body"),
    emptyState: document.querySelector("#empty-state"),
    bookingCount: document.querySelector("#booking-count"),
    tabs: Array.from(document.querySelectorAll('[role="tab"]')),
    publicPanel: document.querySelector("#public-panel"),
    staffPanel: document.querySelector("#staff-panel")
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getFacility(facilityId) {
    return store.getFacilities().find((facility) => facility.id === facilityId);
  }

  /**
   * Returns true when an active booking occupies the exact facility/date/slot.
   */
  function checkConflict(facilityId, date, timeSlot) {
    return store.getBookings().some((booking) =>
      booking.status !== "Cancelled" &&
      booking.facilityId === facilityId &&
      booking.date === date &&
      booking.timeSlot === timeSlot
    );
  }

  // Exposed for easy demonstration and marking during the assignment review.
  window.checkConflict = checkConflict;

  function showFeedback(type, message) {
    const styles = type === "success"
      ? {
          wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
          icon: "bg-emerald-100 text-emerald-700",
          path: '<path d="m7 12 3 3 7-7"/><circle cx="12" cy="12" r="9"/>'
        }
      : {
          wrapper: "border-rose-200 bg-rose-50 text-rose-900",
          icon: "bg-rose-100 text-rose-700",
          path: '<path d="M12 8v5m0 3h.01"/><circle cx="12" cy="12" r="9"/>'
        };

    elements.feedback.innerHTML = `
      <div role="alert" class="flex items-start gap-3 rounded-lg border p-4 ${styles.wrapper}">
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full ${styles.icon}" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="2">${styles.path}</svg>
        </span>
        <p class="pt-0.5 text-sm font-semibold">${escapeHtml(message)}</p>
      </div>
    `;
    elements.feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearFeedback() {
    elements.feedback.innerHTML = "";
  }

  function renderFormOptions() {
    const facilities = store.getFacilities();

    elements.facility.innerHTML = facilities.map((facility) => `
      <option value="${escapeHtml(facility.id)}">
        ${escapeHtml(facility.name)}${facility.status === "closed" ? " (Closed)" : ""}
      </option>
    `).join("");

    elements.timeSlot.innerHTML = timeSlots.map((slot) =>
      `<option value="${slot}">${slot}</option>`
    ).join("");
  }

  function renderFacilitySummary() {
    const facility = getFacility(elements.facility.value);
    if (!facility) {
      elements.summary.innerHTML = "";
      return;
    }

    const hasSchedule = elements.date.value && elements.timeSlot.value;
    const conflict = hasSchedule &&
      checkConflict(facility.id, elements.date.value, elements.timeSlot.value);
    const open = facility.status === "available";
    let availability = open ? "Available for bookings" : "Temporarily closed";
    let availabilityClass = open
      ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/20"
      : "bg-rose-400/15 text-rose-100 ring-rose-300/20";

    if (hasSchedule && open) {
      availability = conflict ? "Selected slot is already booked" : "Selected slot is available";
      availabilityClass = conflict
        ? "bg-rose-400/15 text-rose-100 ring-rose-300/20"
        : "bg-emerald-400/15 text-emerald-100 ring-emerald-300/20";
    }

    elements.summary.innerHTML = `
      <div class="border-b border-white/10 p-6">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-brand-100">Selected facility</p>
        <h2 class="mt-2 text-2xl font-bold">${escapeHtml(facility.name)}</h2>
        <span class="mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${availabilityClass}">
          ${escapeHtml(availability)}
        </span>
      </div>
      <dl class="grid grid-cols-2 gap-px bg-white/10">
        <div class="bg-brand-900 p-5">
          <dt class="text-xs font-semibold uppercase tracking-wide text-brand-100">Capacity</dt>
          <dd class="mt-1 text-xl font-bold">${facility.capacity} people</dd>
        </div>
        <div class="bg-brand-900 p-5">
          <dt class="text-xs font-semibold uppercase tracking-wide text-brand-100">Hourly rate</dt>
          <dd class="mt-1 text-xl font-bold">$${facility.hourlyRate}/hr</dd>
        </div>
      </dl>
      <div class="p-6 text-sm leading-6 text-brand-100">
        Select a date and time to see live slot availability before confirming.
      </div>
    `;

    elements.attendees.max = String(facility.capacity);
  }

  function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function renderBookings() {
    const bookings = store.getBookings();
    elements.bookingCount.textContent = `${bookings.length} booking${bookings.length === 1 ? "" : "s"}`;
    elements.emptyState.classList.toggle("hidden", bookings.length !== 0);
    elements.bookingsBody.closest("table").classList.toggle("hidden", bookings.length === 0);

    elements.bookingsBody.innerHTML = bookings.map((booking) => {
      const cancelled = booking.status === "Cancelled";
      const statusClass = cancelled
        ? "bg-slate-100 text-slate-600 ring-slate-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";

      return `
        <tr class="${cancelled ? "bg-slate-50/60" : "bg-white"}">
          <td class="whitespace-nowrap px-5 py-4 text-sm font-bold text-brand-700">${escapeHtml(booking.id)}</td>
          <td class="px-5 py-4">
            <p class="whitespace-nowrap text-sm font-semibold text-slate-900">${escapeHtml(booking.userName)}</p>
            <p class="whitespace-nowrap text-xs text-slate-500">${escapeHtml(booking.email)}</p>
          </td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700">${escapeHtml(booking.facilityName)}</td>
          <td class="whitespace-nowrap px-5 py-4">
            <p class="text-sm font-semibold text-slate-700">${escapeHtml(formatDate(booking.date))}</p>
            <p class="text-xs text-slate-500">${escapeHtml(booking.timeSlot)}</p>
          </td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700">${booking.attendees}</td>
          <td class="whitespace-nowrap px-5 py-4">
            <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass}">
              ${escapeHtml(booking.status)}
            </span>
          </td>
          <td class="whitespace-nowrap px-5 py-4 text-right">
            ${cancelled ? '<span class="text-xs font-semibold text-slate-400">No action</span>' : `
              <button type="button" data-cancel-id="${escapeHtml(booking.id)}"
                class="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100">
                Cancel Booking
              </button>
            `}
          </td>
        </tr>
      `;
    }).join("");
  }

  function generateBookingId() {
    const existingIds = new Set(store.getBookings().map((booking) => booking.id));
    let id;

    do {
      const number = Math.floor(10000 + Math.random() * 90000);
      id = `BK-${number}`;
    } while (existingIds.has(id));

    return id;
  }

  function validateForm(formData) {
    const required = ["facilityId", "date", "timeSlot", "attendees", "fullName", "email"];
    if (required.some((field) => !String(formData.get(field) || "").trim())) {
      return "Please complete all required fields.";
    }

    const facility = getFacility(formData.get("facilityId"));
    if (!facility) {
      return "Please select a valid facility.";
    }
    if (facility.status !== "available") {
      return `${facility.name} is currently closed and cannot accept bookings.`;
    }
    if (formData.get("date") < store.today(new Date())) {
      return "Booking date cannot be in the past.";
    }

    const attendees = Number(formData.get("attendees"));
    if (!Number.isInteger(attendees) || attendees < 1) {
      return "Attendee count must be a whole number greater than zero.";
    }
    if (attendees > facility.capacity) {
      return `Attendee count exceeds the capacity of ${facility.name} (${facility.capacity} people).`;
    }

    const emailInput = document.querySelector("#email");
    if (!emailInput.validity.valid) {
      return "Please enter a valid email address.";
    }

    return "";
  }

  function handleBookingSubmit(event) {
    event.preventDefault();
    clearFeedback();

    const formData = new FormData(elements.form);
    const validationError = validateForm(formData);
    if (validationError) {
      showFeedback("error", validationError);
      return;
    }

    const facility = getFacility(formData.get("facilityId"));
    const date = formData.get("date");
    const timeSlot = formData.get("timeSlot");

    if (checkConflict(facility.id, date, timeSlot)) {
      showFeedback(
        "error",
        `Conflict Detected: ${facility.name} is already booked for ${timeSlot} on ${date}.`
      );
      renderFacilitySummary();
      return;
    }

    const booking = {
      id: generateBookingId(),
      facilityId: facility.id,
      facilityName: facility.name,
      userName: formData.get("fullName").trim(),
      email: formData.get("email").trim(),
      attendees: Number(formData.get("attendees")),
      date,
      timeSlot,
      status: "Confirmed"
    };

    store.addBooking(booking);
    elements.form.reset();
    elements.date.min = store.today(new Date());
    renderFacilitySummary();
    renderBookings();
    showFeedback("success", `Booking confirmed. Your Booking Reference ID is ${booking.id}.`);
  }

  function activateTab(tab) {
    elements.tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
      item.classList.toggle("border-brand-600", active);
      item.classList.toggle("text-brand-700", active);
      item.classList.toggle("border-transparent", !active);
      item.classList.toggle("text-slate-500", !active);
    });

    const publicActive = tab.id === "public-tab";
    elements.publicPanel.hidden = !publicActive;
    elements.staffPanel.hidden = publicActive;
  }

  function bindEvents() {
    elements.form.addEventListener("submit", handleBookingSubmit);

    [elements.facility, elements.date, elements.timeSlot].forEach((input) => {
      input.addEventListener("change", renderFacilitySummary);
    });

    elements.tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activateTab(tab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        const offset = event.key === "ArrowRight" ? 1 : -1;
        const nextTab = elements.tabs[(index + offset + elements.tabs.length) % elements.tabs.length];
        activateTab(nextTab);
        nextTab.focus();
      });
    });

    // Delegation keeps actions working after every table rerender.
    elements.bookingsBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cancel-id]");
      if (!button) return;

      if (store.cancelBooking(button.dataset.cancelId)) {
        renderBookings();
        renderFacilitySummary();
      }
    });
  }

  function initialise() {
    renderFormOptions();
    elements.date.min = store.today(new Date());
    renderFacilitySummary();
    renderBookings();
    bindEvents();
  }

  initialise();
})();
