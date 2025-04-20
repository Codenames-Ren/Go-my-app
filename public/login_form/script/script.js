console.log("Script loaded");

const registerForm = document.querySelector(".register-container form");
const loginForm = document.querySelector(".login-container form");

//register handler
registerForm.addEventListener("submit", async (e) => {
  console.log("Register form submitted!");
  e.preventDefault();

  const username = registerForm.querySelector(
    'input[placeholder="Username"]'
  ).value;
  const email = registerForm.querySelector('input[placeholder="Email"]').value;
  const password = registerForm.querySelector(
    'input[placeholder="Password"]'
  ).value;

  if (!username || !email || !password) {
    await Swal.fire({
      icon: "warning",
      title: "Data tidak lengkap",
      text: "Semua kolom harus diisi!",
    });
    return;
  }

  try {
    const response = await fetch("/users/register/init", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();
    console.log(data);

    if (response.ok) {
      await Swal.fire({
        title: "Success",
        text: "Kode OTP telah dikirimkan ke email anda. Mohon verifikasi akun anda untuk melanjutkan",
        icon: "success",
      });
      window.location.href = `/otp?email=${encodeURIComponent(
        email
      )}&purpose=register`;
    } else {
      await Swal.fire({
        title: "Register Failed",
        text: "Register akun gagal. Username atau email sudah terdaftar!",
        icon: "error",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    await Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "Something went wrong!",
      footer: '<a href="#">Why do I have this issue?</a>',
    });
  }
});

//handle login
loginForm.addEventListener("submit", async (e) => {
  console.log("Login form submitted!");
  e.preventDefault();

  const email = loginForm.querySelector(`input[placeholder="Email"]`).value;
  const password = loginForm.querySelector(
    'input[placeholder="Password"]'
  ).value;

  if (!email || !password) {
    await Swal.fire({
      icon: "warning",
      title: "Data tidak lengkap",
      text: "Semua kolom harus diisi!",
    });
    return;
  }

  try {
    const response = await fetch("/users/login/init", {
      method: "POST",
      headers: {
        "Content-Type": `application/json`,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log(data);

    if (response.ok) {
      await Swal.fire({
        title: "Success",
        text: "Kode OTP telah dikirimkan ke email anda. Mohon verifikasi akun anda untuk melanjutkan",
        icon: "success",
      });
      window.location.href = `/otp?email=${encodeURIComponent(
        email
      )}&purpose=login`;
    } else {
      await Swal.fire({
        title: "Login Gagal",
        text: "Email atau password salah!",
        icon: "error",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    await Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "Something went wrong!",
      footer: '<a href="#">Why do I have this issue?</a>',
    });
  }
});

const forgotPass = document.getElementById("forgot-pass");

forgotPass.addEventListener("click", function (e) {
  e.preventDefault();

  window.location.href = "/forgot-password";
});

const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => {
  container.classList.add("right-panel-active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("right-panel-active");
});
