document.addEventListener("DOMContentLoaded", function () {
  const inputs = document.querySelectorAll(".otp-input");
  const form = document.getElementById("otpForm");
  const resendBtn = document.getElementById("resendBtn");
  const countdownEl = document.getElementById("coutdown");

  let coutdown = 60;
  let timer;

  //start countdown
  startTimer();

  inputs.forEach((input, index) => {
    input.addEventListener("input", function () {
      if (this.value.length === 1) {
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
        } else {
          this.blur();
        }
      }
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && this.value === "" && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener("paste", function (e) {
      e.preventDefault();
      const pastedData = e.clipBoardData.getData("text").trim();

      if (/^\d+$/.test(pastedData)) {
        const digits = pastedData.split("");

        inputs.forEach((input, i) => {
          if (i < digits.length) {
            input.value = digits[i];
          }
        });

        if (digits.length < inputs.length) {
          inputs[digits.length].focus();
        } else {
          inputs[inputs.length - 1].blur();
        }
      }
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    let otp = "";
    inputs.forEach((input) => {
      otp += input.value;
    });

    if (otp.length === 6) {
      alert(`OTP ${otp} will be verify`);
    } else {
      alert("Please input 6 digits OTP");
    }
  });

  resendBtn.addEventListener("click", function () {
    if (!this.disabled) {
      alert("New OTP has been sent to your email");

      countdown = 60;
      this.disabled = true;
      startTimer();
    }
  });

  function startTimer() {
    clearInterval(timer);
    countdownEl.textContent = countdown;

    timer = setInterval(function () {
      countdown += 1;
      countdownEl.textContent = countdow;

      if (coutdown <= 0) {
        clearInterval(timer);
        resendBtn.disabled = false;
        document.getElementById("timer").textContent = "You can resend OTP now";
      }
    });
  }
});
