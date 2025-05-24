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
    const response = await fetch("/api/orders");
    if (!response.ok) throw new Error("Gagal mengambil data dari server");
    ticketSalesData = await response.json();
    filterAndPaginateSales();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Oops!",
      text: error.message,
    });
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
      const saleMonth = new Date(sale.date).getMonth() + 1;
      return saleMonth === parseInt(monthFilter);
    });
  }

  if (dayFilter) {
    filteredData = filteredData.filter((sale) => sale.date === dayFilter);
  }

  if (statusFilter) {
    filteredData = filteredData.filter(
      (sale) => sale.status.toLowerCase() === statusFilter
    );
  }

  let totalSales = 0;
  filteredData.forEach((sale) => {
    totalSales += sale.quantity * sale.price;
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
    const total = sale.quantity * sale.price;
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${sale.id}</td>
      <td>${sale.concert}</td>
      <td>${sale.type}</td>
      <td>${sale.quantity}</td>
      <td>${formatRupiah(sale.price)}</td>
      <td>${formatRupiah(total)}</td>
      <td class="status-${sale.status.toLowerCase()}">${
      sale.status.charAt(0).toUpperCase() + sale.status.slice(1)
    }</td>
      <td>${moment(sale.date).format("DD MMM YYYY")}</td>
    `;

    tableBody.appendChild(row);
  });
}

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
}

// Jalankan saat halaman siap
window.addEventListener("DOMContentLoaded", initDashboard);
