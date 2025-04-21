console.log("Script Loaded!");
// DOM elements
const modeToggle = document.getElementById("modeToggle");
const loginBtn = document.getElementById("loginBtn");
const bookingModal = document.getElementById("bookingModal");
const closeBookingModal = document.getElementById("closeBookingModal");
const cancelBooking = document.getElementById("cancelBooking");
const bookingForm = document.getElementById("bookingForm");
const packageType = document.getElementById("packageType");
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");

// Initialize
document.addEventListener("DOMContentLoaded", checkLoginStatus);

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
    const token = localStorage.getItem("token");
    if (!token) {
      //if not have login token
      Swal.fire({
        title: "Belum Login!",
        text: "Anda harus login terlebih dahulu sebelum memesan",
        icon: "warning",
        confirmButtonText: "Login Sekarang",
        showCancelButton: true,
        cancelButtonText: "Batal",
      }).then((result) => {
        if (result.isConfirmed) {
          //redirect to login page
          window.location.href = "/login";
        }
      });
      return;
    }

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
async function checkLoginStatus() {
  const token = localStorage.getItem("token");

  if (!token) {
    loginBtn.textContent = "Login";
    return;
  }

  try {
    const response = await fetch("/users/check-login", {
      headers: {
        Authorization: token,
      },
    });

    if (response.ok) {
      const data = await response.json();
      loginBtn.textContent = "Logout";
    } else {
      //if token not valid or expired
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      loginBtn.textContent = "Login";
    }
  } catch (error) {
    console.error("Error checking login status:", error);
    loginBtn.textContent = "Login";
  }
}

loginBtn.addEventListener("click", async () => {
  const token = localStorage.getItem("token");

  if (token) {
    try {
      //call logout endpoint
      const response = await fetch("/users/logout", {
        method: "POST",
        headers: {
          Authorization: token,
        },
      });

      //delete token from local storage
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      loginBtn.textContent = "Login";

      Swal.fire({
        title: "Berhasil",
        text: "Anda sudah logout",
        icon: "success",
      });
    } catch (error) {
      console.error("Error during logout:", error);
    }
  } else {
    window.location.href = "/login";
  }
});
