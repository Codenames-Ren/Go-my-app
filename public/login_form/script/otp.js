document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email");
  const purpose = urlParams.get("purpose");

  console.log("URL Parameters:", { email, purpose });

  //first validation
  if (!email || !purpose) {
    Swal.fire({
      title: "Verifikasi gagal",
      text: "Kode OTP tidak valid",
      icon: "error",
    });
    return;
  }

  //validate endpoint for verification and resend
  const endpoints = {
    login: {
      verify: "/users/login/verify",
      resend: "/users/login/resend-otp",
    },
    register: {
      verify: "/users/register/verify",
      resend: "/users/register/resend-otp",
    },
    "reset-password": {
      verify: "/users/reset-password",
      resend: "/users/forgot-password/resend-otp",
    },
  };

  const { verify, resend } = endpoints[purpose] || {};
  if (!verify || !resend) {
    Swal.fire({
      title: "Verifikasi gagal",
      text: "Tipe Verifikasi tidak dikenali",
      icon: "error",
    });
    return;
  }

  const inputs = document.querySelectorAll(".otp-input");
  const verifyButton = document.getElementById("verify-btn");
  const resendButton = document.getElementById("resend-btn");
  const timerElement = document.getElementById("timer");
  const timerText = document.getElementById("timer-text");
  const popup = document.getElementById("success-popup");

  let countdown;
  let secondsLeft = 60;

  //Start Timer
  function startTimer() {
    console.log("Starting timer...");
    resendButton.style.display = "none";
    timerText.style.display = "block";
    secondsLeft = 60;
    updateTimerDisplay();

    clearInterval(countdown);
    countdown = setInterval(function () {
      secondsLeft--;
      updateTimerDisplay();
      console.log("Timer:", secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(countdown);
        timerText.style.display = "none";
        resendButton.style.display = "block";
      }
    }, 1000);
  }

  //update timer
  function updateTimerDisplay() {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  //show popup
  function showPopup() {
    popup.classList.add("show");
    setTimeout(() => {
      popup.classList.remove("show");
    }, 3000);
  }

  //auto input
  inputs.forEach((input, index) => {
    input.addEventListener("input", function (e) {
      const value = e.target.value;

      //only input number
      if (/^\d*$/.test(value)) {
        if (value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }

        checkAllinputs();
      } else {
        e.target.value = "";
      }
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener("focus", function () {
      setTimeout(() => {
        input.select();
      }, 0);
    });
  });

  function checkAllinputs() {
    const allFilled = Array.from(inputs).every(
      (input) => input.value.length === 1
    );
    verifyButton.disabled = !allFilled;
  }

  resendButton.addEventListener("click", function () {
    fetch(resend, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message?.includes("success")) {
          showPopup();
          startTimer();
        } else {
          Swal.fire(
            "Gagal",
            data.message || "Gagal mengirim ulang OTP",
            "error"
          );
        }
      })

      .catch((err) => {
        Swal.fire("Error", "Gagal mengirim ulang OTP.", "error");
        console.error(err);
      });
  });

  verifyButton.addEventListener("click", function () {
    const otpCode = Array.from(inputs)
      .map((input) => input.value)
      .join("");

    console.log("Sending data:", {
      email: email,
      purpose: purpose,
      otpCode: otpCode, // Ubah nama parameter agar sesuai dengan backend
    });

    fetch(verify, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        purpose: purpose,
        otpCode: otpCode,
      }),
    })
      .then((response) => {
        console.log("Response status:", response.status);
        return response.json();
      })

      .then((data) => {
        console.log("Response data:", data);
        if (data && data.message === "OTP verified successfully") {
          Swal.fire({
            title: "Berhasil",
            text: "Kode OTP berhasil di verifikasi.",
            icon: "success",
          });

          inputs.forEach((input) => (input.value = ""));
          verifyButton.disabled = true;

          setTimeout(() => {
            window.location.href = "/dashboard.html";
          }, 2000);
        } else {
          Swal.fire(
            "Gagal",
            data.error || "Kode OTP salah atau kadaluarsa",
            "error"
          );
        }
      })

      .catch((err) => {
        console.error("Error details:", err);
        Swal.fire("Error", "Gagal Menghubungi Server.", "error");
      });
  });

  startTimer();
});
