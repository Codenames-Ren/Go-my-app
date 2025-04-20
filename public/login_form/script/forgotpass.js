document.addEventListener("DOMContentLoaded", function () {
  console.log("Script loaded!");

  const confirmButton = document.getElementById("confirmation");
  const emailInput = document.querySelector(".email-input");

  confirmButton.addEventListener("click", async function () {
    const email = emailInput.value.trim();

    //Email Validation
    if (!email) {
      await Swal.fire({
        icon: "warning",
        title: "Field Kosong",
        text: "Email tidak boleh kosong!",
      });
      return;
    }

    if (!isValidEmail(email)) {
      await Swal.fire({
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
        await Swal.fire({
          title: "Success",
          text: "Kode OTP telah dikirimkan ke email anda. Mohon verifikasi untuk melanjutkan",
          icon: "success",
        });

        window.location.href = `/otp?email=${encodeURIComponent(
          email
        )}&purpose=reset-password`;
      } else {
        await Swal.fire({
          title: "Gagal",
          text: data.message || "Email tidak terdaftar!",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      await Swal.fire({
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
