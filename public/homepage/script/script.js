// DOM elements
const modeToggle = document.getElementById("modeToggle");
const loginBtn = document.getElementById("loginBtn");
const bookingModal = document.getElementById("bookingModal");
const loginModal = document.getElementById("loginModal");
const closeBookingModal = document.getElementById("closeBookingModal");
const closeLoginModal = document.getElementById("closeLoginModal");
const cancelBooking = document.getElementById("cancelBooking");
const cancelLogin = document.getElementById("cancelLogin");
const loginForm = document.getElementById("loginForm");
const bookingForm = document.getElementById("bookingForm");
const packageType = document.getElementById("packageType");
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");

// Navigation handling
const pageLinks = document.querySelectorAll("[data-page]");
pageLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const targetPage = link.getAttribute("data-page");
    setActivePage(targetPage);
  });
});

function setActivePage(pageId) {
  // Remove active class from all pages and nav links
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  document.querySelectorAll("[data-page]").forEach((link) => {
    link.classList.remove("active");
  });

  // Add active class to selected page and nav link
  document.getElementById(pageId).classList.add("active");
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach((link) => {
    link.classList.add("active");
  });
}

// Dark mode toggle
modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark-mode")
  );
});

// Check for saved dark mode preference
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

// Mobile menu toggle
hamburger.addEventListener("click", () => {
  navMenu.classList.toggle("active");
});

// Package booking
const bookPackageButtons = document.querySelectorAll(".book-package");
bookPackageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const packageName = button.getAttribute("data-package");
    packageType.textContent =
      packageName.charAt(0).toUpperCase() + packageName.slice(1);
    bookingModal.classList.add("active");
  });
});

// Close booking modal
closeBookingModal.addEventListener("click", () => {
  bookingModal.classList.remove("active");
});

cancelBooking.addEventListener("click", () => {
  bookingModal.classList.remove("active");
});

// Login modal
loginBtn.addEventListener("click", () => {
  if (loginBtn.textContent === "Login") {
    loginModal.classList.add("active");
  } else {
    handleLogout();
  }
});

// Close login modal
closeLoginModal.addEventListener("click", () => {
  loginModal.classList.remove("active");
});

cancelLogin.addEventListener("click", () => {
  loginModal.classList.remove("active");
});

// Close modals when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === bookingModal) {
    bookingModal.classList.remove("active");
  }
  if (e.target === loginModal) {
    loginModal.classList.remove("active");
  }
});

// Login form submit
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // Simplified login (in a real app, you'd have proper authentication)
  if (email && password) {
    loginModal.classList.remove("active");
    handleLogin(email);
  }
});

// Booking form submit
bookingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("bookingName").value;
  const email = document.getElementById("bookingEmail").value;
  const checkIn = document.getElementById("checkInDate").value;
  const checkOut = document.getElementById("checkOutDate").value;
  const guests = document.getElementById("guestCount").value;

  // Simplified booking (in a real app, you'd send this to the server)
  if (name && email && checkIn && checkOut) {
    alert("Booking successful! Check your email for confirmation.");
    bookingModal.classList.remove("active");
    bookingForm.reset();
  }
});

// Handle login
function handleLogin(email) {
  // Store login status
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userEmail", email);

  // Update UI
  loginBtn.textContent = "Logout";
}

// Handle logout
function handleLogout() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");

  // Update UI
  loginBtn.textContent = "Login";
}

// Check if user is logged in on page load
function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (isLoggedIn) {
    loginBtn.textContent = "Logout";
  } else {
    loginBtn.textContent = "Login";
  }
}

// Initialize
checkLoginStatus();
