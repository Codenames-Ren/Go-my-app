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
            const res = await fetch(`/admin/orders/${orderId}/status`, {
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

//logic export
async function exportData() {
  const monthFilter = document.getElementById("month-filter").value;
  const dayFilter = document.getElementById("day-filter").value;
  const statusFilter = document.getElementById("status-filter").value;

  let filteredData = [...ticketSalesData];

  // Apply filters
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

  // Hitung total
  let totalSales = 0;
  filteredData.forEach((sale) => {
    totalSales += (sale.OrderCount || 0) * (sale.TicketPrice || 0);
  });

  console.log("Data to export:", filteredData.length, "items");
  console.log("Total sales:", totalSales);

  // Buat overlay untuk interactive preview
  const overlay = document.createElement("div");
  overlay.id = "pdf-preview-overlay";
  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.8) !important;
    z-index: 9998 !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    opacity: 0 !important;
    transition: opacity 0.3s ease !important;
  `;

  // Buat container preview yang responsive
  const exportDiv = document.createElement("div");
  exportDiv.id = "pdf-export-container";
  exportDiv.style.cssText = `
    width: 90vw !important;
    max-width: 1200px !important;
    max-height: 80vh !important;
    background: white !important;
    padding: 30px !important;
    font-family: 'Arial', sans-serif !important;
    color: black !important;
    border-radius: 10px !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
    overflow-y: visible !important;
    transform: scale(0.8) !important;
    transition: transform 0.3s ease !important;
    position: relative !important;
  `;

  // Buat container khusus untuk konten PDF (tanpa button)
  const pdfContent = document.createElement("div");
  pdfContent.id = "pdf-content-only";
  pdfContent.style.cssText = `
    color: black !important;
    background: white !important;
    margin-top: 40px;
    margin-bottom: 80px;
    padding-bottom: 20px;
  `;

  // Tombol X untuk menutup preview
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "x";
  closeButton.style.cssText = `
    position: absolute !important;
    top: 10px !important;
    right: 15px !important;
    background: transparent !important;
    color: black !important;
    border: none !important;
    width: 35px !important;
    height: 35px !important;
    font-size: 24px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
    z-index: 10000 !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
  `;

  // Hover effect untuk tombol X
  closeButton.onmouseenter = () => {
    // closeButton.style.background = "#c82333";
    closeButton.style.transform = "scale(1.1)";
  };
  closeButton.onmouseleave = () => {
    // closeButton.style.background = "#dc3545";
    closeButton.style.transform = "scale(1)";
  };

  // Event listener untuk tombol X
  closeButton.onclick = () => {
    closePreview();
  };

  // Tombol Download PDF (di bawah kanan)
  const downloadButton = document.createElement("button");
  downloadButton.innerHTML = '<i class="fas fa-download"></i> Download PDF';
  downloadButton.style.cssText = `
    position: absolute !important;
    bottom: 20px !important;
    right: 30px !important;
    background: #28a745 !important;
    color: white !important;
    border: none !important;
    border-radius: 25px !important;
    padding: 12px 24px !important;
    font-size: 14px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    z-index: 10000 !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3) !important;
  `;

  // Hover effect untuk tombol download
  downloadButton.onmouseenter = () => {
    downloadButton.style.background = "#218838";
    downloadButton.style.transform = "translateY(-2px)";
  };
  downloadButton.onmouseleave = () => {
    downloadButton.style.background = "#28a745";
    downloadButton.style.transform = "translateY(0)";
  };

  // Event listener untuk tombol download
  downloadButton.onclick = () => {
    generatePDF();
  };

  // Function untuk menutup preview
  const closePreview = () => {
    overlay.style.opacity = "0";
    exportDiv.style.transform = "scale(0.8)";

    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }, 300);
  };

  // Function untuk generate PDF
  const generatePDF = async () => {
    try {
      // Tunggu DOM konten PDF selesai render sebelum snapshot
      await ensureRendered(pdfContent, 300); // <== ini kunci agar table ikut

      Swal.fire({
        title: "Membuat PDF...",
        html: `...`,
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
        showConfirmButton: false,
      });

      await new Promise((res) => setTimeout(res, 300)); // stabilisasi kecil

      const options = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `laporan-penjualan-tiket-harmony-music-${moment().format(
          "YYYY-MM-DD-HHmm"
        )}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "in",
          format: "a4",
          orientation: "landscape",
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      console.log("Starting PDF generation with landscape orientation...");

      // Generate PDF - HANYA dari pdfContent (tanpa button)
      await html2pdf()
        .from(pdfContent)
        .set(options)
        .toPdf()
        .get("pdf")
        .then(function (pdf) {
          console.log("PDF generated successfully!");
          console.log("Total pages:", pdf.internal.getNumberOfPages());

          // Add page numbers
          const totalPages = pdf.internal.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            pdf.setTextColor(150);
            pdf.text(
              `Halaman ${i} dari ${totalPages}`,
              pdf.internal.pageSize.getWidth() - 1.5,
              pdf.internal.pageSize.getHeight() - 0.3
            );
          }
        })
        .save();

      // Close preview after successful download
      closePreview();

      // Success message
      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "Data berhasil di export. Silahkan check folder download anda.",
        timer: 4000,
        showConfirmButton: true,
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("PDF generation error:", error);

      // Remove overlay on error
      closePreview();

      Swal.fire({
        icon: "error",
        title: "Export Gagal",
        text: `Terjadi kesalahan saat membuat file. ${error.message}`,
        confirmButtonText: "OK",
      });
    }
  };

  // Konten PDF (TANPA BUTTON) - ini yang akan di-export
  pdfContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #333; padding-bottom: 15px;">
      <h1 style="color: black !important; font-size: 24px; margin: 0 0 10px 0; font-weight: bold;">
        LAPORAN PENJUALAN TIKET HARMONY MUSIC
      </h1>
      <p style="color: #666 !important; margin: 5px 0; font-size: 14px;">
        Tanggal Export: ${new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px;">
      <div style="color: black !important;">
        <strong>Total Transaksi:</strong> ${filteredData.length}
      </div>
      <div style="color: black !important;">
        <strong>Total Omset:</strong> ${formatRupiah(totalSales)}
      </div>
    </div>
    
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; margin: 0; color: black !important; font-size: 12px; table-layout: auto !important;">
        <thead style="display: table-header-group !important;">
          <tr style="background: #2c3e50 !important; color: white !important;">
            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; min-width: 80px;">User ID</th>
            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; min-width: 150px;">Nama Event</th>
            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; min-width: 120px;">Tipe Tiket</th>
            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; min-width: 60px;">Qty</th>
            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; min-width: 100px;">Harga Satuan</th>
            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; min-width: 100px;">Total Harga</th>
            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; min-width: 80px;">Status</th>
            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; min-width: 100px;">Tanggal</th>
          </tr>
        </thead>

        <tbody>
          ${filteredData
            .map((sale, index) => {
              const total = (sale.OrderCount || 0) * (sale.TicketPrice || 0);
              const rowBg = index % 2 === 0 ? "#ffffff" : "#f8f9fa";
              const statusColor =
                sale.Status?.toLowerCase() === "active"
                  ? "#28a745"
                  : sale.Status?.toLowerCase() === "pending"
                  ? "#ffc107"
                  : "#6c757d";

              return `
              <tr style="background: ${rowBg} !important;">
                <td style="border: 1px solid #ddd; padding: 10px 8px; color: black !important; text-align: center;">${
                  sale.UserID || "-"
                }</td>
                <td style="border: 1px solid #ddd; padding: 10px 8px; color: black !important; text-align: center;">${
                  sale.EventName || "-"
                }</td>
                <td style="border: 1px solid #ddd; padding: 10px 8px; color: black !important; text-align: center;">${
                  sale.TicketType || "-"
                }</td>
                <td style="border: 1px solid #ddd; padding: 10px 8px; color: black !important; text-align: center; font-weight: bold;">${
                  sale.OrderCount || 0
                }</td>
                <td style="border: 1px solid #ddd; padding: 10px 8px; color: black !important; text-align: center;">${formatRupiah(
                  sale.TicketPrice || 0
                )}</td>
                <td style="border: 1px solid #ddd; padding: 10px 8px; color: black !important; text-align: center; font-weight: bold;">${formatRupiah(
                  total
                )}</td>
                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: center;">
                  <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">
                    ${sale.Status?.toUpperCase() || "Unknown"}
                  </span>
                </td>
                <td style="border: 1px solid #ddd; padding: 10px 8px; color: black !important; text-align: center;">${moment(
                  sale.CreatedAt
                ).format("DD/MM/YYYY")}</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div style="margin-top: 25px; text-align: center; border-top: 1px solid #ddd; padding-top: 15px;">
      <p style="color: #666 !important; font-size: 12px; margin: 0;">
        Laporan ini dibuat secara otomatis oleh sistem pada ${new Date().toLocaleString(
          "id-ID"
        )}
      </p>
    </div>
  `;

  // Tambahkan pdfContent ke exportDiv
  exportDiv.appendChild(pdfContent);

  // Tambahkan tombol-tombol ke export div
  exportDiv.appendChild(closeButton);
  exportDiv.appendChild(downloadButton);

  // Tambahkan ke overlay
  overlay.appendChild(exportDiv);
  document.body.appendChild(overlay);

  // Event listener untuk menutup dengan klik overlay (area gelap)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closePreview();
    }
  });

  // Event listener untuk ESC key
  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      closePreview();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);

  // Smooth entrance animation
  setTimeout(() => {
    overlay.style.opacity = "1";
    exportDiv.style.transform = "scale(1)";
  }, 10);

  console.log("Preview opened with interactive controls");
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
