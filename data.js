/* Mock data layer. JSON-shaped records are persisted in this browser only. */
(function () {
  "use strict";

  const BOOKINGS_KEY = "coastlinkBookingsV1";

  const facilities = [
    { id: "harbour-hall", name: "Badminton Court", capacity: 120, type: "room" },
    { id: "seaside-meeting", name: "Seaside Meeting Room", capacity: 20, type: "room" },
    { id: "coastal-court", name: "Coastal Sports Court", capacity: 30, type: "room" },
    { id: "foreshore-pavilion", name: "Foreshore Pavilion", capacity: 50, type: "room" },
    {
      id: "equipment",
      name: "Equipment hire",
      capacity: 1,
      type: "equipment",
      options: ["Portable PA system", "Projector kit", "BBQ trailer", "Goal nets", "Line marker", "Folding tables"]
    }
  ];

  const hirer = {
    accountId: "CL-HIRER-104",
    name: "Buzz Lightyear",
    organisation: "CoastLink Netball Club",
    email: "buzz.lightyear@example.com",
    phone: "0412 555 018"
  };

  const seedBookings = [
    {
      id: "BK-10421",
      roomNumber: "CL-HIRER-104",
      residentName: "Buzz Lightyear",
      facilityId: "coastal-court",
      facilityName: "Coastal Sports Court",
      equipmentOption: "",
      date: "2026-09-18",
      startTime: "16:00",
      endTime: "18:00",
      status: "Confirmed"
    },
    {
      id: "BK-10408",
      roomNumber: "CL-HIRER-218",
      residentName: "Tung Tung Sahur",
      facilityId: "harbour-hall",
      facilityName: "Badminton Court",
      equipmentOption: "",
      date: "2026-09-20",
      startTime: "10:00",
      endTime: "12:00",
      status: "Confirmed"
    },
    {
      id: "BK-10390",
      roomNumber: "CL-HIRER-104",
      residentName: "Buzz Lightyear",
      facilityId: "equipment",
      facilityName: "Equipment hire",
      equipmentOption: "Portable PA system",
      date: "2026-09-12",
      startTime: "09:00",
      endTime: "13:00",
      status: "Cancelled"
    }
  ];

  function readBookings() {
    const storedValue = localStorage.getItem(BOOKINGS_KEY);
    if (!storedValue) {
      saveBookings(seedBookings);
      return seedBookings.slice();
    }

    try {
      const bookings = JSON.parse(storedValue);
      if (!Array.isArray(bookings)) return seedBookings.slice();
      return bookings.map((booking) => {
        if (!booking.timeSlot || booking.startTime) return booking;
        const [startTime, endTime] = booking.timeSlot.split(" - ");
        return { ...booking, startTime, endTime };
      });
    } catch (error) {
      console.warn("Stored bookings could not be read.", error);
      return seedBookings.slice();
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
      student: { user: "6767C", password: "Nyanpasu" },
      staff: { user: "UOW rule rule", password: "password!" }
    },
    student: {
      roomNumber: hirer.accountId,
      name: hirer.name,
      email: hirer.email,
      residence: hirer.organisation,
      phone: hirer.phone,
      organisation: hirer.organisation
    },
    facilities,
    seedBookings,

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
