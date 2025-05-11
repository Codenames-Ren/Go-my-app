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
let selectedConcertName = "";

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
    selectedConcertName = button.getAttribute("data-concert");

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

    //Payment Method
    const { isConfirmed, value } = await Swal.fire({
      title: "Pilih Metode Pembayaran",
      html: `
        <select id="paymentSelect" class="swal2-input" onchange="showSubOptions()">
          <option value="">-- Pilih Metode --</option>
          <option value="Transfer Bank">Transfer Bank</option>
          <option value="E-Wallet">E-Wallet</option>
        </select>
    
        <div id="subOptions" style="margin-top: 1rem; text-align: left;"></div>
      `,
      preConfirm: () => {
        const selectedMethod = document.getElementById("paymentSelect").value;
        const checkedSub = document.querySelector(
          'input[name="subOption"]:checked'
        );
        if (!selectedMethod || !checkedSub) {
          Swal.showValidationMessage(
            "Pilih metode utama dan salah satu sub-pilihan."
          );
          return false;
        }
        return {
          method: selectedMethod,
          sub: checkedSub.value,
        };
      },
      showCancelButton: true,
      confirmButtonText: "Bayar",
      cancelButtonText: "Batal",
      didOpen: () => {
        // Inject sub-options handler saat swal muncul
        window.showSubOptions = function () {
          const method = document.getElementById("paymentSelect").value;
          const subDiv = document.getElementById("subOptions");
          if (method === "Transfer Bank") {
            subDiv.innerHTML = `
              <label><input type="radio" name="subOption" value="BCA : 7445866678 - A/N Testing"> BCA</label><br>
              <label><input type="radio" name="subOption" value="BRI : 1234567890 - A/N Testing"> BRI</label><br>
              <label><input type="radio" name="subOption" value="Mandiri : 9876543210 - A/N Testing"> Mandiri</label>
            `;
          } else if (method === "E-Wallet") {
            subDiv.innerHTML = `
              <label><input type="radio" name="subOption" value="DANA : 081217778899 - Harmony Music"> DANA</label><br>
              <label><input type="radio" name="subOption" value="OVO : 081217778899 - Harmony Music"> OVO</label><br>
              <label><input type="radio" name="subOption" value="GoPay : 081217778899 - Harmony Music"> GoPay</label>
            `;
          } else {
            subDiv.innerHTML = "";
          }
        };
      },
    });

    //Buy Button Validation
    if (!isConfirmed) return;
    let ticketLabel = "";
    switch (ticketType) {
      case "1":
        ticketLabel = "Regular";
        break;

      case "2":
        ticketLabel = "VIP";
        break;

      case "3":
        ticketLabel = "VVIP";
        break;

      default:
        ticketLabel = "Not Defined";
    }

    const payload = {
      name,
      email,
      phone_number: phoneNumber,
      ticket_type: ticketLabel,
      order_count: parseInt(guestsCount),
      payment_to: value.sub,
      event_name: selectedConcertName,
    };

    let orderId = null;

    try {
      const response = await fetch("/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token"),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        return Swal.fire(
          "Gagal",
          data.error || "Gagal Menyimpan Pesanan",
          "error"
        );
      }

      console.log("Server response:", data);

      orderId = data.order_number;

      console.log("Extracted Order ID:", orderId);

      if (!orderId) {
        return Swal.fire(
          "Error",
          "Tidak dapat mendapatkan ID pesanan dari server",
          "error"
        );
      }
    } catch (err) {
      console.error("Error Creating Order:", err);
      return Swal.fire("error", "Gagal Menyimpan pesanan ke server", "error");
    }

    //Confirmation Order
    const confirmOrder = await Swal.fire({
      title: "Konfirmasi Pesanan",
      html: `
          <div style="text-align: left">
            <p><strong>Nama:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>No. HP:</strong> ${phoneNumber}</p>
            <p><strong>Nama Event:</strong> ${selectedConcertName}</p>
            <p><strong>Tipe Tiket:</strong> ${ticketLabel}</p>
            <p><strong>Jumlah Pembelian:</strong> ${guestsCount} Ticket</p>
            <hr>
            <p><strong>Pembayaran ke:</strong><br>${value.sub}</p><br>
            <p style="font-weight: bold; color: #e74c3c;">Harap segera lakukan pembayaran ke nomor tujuan di atas untuk menyelesaikan pesanan Anda.</p>
          </div>
        `,
      showCancelButton: true,
      confirmButtonText: "Konfirmasi & Bayar",
      cancelButtonText: "Batal",
    });

    if (!confirmOrder.isConfirmed) return;

    //Backend Callback (activate status + send invoice)
    try {
      console.log("Sending order id for callback:", orderId);
      const callbackRes = await fetch("/orders/payment/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token"),
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      console.log("Callback request sent with body:", { order_id: orderId });

      const callbackData = await callbackRes.json();

      console.log("Callback response:", callbackData);

      if (!callbackRes.ok) {
        return Swal.fire(
          "Gagal",
          callbackData.error || "Gagal mengkonfirmasi pesanan",
          "error"
        );
      }

      await Swal.fire({
        title: "Menunggu Pembayaran...",
        text: "Mohon tunggu beberapa detik sementara kami memverifikasi pembayaran Anda.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        timer: 3000,
        timerProgressBar: true,
      });

      Swal.fire({
        title: "Sukses!",
        html: `Pesanan kamu telah dikirim!<br>
        <strong>Metode Pembayaran : </strong>${value.method}<br>
        <strong>Detail : </strong>${value.sub}`,
        icon: "success",
      });

      bookingForm.reset();
    } catch (err) {
      Swal.fire("Error", "Gagal menyelesaikan pesanan", "error");
    }
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
