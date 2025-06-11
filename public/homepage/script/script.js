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

// Global variables
let selectedConcertName = "";
let selectedEventId = null;

//get event from backend server
async function loadEventFromServer() {
  try {
    const res = await fetch("/events");
    if (!res.ok) throw new Error("Gagal mengambil event");

    const events = await res.json();
    const container = document.querySelector(".concert-grid");
    container.innerHTML = "";

    events.forEach((event) => {
      if (!event.IsActive) return;

      const eventDate = new Date(event.EndDate).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const deadline = new Date(event.OrderDeadline).toLocaleDateString(
        "id-ID",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );

      const city = event.Location.toLowerCase();

      const card = document.createElement("div");
      card.className = "concert-card";
      card.setAttribute("data-aos", "fade-up");
      card.innerHTML = `
      <img src="/public/homepage/image/${event.image_name}" alt="${
        event.EventName
      }" class="concert-img" />
      <div class="concert-info">
        <h3 class="concert-card-title">${event.EventName}</h3>
        <p class="concert-card-description">Jadwal Keberangkatan : ${eventDate} - ${
        event.Location
      }</p>
        <p class="concert-card-deadline"> Batas Pendaftaran : ${deadline}</p>
        <button class="btn book-package"
            data-package="${event.EventName.split(" ").slice(0, 2).join(" ")}"
            data-concert="${event.EventName}"
            data-event-id="${event.ID}">
          Daftar Sekarang
        </button>
      </div>
      `;

      container.appendChild(card);
    });

    setupBookingButtons();
  } catch (error) {
    console.error("Gagal memuat event:", error);
    document.querySelector(".concert-grid").innerHTML =
      "<p>Gagal memuat paket umroh</p>";
  }
}

function setupBookingButtons() {
  const existingButtons = document.querySelectorAll(".book-package");

  existingButtons.forEach((button) => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
  });

  // Setup event listener
  const bookPackageButtons = document.querySelectorAll(".book-package");
  bookPackageButtons.forEach((button, index) => {
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
      selectedEventId = button.getAttribute("data-event-id");

      if (packageType) {
        packageType.textContent =
          packageName.charAt(0).toUpperCase() + packageName.slice(1);
      }

      if (bookingModal) {
        bookingModal.classList.add("active");
        bookingModal.style.display = "flex";
        AOS.refreshHard();
      } else {
        console.error("Booking modal not found!");
      }
    });
  });
}

// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus();
  loadEventFromServer();
  AOS.init({
    duration: 800,
    easing: "ease-in-out",
    once: true,
    mirror: false,
  });
});

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

document.addEventListener("DOMContentLoaded", () => {
  const historyNav = document.getElementById("nav-history");
  const token = localStorage.getItem("token");

  if (!token && historyNav) {
    historyNav.style.display = "none"; // Sembunyikan menu History
  }
});

// --- CLOSE MODAL ---
closeBookingModal?.addEventListener("click", () => {
  bookingModal?.classList.remove("active");
  if (bookingModal) bookingModal.style.display = "none";
});

cancelBooking?.addEventListener("click", () => {
  bookingModal?.classList.remove("active");
  if (bookingModal) bookingModal.style.display = "none";
});

