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

let chartInstance = null;

function updateChart(data) {
  //array
  const monthlySales = Array(12).fill(0);

  data.forEach((sale) => {
    const date = new Date(sale.CreatedAt);
    const monthIndex = date.getMonth();
    const amount = (sale.OrderCount || 0) * (sale.TicketPrice || 0);
    monthlySales[monthIndex] += amount;
  });

  const ctx = document.getElementById("sales-bar-chart").getContext("2d");
  if (!ctx) {
    console.warn("Canvas element for chart not found");
    return;
  }

  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  if (chartInstance) {
    chartInstance.data.datasets[0].data = monthlySales;
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Omset Bulanan (Rp)",
            backgroundColor: "#4e73df",
            borderColor: "#4e73df",
            data: monthlySales,
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "Rp " + value.toLocaleString("id-ID");
              },
            },
          },
        },
      },
    });
  }
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
  }
}

function populateExportTable(data) {
  const exportBody = document.getElementById("export-table-body");
  exportBody.innerHTML = "";

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
    `;

    exportBody.appendChild(row);
  });
}

// Display placeholder chart
function createMonthlyChart() {
  console.log("Canvas chart berhasil di load");
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
  updateChart(filteredData);
}

// Populate sales table
function populateSalesTable(data) {
  const tableBody = document.getElementById("sales-data");
  tableBody.innerHTML = "";

  data.forEach((sale) => {
    const total = (sale.OrderCount || 0) * (sale.TicketPrice || 0);
    const row = document.createElement("tr");

    const displayStatus =
      sale.Status?.charAt(0).toUpperCase() +
      sale.Status?.slice(1).toLowerCase();

    row.innerHTML = `
      <td>${sale.UserID || "-"}</td>
      <td>${sale.Name || "-"}</td>
      <td>${sale.PhoneNumber || "-"}</td>
      <td>${sale.EventName || "-"}</td>
      <td>${sale.TicketType || "-"}</td>
      <td>${sale.OrderCount || 0}</td>
      <td>${formatRupiah(sale.TicketPrice || 0)}</td>
      <td>${formatRupiah(total)}</td>
            <td>${sale.TicketCode || "-"}</td>
      <td class="status-${sale.Status?.toLowerCase() || "unknown"}">${
      displayStatus || "Unknown"
    }</td>
      <td>${moment(sale.CreatedAt).format("DD MMM YYYY")}</td>
      <td>
        <button class="btn btn-sm btn-update" data-id="${
          sale.ID
        }" data-status="${sale.Status}" data-order-number="${sale.OrderNumber}">
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
    const orderNumber = btn.dataset.orderNumber;
    const currentStatus = btn.dataset.status;
    const token = localStorage.getItem("token");

    // Delete logic
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
            await fetchTicketData();
          } catch (error) {
            Swal.fire("Error", error.message, "error");
          }
        }
      });
    }

    // Update logic
    if (btn.classList.contains("btn-update")) {
      const statusLower = currentStatus.toLowerCase();
      const newStatus = statusLower === "pending" ? "active" : "pending";

      Swal.fire({
        title: "Ubah Status?",
        text: `Status akan diubah dari '${currentStatus}' menjadi '${newStatus}'`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "OK",
        cancelButtonText: "Batal",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            Swal.fire({
              title: "Mengubah Status...",
              text: "Mohon tunggu sebentar.",
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              },
            });

            if (statusLower === "pending" && newStatus === "active") {
              try {
                const callbackRes = await fetch("/orders/payment/callback", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: token,
                  },
                  body: JSON.stringify({ order_id: orderNumber }),
                });

                const callbackData = await callbackRes.json();
                if (!callbackRes.ok) {
                  console.warn("Callback gagal:", callbackData.error);

                  // Update status order
                  const res = await fetch(`/admin/orders/${orderId}/status`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: token,
                    },
                    body: JSON.stringify({ status: newStatus }),
                  });

                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(
                      data.error || "Gagal mengubah status order"
                    );
                  }

                  Swal.fire({
                    icon: "success",
                    title: "Status Berhasil Diubah!",
                    text: "Status order berhasil diperbarui, tetapi gagal mengirim invoice. Silakan kirim manual jika diperlukan.",
                  });
                } else {
                  console.log("Callback berhasil:", callbackData);
                  Swal.fire({
                    icon: "success",
                    title: "Berhasil!",
                    text: "Status order berhasil diperbarui dan invoice telah dikirim.",
                  });
                }
              } catch (callbackError) {
                console.error("Error saat callback:", callbackError);
                try {
                  const res = await fetc(`/admin/orders/${orderId}/status`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: token,
                    },
                    body: JSON.stringify({ status: newStatus }),
                  });

                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(
                      data.error || "Gagal mengubah status order"
                    );
                  }

                  Swal.fire({
                    icon: "warning",
                    title: "Status Berhasil Diubah",
                    text: "Status order berhasil diperbarui, tetapi gagal mengirim invoice. Silakan kirim manual jika diperlukan.",
                  });
                } catch (manualError) {
                  throw new Error(
                    "Gagal mengubah status order: " + manualError
                  );
                }
              }
            } else {
              // Untuk perubahan status lainnya (active ke pending)

              const res = await fetch(`/admin/orders/${orderId}/status`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: token,
                },
                body: JSON.stringify({ status: newStatus }),
              });

              const data = await res.json();
              if (!res.ok) {
                throw new Error(data.error || "Gagal mengubah status");
              }

              Swal.fire({
                icon: "success",
                title: "Berhasil!",
                text: "Status order berhasil diperbarui.",
              });
            }

            await fetchTicketData();
          } catch (error) {
            console.error("Error saat update status:", error);
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

function ensureRendered(element, timeout = 300) {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      observer.disconnect();
      setTimeout(resolve, timeout);
    });

    observer.observe(element, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 1000);
  });
}

