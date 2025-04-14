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
      alert("Check your email for the OTP!");
      window.location.href = "/otp.html";
    } else {
      alert(data.message || "Register failed");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Something went wrong");
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
      alert("Check your email for the OTP!");
      window.location.href = "/otp.html";
    } else {
      alert(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Something went wrong");
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