// Close modal when clicking outside
bookingModal?.addEventListener("click", (e) => {
  if (e.target === bookingModal) {
    bookingModal.classList.remove("active");
    bookingModal.style.display = "none";
  }
});

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

    if (!selectedEventId) {
      return Swal.fire({
        title: "Error",
        text: "Gagal mendapatkan id event, silahkan coba lagi nanti.",
        icon: "error",
      });
    }

    bookingModal?.classList.remove("active");
    if (bookingModal) bookingModal.style.display = "none";

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
        ticketLabel = "Ekonomi";
        break;

      case "2":
        ticketLabel = "Reguler";
        break;

      case "3":
        ticketLabel = "VIP";
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
      event_id: selectedEventId,
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

      orderId = data.order_number;

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
            <p><strong>Nama Paket:</strong> ${selectedConcertName}</p>
            <p><strong>Kelas Paket:</strong> ${ticketLabel}</p>
            <p><strong>Jumlah Jamaah:</strong> ${guestsCount}</p>
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
      const callbackRes = await fetch("/orders/payment/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token"),
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      const callbackData = await callbackRes.json();

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
        html: `Pemesanan Berhasil!<br>
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
    localStorage.removeItem("token");
    updateLoginButton(false);
  }
}

// --- HANDLE LOGIN/LOGOUT ---
if (loginBtn) {
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
        }).then(() => {
          const currentpath = window.location.pathname;
          if (currentpath === "/history") {
            window.location.href = "/";
          } else {
            window.location.reload();
          }
        });
      } catch (err) {
        console.error("Logout error:", err);

        localStorage.removeItem("token");
        updateLoginButton(false);
        window.location.reload();
      }
    } else {
      window.location.href = "/login";
    }
  });
}

function updateLoginButton(loggedIn) {
  if (loginBtn) loginBtn.textContent = loggedIn ? "Logout" : "Login";
}

// HISTORY PAGE FUNCTIONALITY
document.addEventListener("DOMContentLoaded", () => {
  const historyTable = document.querySelector(".history-table tbody");

  if (!historyTable) {
    console.log(
      "Halaman ini tidak memiliki tabel history, skip loading history data"
    );
    return;
  }

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

  fetchOrders(token)
    .then((orders) => renderOrders(orders))
    .catch((error) => {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal meload history pembelian. Coba lagi nanti",
      });
      console.error("Error", error);
    });

  async function fetchOrders(token) {
    const response = await fetch("/orders/history", {
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", response.status, errorText);
      throw new Error("Failed to fetch orders");
    }

    const data = await response.json();
    return data.orders;
  }

  function renderOrders(orders) {
    const tbody = document.querySelector(".history-table tbody");
    if (!Array.isArray(orders) || orders.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7">Tidak ada riwayat pembelian.</td></tr>';
      return;
    }

    const html = orders
      .map(
        (order) => `
            <tr>
                <td>${order.name}</td>
                <td>${order.email}</td>
                <td>${order.event}</td>
                <td>${order.date}</td>
                <td>${order.ticket_count}</td>
                <td>${order.cost.toLocaleString()}</td>
                <td class="status-${order.status.toLowerCase()}">
  ${
    order.status.toLowerCase() === "pending"
      ? `<button class="btn-confirm" style=" display: inline-block;
      padding: 5px 14px;
      background-color:rgb(255, 67, 67);
      color: white;
      text-decoration: none;
      border-radius: 15px;
      transition: background-color 0.3s ease, transform 0.2s ease;
      cursor: pointer;" 
      data-order='${JSON.stringify(order)}'>Pending</button>`
      : order.status
  }
</td>
            </tr>
        `
      )
      .join("");
    tbody.innerHTML = html;

    document.querySelectorAll(".btn-confirm").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const order = JSON.parse(btn.dataset.order);

        const confirmOrder = await Swal.fire({
          title: "Konfirmasi Pembayaran",
          html: `
        <div style="text-align: left">
          <p><strong>Nama:</strong> ${order.name}</p>
          <p><strong>Email:</strong> ${order.email}</p>
          <p><strong>Event:</strong> ${order.event}</p>
          <p><strong>Jumlah Tiket:</strong> ${order.ticket_count}</p>
          <p><strong>Total Bayar:</strong> Rp ${order.cost.toLocaleString()}</p>
          <hr>
          <p><strong>Pembayaran ke:</strong><br>${order.payment_to}</p><br>
          <p style="font-weight: bold; color: #e74c3c;">Lakukan pembayaran ke tujuan di atas untuk menyelesaikan pesanan Anda.</p>
        </div>
      `,
          showCancelButton: true,
          confirmButtonText: "Konfirmasi & Bayar",
          cancelButtonText: "Batal",
        });

        if (!confirmOrder.isConfirmed) return;

        try {
          console.log(orders);
          const res = await fetch("/orders/payment/callback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: localStorage.getItem("token"),
            },
            body: JSON.stringify({ order_id: order.order_number }),
          });

          const data = await res.json();

          if (!res.ok) {
            return Swal.fire(
              "Gagal",
              data.error || "Gagal konfirmasi pembayaran",
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

          await Swal.fire({
            title: "Sukses!",
            html: `Pembayaran telah di konfirmasi. Invoice akan segera dikirimkan ke email kamu`,
            icon: "success",
          });

          // Refresh orders
          const updatedOrders = await fetchOrders(token);
          renderOrders(updatedOrders);
        } catch (err) {
          Swal.fire(
            "Error",
            "Terjadi kesalahan saat mengkonfirmasi pembayaran",
            "error"
          );
          console.error(err);
        }
      });
    });
  }
});
