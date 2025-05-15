document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email");
  const purpose = urlParams.get("purpose");

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

  //first validation
  if (!email || !purpose) {
    showSweetAlert({
      title: "Verifikasi gagal",
      text: "Parameter tidak lengkap",
      icon: "error",
    }).then(() => {
      window.location.href = "/login";
    });
    return;
  }

  //validate endpoint for verification and resend
  const endpoints = {
    login: {
      verify: "/users/login/verify",
      resend: "/users/login/resend-otp",
      redirect: "/home",
    },
    register: {
      verify: "/users/register/verify",
      resend: "/users/register/resend-otp",
      redirect: "/home",
    },
    "reset-password": {
      verify: "/users/reset-password",
      resend: "/users/forgot-password/resend-otp",
      redirect: "/reset-password-form",
    },
  };

  const endpoint = endpoints[purpose];
  if (!endpoint) {
    showSweetAlert({
      title: "Verifikasi gagal",
      text: "Tipe Verifikasi tidak dikenali",
      icon: "error",
    }).then(() => {
      window.location.href = "/login";
    });
    return;
  }

  const { verify, resend, redirect } = endpoint;

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
        if (data.message) {
          showPopup();
          startTimer();
        } else {
          showSweetAlert({
            title: "Gagal",
            text: data.message || "Gagal mengirim ulang OTP",
            icon: "error",
          });
        }
      })

      .catch((err) => {
        showSweetAlert({
          title: "Error",
          text: "Gagal mengirim ulang OTP.",
          icon: "error",
        });
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
      otpCode: otpCode,
    });

    //for reset-password, only verify otp without resetting password
    if (purpose === "reset-password") {
      fetch("/users/verify-reset-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp: otpCode,
        }),
      })
        .then((response) => {
          console.log("response status:", response.status);
          return response.json();
        })
        .then((data) => {
          console.log("Response data:", data);
          if (data.success || data.message) {
            showSweetAlert({
              title: "Berhasil",
              text: "Kode OTP berhasil diverifikasi.",
              icon: "success",
            });

            //save email and otp for use in reset password page
            sessionStorage.setItem("resetEmail", email);
            sessionStorage.setItem("resetOTP", otpCode);

            setTimeout(() => {
              window.location.href = redirect;
            }, 2000);
          } else {
            showSweetAlert({
              title: "Gagal",
              text: data.error || "Kode OTP salah atau kadaluarsa",
              icon: "error",
            });
          }
        })
        .catch((err) => {
          console.error("Error details:", err);
          showSweetAlert({
            title: "Error",
            text: "Gagal Menghubungi Server.",
            icon: "error",
          });
        });
      return;
    }

    fetch(verify, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        otp: otpCode,
      }),
    })
      .then((response) => {
        console.log("Response status:", response.status);
        return response.json();
      })

      .then((data) => {
        console.log("Response data:", data);
        if (
          data &&
          (data.token || data.message === "OTP verified successfully")
        ) {
          if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("isLoggedIn", "true");
          }
          showSweetAlert({
            title: "Berhasil",
            text: "Kode OTP berhasil di verifikasi.",
            icon: "success",
          });

          inputs.forEach((input) => (input.value = ""));
          verifyButton.disabled = true;

          setTimeout(() => {
            window.location.href = "/home";
          }, 2000);
        } else {
          showSweetAlert({
            title: "Gagal",
            text: data.error || "Kode OTP salah atau kadaluarsa",
            icon: "error",
          });
        }
      })

      .catch((err) => {
        console.error("Error details:", err);
        showSweetAlert({
          title: "Error",
          text: "Gagal Menghubungi Server.",
          icon: "error",
        });
      });
  });

  startTimer();
});
