let ticketSalesData = [];
let currentPage = 1;
const itemsPerPage = 8;

// Format currency (Rupiah)
function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// Fetch ticket data from backend
async function fetchTicketData() {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      swal
        .fire({
          icon: "error",
          title: "Unauthorized",
          text: "Sesi anda tidak valid atau sudah berakhir. Silahkan login kembali.",
        })
        .then(() => {
          window.location.href = "/login";
        });
      return;
    }

    const response = await fetch("/admin/orders", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });

    if (response.status === 401 || response.status === 403) {
      const errorData = await response.json();
      Swal.fire({
        icon: "error",
        title: "Akses Ditolak!",
        text:
          errorData.error ||
          "Anda tidak memiliki izin untuk mengakses sumber daya ini.",
      }).then(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("isLoggedIn");
        window.location.href = "/login";
      });
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      ticketSalesData = [];
      throw new Error(errorData.error || "Gagal mengambil data dari server");
    }

    const data = await response.json();
    ticketSalesData = data.orders || [];
    filterAndPaginateSales();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Oops!",
      text: error.message,
    });
    console.error("Error fetching data:", error);
  }
}

// Display placeholder chart
function createMonthlyChart() {
  const chartContainer = document.getElementById("monthly-chart");
  chartContainer.innerHTML = `
    <div style="text-align: center; padding: 50px 0;">
      <p style="font-size: 16px; color: #666;">
        [Grafik Batang: Omset Penjualan Bulanan]
      </p>
      <p style="font-size: 14px; color: #888;">
        Data Bulan: Jan - Des 2025<br>
        Data dari server akan ditampilkan di versi final.
      </p>
    </div>
  `;
}

// Filter & paginate ticket sales data
function filterAndPaginateSales() {
  const monthFilter = document.getElementById("month-filter").value;
  const dayFilter = document.getElementById("day-filter").value;
  const statusFilter = document.getElementById("status-filter").value;

  let filteredData = [...ticketSalesData];

  if (monthFilter) {
    filteredData = filteredData.filter((sale) => {
      const saleMonth = new Date(sale.CreatedAt).getMonth() + 1;
      return saleMonth === parseInt(monthFilter);
    });
  }

  if (dayFilter) {
    filteredData = filteredData.filter((sale) =>
      sale.CreatedAt.startsWith(dayFilter)
    );
  }

  if (statusFilter) {
    filteredData = filteredData.filter(
      (sale) => sale.Status?.toLowerCase() === statusFilter
    );
  }

  let totalSales = 0;
  filteredData.forEach((sale) => {
    totalSales += (sale.OrderCount || 0) * (sale.TicketPrice || 0);
  });

  document.getElementById(
    "total-sales"
  ).textContent = `Total Omset Penjualan: ${formatRupiah(totalSales)}`;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  updatePagination(totalPages);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  populateSalesTable(paginatedData);
}

