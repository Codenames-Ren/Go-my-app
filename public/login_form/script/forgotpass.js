document.addEventListener("DOMContentLoaded", function () {
  console.log("Script loaded!");

  //custom sweetalert
  function showSweetAlert(options) {
    const scrollPositions = window.pageYOffset;
    const container = document.getElementById("container");

    if (container) {
      container.classList.add("swal-active");
    }

    const customOptions = {
      target: container || undefined,
      heightAuto: false,
      allowOutsideClick: false,
      backdrop: "rgba(0,0,0,0.4)",
      didOpen: (popup) => {
        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = "0";

        if (container) {
          container.style.transform = "none";
          container.style.transition = "none";
        }

        if (options.didOpen) options.didOpen(popup);
      },
      didClose: () => {
        if (container) {
          container.classList.remove("swal-active");
          container.style.transform = "";
          container.style.transition = "";
        }

        if (options.didClose) options.didClose();

        window.scrollTo(0, scrollPositions);
      },
    };

    return Swal.fire({
      ...options,
      ...customOptions,
    });
  }

  const confirmButton = document.getElementById("confirmation");
  const emailInput = document.querySelector(".email-input");

  confirmButton.addEventListener("click", async function () {
    const email = emailInput.value.trim();

    //Email Validation
    if (!email) {
      await showSweetAlert({
        icon: "warning",
        title: "Field Kosong",
        text: "Email tidak boleh kosong!",
      });
      return;
    }

    if (!isValidEmail(email)) {
      await showSweetAlert({
        icon: "warning",
        title: "Email Tidak Valid!",
        text: "Silahkan masukan email yang valid!",
      });
      return;
    }

    try {
      //send req reset password to server
      const response = await fetch("/users/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log(data);

      if (response.ok) {
        await showSweetAlert({
          title: "Success",
          text: "Kode OTP telah dikirimkan ke email anda. Mohon verifikasi untuk melanjutkan",
          icon: "success",
        });

        window.location.href = `/otp?email=${encodeURIComponent(
          email
        )}&purpose=reset-password`;
      } else {
        await showSweetAlert({
          title: "Gagal",
          text: data.message || "Email tidak terdaftar!",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      await showSweetAlert({
        icon: "error",
        title: "Oops...",
        text: "Terjadi kesalahan saat memproses permintaan anda!",
      });
    }
  });

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
});
