document.getElementById("otpForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const otp = document.getElementById("otp").value;

  const response = await fetch("http://localhost:8080/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otp }),
  });

  if (response.ok) {
    alert("OTP Verified! 🚀");
    //window.location.href = "dashboard.html"
  } else {
    alert("Invalid OTP. Please try again.");
  }
});

//Resend OTP
document.getElementById("resendOtp").addEventListener("click", async () => {
  const response = await fetch("http://localhost:8080/resend-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (response.ok) {
    alert("OTP resent successfully!");
  } else {
    alert("Failed to resend OTP");
  }
});