// Populate sales table
function populateSalesTable(data) {
  const tableBody = document.getElementById("sales-data");
  tableBody.innerHTML = "";

  data.forEach((sale) => {
    const total = (sale.OrderCount || 0) * (sale.TicketPrice || 0);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${sale.UserID || "-"}</td>
      <td>${sale.EventName || "-"}</td>
      <td>${sale.TicketType || "-"}</td>
      <td>${sale.OrderCount || 0}</td>
      <td>${formatRupiah(sale.TicketPrice || 0)}</td>
      <td>${formatRupiah(total)}</td>
      <td class="status-${sale.Status?.toLowerCase() || "unknown"}">${
      sale.Status?.charAt(0).toUpperCase() + sale.Status?.slice(1)
    }</td>
      <td>${moment(sale.CreatedAt).format("DD MMM YYYY")}</td>
      <td>
        <button class="btn btn-sm btn-update" data-id="${
          sale.ID
        }" data-status="${sale.Status}">
          Update
        </button>
        <button class="btn btn-sm btn-delete" data-id="${sale.ID}">
          Delete
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

document
  .getElementById("sales-data")
  .addEventListener("click", async function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    const orderId = btn.dataset.id;
    const token = localStorage.getItem("token");

    //delete logic
    if (btn.classList.contains("btn-delete")) {
      Swal.fire({
        title: "Hapus Data?",
        text: "Data yang dihapus tidak dapat dikembalikan.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, hapus!",
        cancelButtonText: "Batal",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const res = await fetch(`/admin/orders/${orderId}`, {
              method: "DELETE",
              headers: { Authorization: token },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menghapus order");
            Swal.fire("Berhasil!", "Data berhasil dihapus.", "success");
            fetchTicketData();
          } catch (error) {
            Swal.fire("Error", error.message, "error");
          }
        }
      });
    }

    //update logic
    if (btn.classList.contains("btn-update")) {
      const currentStatus = btn.dataset.status.toLowerCase();
      const newStatus = currentStatus === "pending" ? "active" : "pending";

      Swal.fire({
        title: "Ubah Status ?",
        text: `Status akan diubah menjadi '${newStatus}'`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "OK",
        cancelButtonText: "Batal",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const res = await fetch(`/admin/orders/orders/${orderId}/status`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: token,
              },
              body: JSON.stringify({ status: newStatus }),
            });

            const data = await res.json();
            if (!res.ok)
              throw new Error(data.error || "Gagal mengubah status order");
            Swal.fire(
              "Berhasil!",
              "Status order berhasil diperbarui.",
              "success"
            );
            fetchTicketData();
          } catch (error) {
            Swal.fire("Error", error.message, "error");
          }
        }
      });
    }
  });

// Pagination control
function updatePagination(totalPages) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const prev = document.createElement("div");
  prev.id = "prev-page";
  prev.textContent = "←";
  prev.className = "pagination-arrow";
  prev.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      filterAndPaginateSales();
    }
  };
  pagination.appendChild(prev);

  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    const page = document.createElement("div");
    page.className = `pagination-item ${i === currentPage ? "active" : ""}`;
    page.textContent = i;
    page.onclick = () => {
      currentPage = i;
      filterAndPaginateSales();
    };
    pagination.appendChild(page);
  }

  const next = document.createElement("div");
  next.id = "next-page";
  next.textContent = "→";
  next.className = "pagination-arrow";
  next.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      filterAndPaginateSales();
    }
  };
  pagination.appendChild(next);
}

// Export data (placeholder)
function exportData() {
  Swal.fire({
    icon: "success",
    title: "Data Diekspor",
    text: "Data berhasil diekspor ke CSV (fitur simulasi)",
  });
}

// Initialize dashboard
function initDashboard() {
  document.getElementById("current-date").textContent =
    moment().format("dddd, DD MMMM YYYY");

  createMonthlyChart();
  fetchTicketData();

  document.getElementById("filter-btn").addEventListener("click", () => {
    currentPage = 1;
    filterAndPaginateSales();
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    document.getElementById("month-filter").value = "";
    document.getElementById("day-filter").value = "";
    document.getElementById("status-filter").value = "";
    currentPage = 1;
    filterAndPaginateSales();
  });

  document.getElementById("export-btn").addEventListener("click", exportData);

  const logoutButton = document.getElementById("logout-btn");

  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      const tokenFromStorage = localStorage.getItem("token");

      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("isLoggedIn");

      if (tokenFromStorage) {
        fetch("/users/logout", {
          method: "POST",
          headers: {
            Authorization: tokenFromStorage,
          },
        })
          .then((response) => {
            if (!response.ok) {
              console.warn(
                "Panggilan API logout backend mungkin gagal atau token tidak valid. Status:",
                response.status
              );
            }
            return response.json();
          })
          .then((data) => {
            console.log("Respon API logoutL", error);
          });
      } else {
        console.log("Tidak ada token untuk dikirim ke API logout");
      }

      Swal.fire({
        icon: "success",
        title: "Logout berhasil",
        text: "Kamu akan diarahkan ke halaman utama.",
        timer: 2000,
        timerProgressBar: true,
        showConfirmationButton: false,
      }).then(() => {
        window.location.href = "/home";
      });
    });
  }
}

// Jalankan saat halaman siap
window.addEventListener("DOMContentLoaded", initDashboard);
