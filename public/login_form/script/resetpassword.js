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

function isValidPassword(password) {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return (
    password.length >= minLength && hasUppercase && hasLowercase && hasSymbol
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const resetBtn = document.getElementById("reset-btn");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  //take email and otp from session storage
  const email = sessionStorage.getItem("resetEmail");
  const otpCode = sessionStorage.getItem("resetOTP");

  if (!email || !otpCode) {
    showSweetAlert({
      title: "Akses tidak valid",
      text: "Anda belum melakukan verifikasi OTP.",
      icon: "error",
    }).then(() => {
      window.location.href = "/login";
    });
    return;
  }

  resetBtn.addEventListener("click", async () => {
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    //Validasi form kosong
    if (!newPassword || !confirmPassword) {
      await showSweetAlert({
        icon: "warning",
        title: "Form tidak lengkap",
        text: "Silahkan isi semua kolom password.",
      });
      return;
    }

    //validate same password
    if (newPassword !== confirmPassword) {
      await showSweetAlert({
        icon: "error",
        title: "Password Tidak Sama",
        text: "Password baru dan konfirmasi password harus sama.",
      });
      return;
    }

    //validate regex password
    if (!isValidPassword(newPassword)) {
      await showSweetAlert({
        icon: "warning",
        title: "Password tidak valid",
        text: "Password harus minimal 8 karakter, mengandung huruf besar, huruf kecil, dan symbol!",
      });
      return;
    }

    //kirim request ke endpoint reset password
    try {
      const response = await fetch("/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp: otpCode,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();
      console.log("Response:", data);

      if (response.ok) {
        await showSweetAlert({
          title: "Berhasil",
          text: "Password berhasil di reset. Silahkan login kembali.",
          icon: "success",
        });

        //delete session
        sessionStorage.removeItem("resetEmail");
        sessionStorage.removeItem("resetOTP");

        window.location.href = "/login";
      } else {
        await showSweetAlert({
          title: "Gagal",
          text: data.message || "Reset password gagal.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      await showSweetAlert({
        icon: "error",
        title: "Oops...",
        text: "Gagal terhubung ke server",
      });
    }
  });
});
