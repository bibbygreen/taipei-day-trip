document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("myModal");
  const navSignIn = document.getElementById('signin-signup');
  const signInForm = document.getElementById("signInForm");
  const signUpForm = document.getElementById("signUpForm");
  const switchToSignUp = document.getElementById("switchToSignUp");
  const switchToSignIn = document.getElementById("switchToSignIn");
  const signInError = document.getElementById("signin-error");
  const signUpError = document.getElementById("signup-error");
  const signUpSuccess = document.getElementById("signup-success");

  modal.style.display = "none";
  navSignIn.onclick = function () {
      modal.style.display = "block";
  }
  window.onclick = function (event) {
      if (event.target == modal) {
          modal.style.display = "none";
      }
  }
  document.getElementsByClassName('close')[0].onclick = function() {
    document.getElementById('myModal').style.display = "none";
  }

  // Switch forms
  switchToSignUp.onclick = function () {
      signInForm.classList.remove("active");
      signUpForm.classList.add("active");
      signInError.textContent = "";
  }
  switchToSignIn.onclick = function () {
      signUpForm.classList.remove("active");
      signInForm.classList.add("active");
  }

  // Handle signup form submission
  signUpForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(signUpForm);
      fetch("/signup", {
          method: "POST",
          body: formData
      })
      .then(response => response.json())
      .then(data => {
          signUpError.textContent = "";
          signUpSuccess.textContent = "";
          if (data.access_token) {
              localStorage.setItem('token', data.access_token);
              signUpSuccess.textContent = 'Signup successful!';
          } else {
              signUpError.textContent = data.detail || 'Signup failed!';
          }
      })
      .catch(error => {
          signUpError.textContent = 'Signup failed! Error: ' + error.message;
      });
  });

  // Handle signin form submission
  signInForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(signInForm);
      fetch("/signin", {
          method: "POST",
          body: formData
      })
      .then(response => response.json())
      .then(data => {
          signInError.textContent = "";
          if (data.access_token) {
              localStorage.setItem('token', data.access_token);
              location.reload();  // Refresh the page on successful sign-in
          } else {
              signInError.textContent = data.detail || 'Signin failed!';
          }
      })
      .catch(error => {
          signInError.textContent = 'Signin failed! Error: ' + error.message;
      });
  });
});

