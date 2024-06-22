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
  document.getElementsByClassName('close')[0].onclick=function() {
    closeModal();
  }

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
    const data= {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };
    fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        signUpSuccess.textContent="";
        signUpError.textContent=data.message;
      } else {
        signUpError.textContent="";
        signUpSuccess.textContent="註冊成功";
      }
    })
    .catch((error) => {
      signUpError.textContent=error.message;
    });
  });

  signInForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const formData=new FormData(signInForm);
    const data= {
      email: formData.get("email"),
      password: formData.get("password"),
    };
    fetch("/api/user/auth", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((data) => {
      signInError.textContent="";
      if (data.token) {
        localStorage.setItem('token', data.token);
        location.reload();  // Refresh the page on successful sign-in
      } else {
        signInError.textContent=data.message;
      }
    })
    .catch((error) => {
      signInError.textContent=error.message;
    });
  });

  function checkUserSignInStatus() {
    const token=localStorage.getItem('token')
    if(token) {
      fetch("/api/user/auth", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      .then(response => {
        if(!response.ok) {
          throw new Error('Token verification failed');
        }
        return response.json();
      })
      .then(data => {
        navSignIn.textContent="登出系統";
        navSignIn.onclick=handleSignOut;
      })
      .catch(error => {
        console.error(error);
        localStorage.removeItem('token');
        navSignIn.textContent="登入/註冊";
        navSignIn.onclick=clickToShowModal;
      });
    }else{
      navSignIn.textContent="登入/註冊";
      navSignIn.onclick=clickToShowModal;
    }
  }
  function handleSignOut() {
    localStorage.removeItem('token');
    checkUserSignInStatus();
  }
  checkUserSignInStatus();
});

