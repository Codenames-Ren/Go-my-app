document.addEventListener("DOMContentLoaded", function () {
  const formEvent = document.getElementById("form-event");
  const tbodyEvent = document.getElementById("tbody-event");
  const eventIdInput = document.getElementById("event-id");
  const formEventTitle = document.getElementById("form-event-title");
  const btnResetFormEvent = document.getElementById("btn-reset-form-event");

  const eventNameInput = document.getElementById("event-name");
  const eventOrderDeadlineInput = document.getElementById(
    "event-order-deadline"
  );
  const eventEndDateInput = document.getElementById("event-end-date");

  const currentDateElement = document.getElementById("current-date-konser");
  if (currentDateElement) {
    currentDateElement.textContent = moment().format("dddd, DD MMMM");
  }

  //API URL Base
  const EVENT_API_URL = "/admin/event";

  //get all event
  async function fetchAndDisplayEvents() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire(
          "Error",
          "Sesi tidak ditemukan, silahkan login.",
          "error"
        ).then(() => (window.location.href = "/login"));
        return;
      }

      const response = await fetch(`${EVENT_API_URL}/`, {
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          Swal.fire("Akses ditolak", "Anda tidak memiliki izin.", "error").then(
            () => (window.location.href = "/login")
          );
        } else {
          const errorData = await response.json().catch(() => ({
            error: `Gagal mengambil data event: ${response.statusText}`,
          }));
          throw new Error(
            errorData.error ||
              `Gagal mengambil data event: ${response.statusText}`
          );
        }
        return;
      }

      const events = await response.json();

      tbodyEvent.innerHTML = "";

      if (!events || events.length === 0) {
        const colCount = tbodyEvent
          .closest("table")
          .querySelectorAll("thead th").length;
        tbodyEvent.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center;">Belum ada data event.</td></tr>`;
        return;
      }

      events.forEach((event) => {
        const row = tbodyEvent.insertRow();
        row.innerHTML = `
          <td>${event.ID || "-"}</td>
          <td>${event.EventName || "-"}</td>
          <td>${
            event.OrderDeadline
              ? moment(event.OrderDeadline).format("DD MMM YYYY, HH:mm")
              : "-"
          }</td>
          <td>${
            event.EndDate
              ? moment(event.EndDate).format("DD MMM YYYY, HH:mm")
              : "-"
          }</td>
          <td>
            <span class="status-${event.IsActive ? "active" : "inactive"}">
              ${event.IsActive ? "Aktif" : "Tidak Aktif"}
            </span>
          </td>
          <td>${
            event.CreatedAt
              ? moment(event.CreatedAt).format("DD MMM YYYY, HH:mm")
              : "-"
          }</td>
          <td>
            <button class="btn btn-sm btn-toggle-status" data-id="${
              event.ID
            }" data-status="${event.IsActive}">
              ${event.IsActive ? "Nonaktifkan" : "Aktifkan"}
            </button>
            <button class="btn btn-sm btn-edit" data-id="${event.ID}" 
                    data-name="${event.EventName}" 
                    data-orderdeadline="${
                      event.OrderDeadline
                        ? moment(event.OrderDeadline).format("YYYY-MM-DDTHH:mm")
                        : ""
                    }"
                    data-enddate="${
                      event.EndDate
                        ? moment(event.EndDate).format("YYYY-MM-DDTHH:mm")
                        : ""
                    }">
                Edit
            </button>
            <button class="btn btn-sm btn-delete" data-id="${
              event.ID
            }">Hapus</button>
          </td>
        `;
      });

      addEventListenertoDynamicButtons();
    } catch (error) {
      console.error("Error fetching events:", error);
      Swal.fire({
        icon: "error",
        title: error.message,
        text: "Terjadi kesalahan saat mengambil data.",
      });
      const colCount = tbodyEvent
        .closest("table")
        .querySelectorAll("thead th").length;
      tbodyEvent.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
    }
  }

  //update event
  formEvent.addEventListener("submit", async function (event) {
    event.preventDefault();

    const eventName = eventNameInput.value;
    const orderDeadlineValue = eventOrderDeadlineInput.value;
    const endDateValue = eventEndDateInput.value;

    if (!eventName.trim() || !orderDeadlineValue || !endDateValue) {
      Swal.fire({
        icon: "warning",
        title: "Input Tidak Lengkap!",
        text: "Nama event, batas waktu pembelian dan tanggal event wajib diisi.",
      });
      return;
    }

    const eventDataForBackend = {
      event_name: eventName.trim(),
      order_deadline: moment(orderDeadlineValue).toISOString(),
      end_date: moment(endDateValue).toISOString(),
    };

    const currentEventId = eventIdInput.value;
    const method = currentEventId ? "PUT" : "POST";
    const endpoint = currentEventId
      ? `${EVENT_API_URL}/${currentEventId}`
      : `${EVENT_API_URL}/`;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Unauthorized",
          text: "Sesi anda tidak valid atau sudah berakhir. Silahkan login kembali.",
        }).then(() => {
          window.location.href = "/login";
        });
        return;
      }

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(eventDataForBackend),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Gagal memproses permintaan" }));
        throw new Error(errorData.error || `Gagal menyimpan event`);
      }

      const resultMessage =
        method === "POST"
          ? "Event berhasil dibuat."
          : "Event berhasil diupdate.";
      Swal.fire("Berhasil!", resultMessage, "success");

      resetForm();
      fetchAndDisplayEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat menyimpan",
      });
    }
  });

  function resetForm() {
    formEvent.reset();
    eventIdInput.value = "";
    formEventTitle.textContent = "Tambah Event Baru";
    btnResetFormEvent.style.display = "none";
    eventNameInput.focus();
  }

  btnResetFormEvent.addEventListener("click", resetForm);

  //toggle event status
  async function toggleEventStatus(eventId, currentIsActive) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Unauthorized",
          text: "Sesi anda tidak valid atau sudah berakhir. Silahkan login kembali.",
        }).then(() => {
          window.location.href = "/login";
        });
        return;
      }

      const response = await fetch(
        `${EVENT_API_URL}/${eventId}/toggle-status`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Gagal mengubah status" }));
        throw new Error(errorData.error || "Gagal mengubah status event");
      }
      const result = await response.json();
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Status event berhasil diubah.",
      });
      fetchAndDisplayEvents();
    } catch (error) {
      console.error("Error toggling event status:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: error.message || "Terjadi kesalahan.",
      });
    }
  }

  //delete event
  async function deleteEvent(eventId) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Unauthorized",
          text: "Sesi anda tidak valid atau sudah berakhir. Silahkan login kembali.",
        }).then(() => {
          window.location.href = "/login";
        });
        return;
      }

      const response = await fetch(`${EVENT_API_URL}/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Gagal menghapus event" }));
        throw new Error(errorData.error || "Gagal menghapus event");
      }

      const result = await response.json();
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Event berhasil dihapus!",
      });
      fetchAndDisplayEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Terjadi kesalahan saat menghapus.",
      });
    }
  }

  //populate form
  function populateFormForEdit(eventDataFromButton) {
    eventIdInput.value = eventDataFromButton.id;
    eventNameInput.value = eventDataFromButton.name;
    eventOrderDeadlineInput.value = eventDataFromButton.orderdeadline;
    eventEndDateInput.value = eventDataFromButton.enddate;

    formEventTitle.textContent = "Edit Event";
    btnResetFormEvent.style.display = "inline-block";
    window.scrollTo(0, formEvent.offsetTop);
    eventNameInput.focus();
  }

  //Event listener for toggle, edit and delete
  function addEventListenertoDynamicButtons() {
    tbodyEvent.addEventListener("click", function (e) {
      const targetButton = e.target.closest("button");
      if (!targetButton) return;

      const eventId = targetButton.dataset.id;

      if (targetButton.classList.contains("btn-toggle-status")) {
        const currentStatus = targetButton.dataset.status === "true";
        toggleEventStatus(eventId, currentStatus);
      } else if (targetButton.classList.contains("btn-edit")) {
        const eventDataforForm = {
          id: eventId,
          name: targetButton.dataset.name,
          orderdeadline: targetButton.dataset.orderdeadline,
          enddate: targetButton.dataset.enddate,
        };
        populateFormForEdit(eventDataforForm);
      } else if (targetButton.classList.contains("btn-delete")) {
        Swal.fire({
          title: "Anda Yakin?",
          text: "Event yang dihapus tidak dapat dikembalikan!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Ya, hapus!",
          cancelButtonText: "Batal",
        }).then((result) => {
          if (result.isConfirmed) {
            deleteEvent(eventId);
          }
        });
      }
    });
  }

  //initialize
  fetchAndDisplayEvents();

  //logout logic
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
            console.log("Respon API logout:", data);
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
});
