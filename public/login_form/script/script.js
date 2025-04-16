const registerForm = document.querySelector(".register-container form");
const loginForm = document.querySelector(".login-container form");

//register handler
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = registerForm.querySelector(
    'input[placeholder="Username"]'
  ).value;
  const email = registerForm.querySelector('input[placeholder="Email"]').value;
  const password = registerForm.querySelector(
    'input[placeholder="Password"]'
  ).value;

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
        text: "OTP has been sent to your email, please verify to continue.",
        icon: "success",
      });
      window.location.href = `/otp?email=${encodeURIComponent(
        email
      )}&purpose=register`;
    } else {
      await Swal.fire({
        title: "Register Failed",
        text: "Failed to register account! please contact admin",
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
  e.preventDefault();

  const email = loginForm.querySelector(`input[placeholder="Email"]`).value;
  const password = loginForm.querySelector(
    'input[placeholder="Password"]'
  ).value;

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
        text: "OTP has been sent to your email, please verify to continue.",
        icon: "success",
      });
      window.location.href = `/otp?email=${encodeURIComponent(
        email
      )}&purpose=login`;
    } else {
      await Swal.fire({
        title: "Login Failed!",
        text: "Invalid email or password",
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

const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => {
  container.classList.add("right-panel-active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("right-panel-active");
});
