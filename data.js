/* Persistent mock data and small state helpers for the prototype. */
(function () {
  "use strict";

  const FACILITIES_KEY = "councilFacilities";
  const BOOKINGS_KEY = "councilBookings";

  const defaultFacilities = [
    {
      id: "FAC-001",
      name: "Main Community Hall",
      capacity: 100,
      hourlyRate: 50,
      status: "available"
    },
    {
      id: "FAC-002",
      name: "Studio Room B",
      capacity: 20,
      hourlyRate: 25,
      status: "available"
    },
    {
      id: "FAC-003",
      name: "Sports Pavilion",
      capacity: 40,
      hourlyRate: 35,
      status: "available"
    }
  ];

  function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function tomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toLocalDateString(tomorrow);
  }

  const defaultBookings = [
    {
      id: "BK-10482",
      facilityId: "FAC-001",
      facilityName: "Main Community Hall",
      userName: "Alex Morgan",
      email: "alex.morgan@example.com",
      attendees: 65,
      date: tomorrowDate(),
      timeSlot: "11:00 - 13:00",
      status: "Confirmed"
    },
    {
      id: "BK-23715",
      facilityId: "FAC-002",
      facilityName: "Studio Room B",
      userName: "Priya Shah",
      email: "priya.shah@example.com",
      attendees: 12,
      date: tomorrowDate(),
      timeSlot: "14:00 - 16:00",
      status: "Confirmed"
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return Array.isArray(parsed) ? parsed : clone(fallback);
    } catch (error) {
      console.warn(`Could not read ${key}; using defaults.`, error);
      return clone(fallback);
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Seed each collection only once so refreshes never overwrite user changes.
  if (localStorage.getItem(FACILITIES_KEY) === null) {
    write(FACILITIES_KEY, defaultFacilities);
  }
  if (localStorage.getItem(BOOKINGS_KEY) === null) {
    write(BOOKINGS_KEY, defaultBookings);
  }

  window.FacilityStore = {
    getFacilities() {
      return read(FACILITIES_KEY, defaultFacilities);
    },

    getBookings() {
      return read(BOOKINGS_KEY, defaultBookings);
    },

    saveBookings(bookings) {
      write(BOOKINGS_KEY, bookings);
      return bookings;
    },

    addBooking(booking) {
      const bookings = this.getBookings();
      bookings.push(booking);
      this.saveBookings(bookings);
      return booking;
    },

    cancelBooking(bookingId) {
      const bookings = this.getBookings();
      const booking = bookings.find((item) => item.id === bookingId);

      if (!booking || booking.status === "Cancelled") {
        return false;
      }

      booking.status = "Cancelled";
      this.saveBookings(bookings);
      return true;
    },

    today: toLocalDateString
  };
})();