// logic export - FIXED VERSION with corrected logo position
async function exportData() {
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
    filteredData = filteredData.filter(
      (sale) =>
        typeof sale.CreatedAt === "string" &&
        sale.CreatedAt.startsWith(dayFilter)
    );
  }
  if (statusFilter) {
    filteredData = filteredData.filter(
      (sale) => sale.Status?.toLowerCase() === statusFilter
    );
  }

  if (filteredData.length === 0) {
    Swal.fire("Info", "Tidak ada data untuk diexport.", "info");
    return;
  }

  let totalSales = 0;
  filteredData.forEach((sale) => {
    totalSales += (sale.OrderCount || 0) * (sale.TicketPrice || 0);
  });

  // CONVERT IMAGE TO BASE64 - INI YANG PENTING!
  const getImageAsBase64 = async (imgPath) => {
    try {
      const response = await fetch(imgPath);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn("Image not found, using placeholder");
      // Return a simple placeholder base64 image if original fails
      return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZGRkIi8+CjxwYXRoIGQ9Ik0yNSAzMEg1NVY1MEgyNVYzMFoiIGZpbGw9IiM5OTkiLz4KPC9zdmc+";
    }
  };

  // Get base64 image
  const logoBase64 = await getImageAsBase64("/public/homepage/image/umroh.jpg");

  const overlay = document.createElement("div");
  overlay.id = "pdf-preview-overlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.8); z-index: 9998;
    display: flex; justify-content: center; align-items: center;
    opacity: 0; transition: opacity 0.3s ease;`;

  const exportDiv = document.createElement("div");
  exportDiv.id = "pdf-export-container";
  exportDiv.style.cssText = `
    width: 90vw; max-width: 1200px; max-height: 90vh; background: white;
    padding: 30px 30px 80px; font-family: 'Arial', sans-serif; color: black;
    border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    overflow-y: auto; position: relative; display: flex; flex-direction: column;`;

  const pdfContent = document.createElement("div");
  pdfContent.id = "pdf-content-only";
  window.scrollTo(0, 0);
  pdfContent.style.cssText = `
    width: 1123px; height: auto; margin: 0 auto;
    padding: 20px 10px 40px 10px; background: white;
    color: black; font-family: 'Arial', sans-serif;
    page-break-inside: auto; overflow: visible; zoom: 100%;`;

  // Generate single table for preview
  const generateSingleTable = (data) => {
    return `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
        <thead style="background: #2c3e50; color: white;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">User ID</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Nama</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">No HP</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Paket</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Tipe</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Qty</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Harga</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Total</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Kode Tiket</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Status</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Tanggal</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map((sale, idx) => {
              const total = (sale.OrderCount || 0) * (sale.TicketPrice || 0);
              const bg = idx % 2 === 0 ? "#fff" : "#f8f9fa";
              const statusColor =
                sale.Status?.toLowerCase() === "active"
                  ? "#28a745"
                  : sale.Status?.toLowerCase() === "pending"
                  ? "#ffc107"
                  : "#6c757d";
              return `
              <tr style="background: ${bg};">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                  sale.UserID || "-"
                }</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                  sale.Name || "-"
                }</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                  sale.PhoneNumber || "-"
                }</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                  sale.EventName || "-"
                }</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                  sale.TicketType || "-"
                }</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                  sale.OrderCount || 0
                }</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${formatRupiah(
                  sale.TicketPrice || 0
                )}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${formatRupiah(
                  total
                )}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                  sale.TicketCode || "-"
                }</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; color: ${statusColor};">${
                sale.Status?.toUpperCase() || "-"
              }</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${moment(
                  sale.CreatedAt
                ).format("DD/MM/YY")}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  };

  // Generate chunked table for PDF
  const generateTableChunkForPDF = (chunk, isFirstChunk = false) => {
    const headerRow = `
      <tr style="background: #2c3e50; color: white;">
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">User ID</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Nama</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">No HP</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Paket</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Tipe</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Qty</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Harga</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Total</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Kode Tiket</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Status</th>
        <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Tanggal</th>
      </tr>`;

    return `
      <div style="page-break-inside: avoid; ${
        !isFirstChunk ? "margin-top: 20px;" : ""
      }">
        <table style="width: 100%; border-collapse: collapse; margin-top: ${
          isFirstChunk ? "10px" : "0"
        }; font-size: 13px;">
          <thead style="background: #2c3e50; color: white;">
            ${headerRow}
          </thead>
          <tbody>
            ${chunk
              .map((sale, idx) => {
                const total = (sale.OrderCount || 0) * (sale.TicketPrice || 0);
                const bg = idx % 2 === 0 ? "#fff" : "#f8f9fa";
                const statusColor =
                  sale.Status?.toLowerCase() === "active"
                    ? "#28a745"
                    : sale.Status?.toLowerCase() === "pending"
                    ? "#ffc107"
                    : "#6c757d";
                return `
                <tr style="background: ${bg};">
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                    sale.UserID || "-"
                  }</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                    sale.Name || "-"
                  }</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                    sale.PhoneNumber || "-"
                  }</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                    sale.EventName || "-"
                  }</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                    sale.TicketType || "-"
                  }</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                    sale.OrderCount || 0
                  }</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${formatRupiah(
                    sale.TicketPrice || 0
                  )}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${formatRupiah(
                    total
                  )}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${
                    sale.TicketCode || "-"
                  }</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; color: ${statusColor};">${
                  sale.Status?.toUpperCase() || "-"
                }</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${moment(
                    sale.CreatedAt
                  ).format("DD/MM/YY")}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>`;
  };

  // HEADER TEMPLATE FUNCTION - FIXED LOGO POSITION
  const generateHeader = (logoBase64) => {
    return `
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 25px;
      border-bottom: 2px solid #333; padding-bottom: 15px; gap: 15px;">
      <div style="flex-shrink: 0;">
        <img src="${logoBase64}" alt="Logo" style=" margin-bottom: 10px; width: 100px; height: 100px; object-fit: contain; border-radius: 8px;"/>
      </div>
      <div style="display: flex; flex-direction: column; text-align: center;">
    <h1 style="font-size: 20px; margin: 0 0 10px 0; color: #2c3e50; font-weight: bold;">LAPORAN PENJUALAN PAKET UMROH</h1>
          <h1 style="font-size: 18px; margin: 0 0 5px 0; color: #34495e; font-weight: bold;">MUKROMAH HIJRAH MAMUNDA</h1>
          <p style="font-size: 12px; margin: 0; color: #7f8c8d;">Tanggal Cetak: ${new Date().toLocaleDateString(
            "id-ID",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          )}</p>
        </div>
      </div>`;
  };

  // Create preview content
  const previewContent = `
    ${generateHeader(logoBase64)}
    
    ${generateSingleTable(filteredData)}
    <div style="text-align: center; font-size: 11px; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; color: #7f8c8d;">
      Laporan ini dibuat secara otomatis oleh sistem pada ${new Date().toLocaleString(
        "id-ID"
      )}
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 20px; font-weight: bold; color: #2c3e50;">
      <div>Total Transaksi: ${filteredData.length}</div>
      <div>Total Omset: ${formatRupiah(totalSales)}</div>
    </div>
    `;

  pdfContent.innerHTML = previewContent;

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.cssText = `position: absolute; top: 10px; right: 15px; font-size: 50px; background: transparent; border: none; cursor: pointer; color: #999; width: 30px; height: 30px; border-radius: 10%; display: flex; align-items: center; justify-content: center;`;
  closeButton.onmouseover = () =>
    (closeButton.style.backgroundColor = "#f0f0f0");
  closeButton.onmouseout = () =>
    (closeButton.style.backgroundColor = "transparent");
  closeButton.onclick = () => closePreview();

  const downloadButton = document.createElement("button");
  downloadButton.innerHTML = "<i class='fas fa-download'></i> Download PDF";
  downloadButton.style.cssText = `background: #28a745; color: white; border: none; border-radius: 25px; padding: 12px 24px; font-size: 14px; font-weight: bold; cursor: pointer; transition: background 0.3s;`;
  downloadButton.onmouseover = () =>
    (downloadButton.style.background = "#218838");
  downloadButton.onmouseout = () =>
    (downloadButton.style.background = "#28a745");
  downloadButton.onclick = () => generatePDF();

  function closePreview() {
    overlay.style.opacity = "0";
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }, 300);
  }

  async function generatePDF() {
    try {
      const pdfContentForExport = document.createElement("div");
      pdfContentForExport.style.cssText = `
        width: 1123px; height: auto; margin: 0 auto;
        padding: 20px 10px 60px 10px; background: white;
        color: black; font-family: 'Arial', sans-serif;
        page-break-inside: auto; overflow: visible; zoom: 100%;`;

      // Generate PDF content with proper chunking
      let pdfHtmlBody = "";
      const chunkSize = 18;

      for (let i = 0; i < filteredData.length; i += chunkSize) {
        const chunk = filteredData.slice(i, i + chunkSize);
        pdfHtmlBody += generateTableChunkForPDF(chunk, i === 0);

        // Add page break after each chunk except the last one
        if (i + chunkSize < filteredData.length) {
          pdfHtmlBody +=
            '<div style="page-break-after: always; margin-bottom: 20px;"></div>';
        }
      }

      pdfContentForExport.innerHTML = `
        ${generateHeader(logoBase64)}
        ${pdfHtmlBody}
          <div style="display: flex; justify-content: space-between; margin-top: 35px; font-size: 20px; font-weight: bold; color: #2c3e50;">
          <div>Total Transaksi: ${filteredData.length}</div>
          <div>Total Omset: ${formatRupiah(totalSales)}</div>
        </div>
        `;

      await ensureRendered(pdfContentForExport, 300);

      Swal.fire({
        title: "Membuat PDF...",
        html: "Sedang memproses data, mohon tunggu...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
        showConfirmButton: false,
      });

      await new Promise((res) => setTimeout(res, 500));

      const options = {
        margin: [0.4, 0.3, 0.6, 0.3],
        filename: `laporan-penjualan-paket-umroh-mukromah-hijrah-${moment().format(
          "YYYY-MM-DD-HHmm"
        )}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width: 1123,
          height: window.innerHeight,
          scrollX: 0,
          scrollY: 0,
          logging: false,
        },
        jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          avoid: ["thead", "tr", "td", "th"],
          before: ".page-break-before",
          after: ".page-break-after",
        },
      };

      await html2pdf()
        .from(pdfContentForExport)
        .set(options)
        .toPdf()
        .get("pdf")
        .then((pdf) => {
          const totalPages = pdf.internal.getNumberOfPages();
          const footerText = `Laporan ini dibuat secara otomatis oleh sistem pada ${new Date().toLocaleString(
            "id-ID"
          )}`;

          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            pdf.setTextColor(150);

            // Add page number
            pdf.text(
              `Halaman ${i} dari ${totalPages}`,
              pdf.internal.pageSize.getWidth() - 1.5,
              pdf.internal.pageSize.getHeight() - 0.3
            );

            pdf.setFontSize(9);
            pdf.text(
              footerText,
              pdf.internal.pageSize.getWidth() / 2,
              pdf.internal.pageSize.getHeight() - 0.15,
              { align: "center" }
            );
          }
        })
        .save();

      closePreview();
      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "PDF laporan berhasil diunduh.",
        timer: 4000,
        showConfirmButton: true,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      closePreview();
      Swal.fire({
        icon: "error",
        title: "Export Gagal",
        text: `Terjadi kesalahan: ${error.message}`,
        confirmButtonText: "OK",
      });
    }
  }

  exportDiv.appendChild(pdfContent);
  exportDiv.appendChild(closeButton);
  exportDiv.appendChild(downloadButton);
  overlay.appendChild(exportDiv);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePreview();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePreview();
  });

  setTimeout(() => (overlay.style.opacity = "1"), 10);
  console.log("Preview opened with logo loaded and proper PDF pagination");
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

window.addEventListener("DOMContentLoaded", initDashboard);
