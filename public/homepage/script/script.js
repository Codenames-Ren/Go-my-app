// script.js - Versi fix + animasi tambahan

console.log("Script Loaded!");

// --- DOM SELECTORS ---
const modeToggle = document.getElementById("modeToggle");
const loginBtn = document.getElementById("loginBtn");
const bookingModal = document.getElementById("bookingModal");
const closeBookingModal = document.getElementById("closeBookingModal");
const cancelBooking = document.getElementById("cancelBooking");
const bookingForm = document.getElementById("bookingForm");
const packageType = document.getElementById("packageType");
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");

// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus();
  AOS.init({
    duration: 800,
    easing: "ease-in-out",
    once: true,
    mirror: false,
  });
});

// --- DARK MODE TOGGLE ---
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

if (modeToggle) {
  modeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode")
    );
  });
}

// --- MOBILE NAV TOGGLE ---
if (hamburger && navMenu) {
  hamburger.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });
}

// --- NAVIGATION HANDLING ---
const pageLinks = document.querySelectorAll("[data-page]");
pageLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const targetPage = link.getAttribute("data-page");
    setActivePage(targetPage);
  });
});

function setActivePage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((page) => page.classList.remove("active"));
  document
    .querySelectorAll("[data-page]")
    .forEach((link) => link.classList.remove("active"));

  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add("active");

  document.querySelectorAll(`[data-page="${pageId}"]`).forEach((link) => {
    link.classList.add("active");
  });
}

// --- PACKAGE BOOKING ---
const bookPackageButtons = document.querySelectorAll(".book-package");
bookPackageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const token = localStorage.getItem("token");

    if (!token) {
      Swal.fire({
        title: "Belum Login!",
        text: "Anda harus login terlebih dahulu sebelum memesan",
        icon: "warning",
        confirmButtonText: "Login Sekarang",
        showCancelButton: true,
        cancelButtonText: "Batal",
      }).then((result) => {
        if (result.isConfirmed) window.location.href = "/login";
      });
      return;
    }

    const packageName = button.getAttribute("data-package");
    if (packageType)
      packageType.textContent =
        packageName.charAt(0).toUpperCase() + packageName.slice(1);
    if (bookingModal) bookingModal.classList.add("active");
  });
});

// --- CLOSE MODAL ---
closeBookingModal?.addEventListener("click", () =>
  bookingModal?.classList.remove("active")
);
cancelBooking?.addEventListener("click", () =>
  bookingModal?.classList.remove("active")
);

// --- FORM SUBMIT ---
if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("bookingName")?.value;
    const email = document.getElementById("bookingEmail")?.value;
    const phoneNumber = document.getElementById("bookingNumber")?.value;
    const ticketType = document.getElementById("concertCount")?.value;
    const guestsCount = document.getElementById("guestCount")?.value;

    if (!name || !email || !phoneNumber || !ticketType || !guestsCount) {
      return Swal.fire({
        title: "Error",
        text: "Harap isi semua field yang diperlukan!",
        icon: "error",
      });
    }

    bookingModal?.classList.remove("active");

    const { isConfirmed, value: paymentMethod } = await Swal.fire({
      title: "Pilih Metode Pembayaran",
      input: "radio",
      inputOptions: {
        bank: "BCA : 7445866678 - A/N Testing",
        ewallet: "Dana : 081217778899",
      },
      inputValidator: (value) => {
        if (!value) return "Pilih salah satu metode pembayaran!";
      },
      confirmButtonText: "Bayar",
      showCancelButton: true,
      cancelButtonText: "Batal",
    });

    if (!isConfirmed) return;

    Swal.fire({
      title: "Sukses!",
      html: `Pesanan kamu telah dikirim!
      <br><strong>Metode Pembayaran: </strong> ${paymentMethod}`,
      icon: "success",
    });

    bookingForm.reset();
  });
}

// --- CHECK LOGIN STATUS ---
async function checkLoginStatus() {
  const token = localStorage.getItem("token");
  if (!token) return updateLoginButton(false);

  try {
    const response = await fetch("/users/check-login", {
      headers: {
        Authorization: token,
      },
    });

    if (response.ok) {
      updateLoginButton(true);
    } else {
      throw new Error("Invalid token");
    }
  } catch (error) {
    console.error("Login check error:", error);
    localStorage.removeItem("token");
    updateLoginButton(false);
  }
}

// --- HANDLE LOGIN/LOGOUT ---
if (loginBtn) {
  console.log("Setup login button click handler");

  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (token) {
      try {
        await fetch("/users/logout", {
          method: "POST",
          headers: { Authorization: token },
        });
        localStorage.removeItem("token");
        updateLoginButton(false);

        Swal.fire({
          title: "Logout Berhasil",
          text: "Sampai jumpa lagi!",
          icon: "success",
        });
      } catch (err) {
        console.error("Logout error:", err);

        localStorage.removeItem("token");
        updateLoginButton(false);
      }
    } else {
      window.location.href = "/login";
    }
  });
}

function updateLoginButton(loggedIn) {
  if (loginBtn) loginBtn.textContent = loggedIn ? "Logout" : "Login";
}
