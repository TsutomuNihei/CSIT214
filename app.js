/* Login, navigation, booking, and browser-side persistence logic. */
(function () {
  "use strict";

  const store = window.PortalStore;
  const hours = Array.from({ length: 15 }, (_, index) => index + 8);
  const viewIds = ["login-view", "staff-login-view", "student-portal", "staff-portal"];

  const elements = {
    staffLoginLink: document.querySelector("#staff-login-link"),
    logoutButton: document.querySelector("#logout-button"),
    studentLoginForm: document.querySelector("#student-login-form"),
    staffLoginForm: document.querySelector("#staff-login-form"),
    studentLoginError: document.querySelector("#student-login-error"),
    staffLoginError: document.querySelector("#staff-login-error"),
    backToStudentLogin: document.querySelector("#back-to-student-login"),
    bookingForm: document.querySelector("#booking-form"),
    facility: document.querySelector("#facility"),
    equipmentWrap: document.querySelector("#equipment-option-wrap"),
    equipmentOption: document.querySelector("#equipment-option"),
    date: document.querySelector("#booking-date"),
    startTime: document.querySelector("#start-time"),
    endTime: document.querySelector("#end-time"),
    feedback: document.querySelector("#booking-feedback"),
    studentBookings: document.querySelector("#student-bookings"),
    staffBookings: document.querySelector("#staff-bookings"),
    accountDetails: document.querySelector("#account-details"),
    studentTabs: Array.from(document.querySelectorAll("[data-student-tab]"))
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showView(id) {
    viewIds.forEach((viewId) => document.querySelector(`#${viewId}`).classList.toggle("hidden", viewId !== id));
    const loggedIn = id === "student-portal" || id === "staff-portal";
    elements.staffLoginLink.classList.toggle("hidden", loggedIn || id === "staff-login-view");
    elements.logoutButton.classList.toggle("hidden", !loggedIn);
  }

  function showLoginError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
  }

  function getFacility(id) {
    return store.facilities.find((facility) => facility.id === id);
  }

  function selectedEquipment(formData) {
    return formData.get("facilityId") === "equipment" ? formData.get("equipmentOption") : "";
  }

  function toHour(time) {
    return Number(String(time).split(":")[0]);
  }

  function checkConflict(facilityId, date, startTime, endTime, equipmentOption) {
    const requestedStart = toHour(startTime);
    const requestedEnd = toHour(endTime);

    return store.getBookings().some((booking) =>
      booking.status !== "Cancelled" &&
      booking.facilityId === facilityId &&
      booking.date === date &&
      requestedStart < toHour(booking.endTime) &&
      requestedEnd > toHour(booking.startTime) &&
      (facilityId !== "equipment" || booking.equipmentOption === equipmentOption)
    );
  }

  window.checkConflict = checkConflict;

  function formatDate(dateString) {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(`${dateString}T00:00:00`));
  }

  function generateBookingId() {
    const ids = new Set(store.getBookings().map((booking) => booking.id));
    let id;
    do {
      id = `BK-${Math.floor(10000 + Math.random() * 90000)}`;
    } while (ids.has(id));
    return id;
  }

  function showBookingFeedback(type, message) {
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback ${type}`;
  }

  function bookingCard(booking, allowCancel) {
    const cancelled = booking.status === "Cancelled";
    const itemName = booking.equipmentOption
      ? `${booking.facilityName} — ${booking.equipmentOption}`
      : booking.facilityName;

    return `
      <article class="booking-card">
        <div>
          <div>
            <h3>${escapeHtml(itemName)}</h3>
            <span class="status ${cancelled ? "cancelled" : ""}">${escapeHtml(booking.status)}</span>
          </div>
          <p>${escapeHtml(formatDate(booking.date))} · ${escapeHtml(booking.startTime)}–${escapeHtml(booking.endTime)}</p>
          <small>${escapeHtml(booking.id)} · Room ${escapeHtml(booking.roomNumber)}</small>
        </div>
        ${allowCancel && !cancelled ? `
          <button type="button" data-cancel-id="${escapeHtml(booking.id)}" class="cancel-button">
            Cancel booking
          </button>
        ` : ""}
      </article>
    `;
  }

  function renderBookings() {
    const allBookings = store.getBookings();
    const studentBookings = allBookings.filter((booking) =>
      booking.roomNumber.toUpperCase() === store.student.roomNumber.toUpperCase() &&
      booking.status !== "Cancelled"
    );

    elements.studentBookings.innerHTML = studentBookings.length
      ? studentBookings.map((booking) => bookingCard(booking, true)).join("")
      : '<div class="empty">You have no current bookings.</div>';

    elements.staffBookings.innerHTML = allBookings.length
      ? allBookings.slice().reverse().map((booking) => bookingCard(booking, true)).join("")
      : '<div class="empty">No bookings have been made yet.</div>';
  }

  function updateEquipmentOptions() {
    const facility = getFacility(elements.facility.value);
    const isEquipment = facility && facility.id === "equipment";
    elements.equipmentWrap.classList.toggle("hidden", !isEquipment);
    elements.equipmentOption.required = isEquipment;
    elements.equipmentOption.innerHTML = isEquipment
      ? facility.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")
      : "";
  }

  function activateStudentTab(button) {
    elements.studentTabs.forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      document.querySelector(`#${tab.dataset.studentTab}`).classList.toggle("hidden", !active);
    });
  }

  function handleBooking(event) {
    event.preventDefault();
    const formData = new FormData(elements.bookingForm);
    const facility = getFacility(formData.get("facilityId"));
    const date = formData.get("date");
    const startTime = formData.get("startTime");
    const endTime = formData.get("endTime");
    const equipmentOption = selectedEquipment(formData);

    if (!facility || !date || !startTime || !endTime || (facility.id === "equipment" && !equipmentOption)) {
      showBookingFeedback("error", "Please complete all booking fields.");
      return;
    }
    if (date < store.today(new Date())) {
      showBookingFeedback("error", "The booking date cannot be in the past.");
      return;
    }
    const duration = toHour(endTime) - toHour(startTime);
    if (duration <= 0) {
      showBookingFeedback("error", "The end time must be after the start time.");
      return;
    }
    if (facility.id !== "equipment" && duration > 2) {
      showBookingFeedback("error", "Rooms can be booked for a maximum of two hours.");
      return;
    }
    if (checkConflict(facility.id, date, startTime, endTime, equipmentOption)) {
      showBookingFeedback("error", "That room or item is already booked for the selected time.");
      return;
    }

    const booking = store.addBooking({
      id: generateBookingId(),
      roomNumber: store.student.roomNumber,
      residentName: store.student.name,
      facilityId: facility.id,
      facilityName: facility.name,
      equipmentOption,
      date,
      startTime,
      endTime,
      status: "Confirmed"
    });

    elements.bookingForm.reset();
    elements.date.min = store.today(new Date());
    elements.startTime.value = "08:00";
    elements.endTime.value = "10:00";
    updateEquipmentOptions();
    renderBookings();
    showBookingFeedback("success", `Booking confirmed. Your reference is ${booking.id}.`);
  }

  function cancelFromClick(event) {
    const button = event.target.closest("[data-cancel-id]");
    if (!button) return;
    if (store.cancelBooking(button.dataset.cancelId)) renderBookings();
  }

  function bindEvents() {
    elements.staffLoginLink.addEventListener("click", () => showView("staff-login-view"));
    elements.backToStudentLogin.addEventListener("click", () => showView("login-view"));
    elements.logoutButton.addEventListener("click", () => {
      elements.studentLoginForm.reset();
      elements.staffLoginForm.reset();
      showView("login-view");
    });

    elements.studentLoginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(elements.studentLoginForm);
      const roomMatches = String(formData.get("roomNumber")).trim().toUpperCase() === store.credentials.student.user;
      const passwordMatches = formData.get("password") === store.credentials.student.password;
      if (!roomMatches || !passwordMatches) {
        showLoginError(elements.studentLoginError, "Incorrect room number or password.");
        return;
      }
      elements.studentLoginError.classList.add("hidden");
      renderBookings();
      showView("student-portal");
    });

    elements.staffLoginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(elements.staffLoginForm);
      const userMatches = String(formData.get("user")).trim() === store.credentials.staff.user;
      const passwordMatches = formData.get("password") === store.credentials.staff.password;
      if (!userMatches || !passwordMatches) {
        showLoginError(elements.staffLoginError, "Incorrect staff user ID or password.");
        return;
      }
      elements.staffLoginError.classList.add("hidden");
      renderBookings();
      showView("staff-portal");
    });

    elements.studentTabs.forEach((tab) => tab.addEventListener("click", () => activateStudentTab(tab)));
    elements.facility.addEventListener("change", updateEquipmentOptions);
    elements.bookingForm.addEventListener("submit", handleBooking);
    elements.studentBookings.addEventListener("click", cancelFromClick);
    elements.staffBookings.addEventListener("click", cancelFromClick);
  }

  function initialise() {
    elements.facility.innerHTML = store.facilities
      .map((facility) => `<option value="${escapeHtml(facility.id)}">${escapeHtml(facility.name)}</option>`)
      .join("");
    const timeOptions = hours
      .map((hour) => {
        const time = `${String(hour).padStart(2, "0")}:00`;
        return `<option value="${time}">${time}</option>`;
      })
      .join("");
    elements.startTime.innerHTML = timeOptions;
    elements.endTime.innerHTML = timeOptions;
    elements.startTime.value = "08:00";
    elements.endTime.value = "10:00";
    elements.date.min = store.today(new Date());
    elements.accountDetails.innerHTML = `
      <div><dt>Name</dt><dd>${escapeHtml(store.student.name)}</dd></div>
      <div><dt>Room number</dt><dd>${escapeHtml(store.student.roomNumber)}</dd></div>
      <div><dt>Email</dt><dd>${escapeHtml(store.student.email)}</dd></div>
      <div><dt>Residence</dt><dd>${escapeHtml(store.student.residence)}</dd></div>
    `;
    updateEquipmentOptions();
    renderBookings();
    bindEvents();
  }

  initialise();
})();
