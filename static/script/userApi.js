document.addEventListener("DOMContentLoaded", function () {
  const modal=document.getElementById("myModal");
  const navSignIn=document.getElementById('signin-signup');
  const signInForm=document.getElementById("signInForm");
  const signUpForm=document.getElementById("signUpForm");
  const switchToSignUp=document.getElementById("switchToSignUp");
  const switchToSignIn=document.getElementById("switchToSignIn");
  const signInError=document.getElementById("signin-error");
  const signUpError=document.getElementById("signup-error");
  const signUpSuccess=document.getElementById("signup-success");

  modal.style.display="none";
  function clickToShowModal() {
    modal.style.display="block";
  }

  function closeModal() {
    modal.style.display="none";
    resetForms();
  }

  function resetForms() {
    signInForm.reset();
    signUpForm.reset();
    signInError.textContent="";
    signUpError.textContent="";
    signUpSuccess.textContent="";
  }
  navSignIn.onclick=clickToShowModal;
  
  window.onclick=function (event) {
    if (event.target == modal) {
        closeModal();
    }
  }
//   document.getElementsByClassName('close')[0].onclick=function() {
//     closeModal();
//   }

  switchToSignUp.onclick=function () {
    signInForm.classList.remove("active");
    signUpForm.classList.add("active");
    signInError.textContent="";
  }
  switchToSignIn.onclick=function () {
    signUpForm.classList.remove("active");
    signInForm.classList.add("active");
  }

  signUpForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const formData=new FormData(signUpForm);
    fetch("/api/user", {
      method: "POST",
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        signUpSuccess.textContent="";
        signUpError.textContent=data.message;
      } else {
        signUpError.textContent="";
        signUpSuccess.textContent=data.message;
      }
    })
    .catch(error => {
      signUpError.textContent=error.message;
    });
  });

  signInForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const formData=new FormData(signInForm);
    fetch("/api/user/auth", {
      method: "PUT",
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      signInError.textContent="";
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        location.reload();  // Refresh the page on successful sign-in
      } else {
        signInError.textContent=data.message;
      }
    })
    .catch(error => {
      signInError.textContent=error.message;
    });
  });
  function checkTokenInLocalStorage() {
    const token=localStorage.getItem('token');
    if (token) {
      navSignIn.textContent="登出系統";
      navSignIn.onclick=handleSignOut;
    } else {
      navSignIn.textContent="登入/註冊"; 
      navSignIn.onclick=clickToShowModal;
    }
  }
  function handleSignOut() {
    localStorage.removeItem('token');
    checkTokenInLocalStorage();
  }
  checkTokenInLocalStorage();
});

