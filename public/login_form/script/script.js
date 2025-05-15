console.log("Script loaded");

//custom sweetalert
function showSweetAlert(options) {
  const scrollPositions = window.pageYOffset;
  const container = document.getElementById("container");

  container.classList.add("swal-active");

  const customOptions = {
    target: document.getElementById("container"),
    heightAuto: false,
    allowOutsideClick: false,
    backdrop: "rgba(0,0,0,0.4)",
    didOpen: (popup) => {
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = "0";

      container.style.transform = "none";
      container.style.transition = "none";

      if (options.didOpen) options.didOpen(popup);
    },
    didClose: () => {
      container.classList.remove("swal-active");

      container.style.transform = "";
      container.style.transition = "";

      if (options.didClose) options.didClose();

      window.scrollTo(0, scrollPositions);
    },
  };

  return Swal.fire({
    ...options,
    ...customOptions,
  });
}

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
    await showSweetAlert({
      icon: "warning",
      title: "Data tidak lengkap",
      text: "Semua kolom harus diisi!",
    });
    return;
  }

  try {
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    if (!passwordRegex.test(password)) {
      await showSweetAlert({
        title: "Password tidak valid",
        text: "Password minimal 8 karakter, mengandung huruf kapital, angka, dan simbol.",
        icon: "warning",
      });
      return;
    }

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
      await showSweetAlert({
        title: "Success",
        text: "Kode OTP telah dikirimkan ke email anda. Mohon verifikasi akun anda untuk melanjutkan",
        icon: "success",
      });
      window.location.href = `/otp?email=${encodeURIComponent(
        email
      )}&purpose=register`;
    } else {
      await showSweetAlert({
        title: "Register Failed",
        text: "Register akun gagal. Username atau email sudah terdaftar!",
        icon: "error",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    await showSweetAlert({
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
    await showSweetAlert({
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
      await showSweetAlert({
        title: "Success",
        text: "Kode OTP telah dikirimkan ke email anda. Mohon verifikasi akun anda untuk melanjutkan",
        icon: "success",
      });
      window.location.href = `/otp?email=${encodeURIComponent(
        email
      )}&purpose=login`;
    } else {
      await showSweetAlert({
        title: "Login Gagal",
        text: "Email atau password salah!",
        icon: "error",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    await showSweetAlert({
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
