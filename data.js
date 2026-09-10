/* Mock data layer. JSON-shaped records are persisted in this browser only. */
(function () {
  "use strict";

  const BOOKINGS_KEY = "residencePortalBookingsV1";

  const facilities = [
    { id: "study-a", name: "Study Room A", capacity: 8 },
    { id: "study-b", name: "Study Room B", capacity: 8 },
    { id: "tv-room", name: "Main TV Room", capacity: 20 },
    { id: "projector-room", name: "Projector Room", capacity: 15 },
    {
      id: "equipment",
      name: "Equipment",
      capacity: 1,
      options: ["XBOX", "Baseball", "Badminton", "Football", "Basketball", "Volleyball"]
    }
  ];

  const student = {
    roomNumber: "67C",
    name: "Proposed Student",
    email: "student@uow.edu.au",
    residence: "UOW Student Residence"
  };
  //optional remove the try catch block
  function readBookings() {
    const storedValue = localStorage.getItem(BOOKINGS_KEY);
    if (!storedValue) return [];

    try {
      const bookings = JSON.parse(storedValue);
      if (!Array.isArray(bookings)) return [];

      // Convert bookings made by the earlier fixed-slot version.
      return bookings.map((booking) => {
        if (!booking.timeSlot || booking.startTime) return booking;
        const [startTime, endTime] = booking.timeSlot.split(" - ");
        return { ...booking, startTime, endTime };
      });
    } catch (error) {
      console.warn("Stored bookings could not be read.", error);
      return [];
    }
  }

  function saveBookings(bookings) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }

  function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  window.PortalStore = {
    credentials: {
      student: { user: "67C", password: "Nyanpasu" },
      staff: { user: "UOW rule rule", password: "SkibidiToilet" }
    },
    student,
    facilities,

    getBookings: readBookings,

    addBooking(booking) {
      const bookings = readBookings();
      bookings.push(booking);
      saveBookings(bookings);
      return booking;
    },

    cancelBooking(id) {
      const bookings = readBookings();
      const booking = bookings.find((item) => item.id === id);
      if (!booking || booking.status === "Cancelled") return false;
      booking.status = "Cancelled";
      saveBookings(bookings);
      return true;
    },

    today: toLocalDateString
  };
})();
