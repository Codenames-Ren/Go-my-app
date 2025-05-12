document.addEventListener("DOMContentLoaded"),
  () => {
    const tbody = document.querySelector(".history-table tbody");
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
          Authorization: `${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      return data.orders;
    }

    function renderOrders(orders) {
      const tbody = document.querySelector(".history-table tbody");
      if (orders.lengt === 0) {
        tbody.innerHTML =
          '<tr><td colspan="7">No payment history found.</td></tr>';
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
                <td>${order.cost.toLocaleString}</td>
                <td class="status-${order.status.toLowerCase()}">${
            order.status
          }</td>
            </tr>
        `
        )
        .join("");
      tbody.innerHTML = html;
    }
  };
