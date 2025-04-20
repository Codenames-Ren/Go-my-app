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
    Swal.fire({
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
      await Swal.fire({
        icon: "warning",
        title: "Form tidak lengkap",
        text: "Silahkan isi semua kolom password.",
      });
      return;
    }

    //validate same password
    if (newPassword !== confirmPassword) {
      await Swal.fire({
        icon: "error",
        title: "Password Tidak Sama",
        text: "Password baru dan konfirmasi password harus sama.",
      });
      return;
    }

    //validate regex password
    if (!isValidPassword(newPassword)) {
      await Swal.fire({
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
        await Swal.fire({
          title: "Berhasil",
          text: "Password berhasil di reset. Silahkan login kembali.",
          icon: "success",
        });

        //delete session
        sessionStorage.removeItem("resetEmail");
        sessionStorage.removeItem("resetOTP");

        window.location.href = "/login";
      } else {
        await Swal.fire({
          title: "Gagal",
          text: data.message || "Reset password gagal.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      await Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal terhubung ke server",
      });
    }
  });
});
