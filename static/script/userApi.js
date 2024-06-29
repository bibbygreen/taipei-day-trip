document.addEventListener("DOMContentLoaded", function () {
  const modal=document.getElementById("myModal");
  const navSignIn=document.getElementById('signin-signup');
  const navBookingTour=document.getElementById('booking-tour');
  const signInForm=document.getElementById("signInForm");
  const signUpForm=document.getElementById("signUpForm");
  const switchToSignUp=document.getElementById("switchToSignUp");
  const switchToSignIn=document.getElementById("switchToSignIn");
  const signInError=document.getElementById("signin-error");
  const signUpError=document.getElementById("signup-error");
  const signUpSuccess=document.getElementById("signup-success");
  const StartBooking=document.getElementById("start-booking");
  // const bookingInfoBox=document.querySelector('.booking-info-box');

  modal.style.display="none";
  //Modal 登入註冊互動視窗
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
  };
  switchToSignIn.onclick=function () {
    signUpForm.classList.remove("active");
    signInForm.classList.add("active");
  };

  async function verifyUserSignInToken() {
    const token=localStorage.getItem('token');
    if(token) {
       const response = await fetch("/api/user/auth", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Token verification failed');
      }
      return await response.json();
    }else{
      return null;
      // return Promise.reject(new Error('No token found'));
    }
  }

  function checkUserSignInStatus() {
    verifyUserSignInToken()
      .then(data => {
        if(data){
          navSignIn.textContent="登出系統";
          navSignIn.onclick=handleSignOut;
        }else{
          navSignIn.textContent="登入/註冊";
          navSignIn.onclick=clickToShowModal;
        }  
      })
      .catch(error => {
        console.error(error);
        localStorage.removeItem('token');
        navSignIn.textContent = "登入/註冊";
        navSignIn.onclick = clickToShowModal;
      });
  }

  function handleSignOut() {
    localStorage.removeItem('token');
    checkUserSignInStatus();
  }
  
  function getAttractionIDFromURL(){
    const href=location.href;
    const pattern=/^http:.+\/attraction\/(\d+)$/;
    const match=href.match(pattern);
    return match ? match[1] : null;
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
  StartBooking.addEventListener("click", function(){
    const date=document.getElementById('booking-date').value;
    const timeOfDay = document.querySelector('input[name="booking-time"]:checked') ? document.querySelector('input[name="booking-time"]:checked').value : null;
    
    if (!date || !timeOfDay) {
      alert("請選取日期與時間");
      return;
    }

    verifyUserSignInToken()
      .then(user => {
        if(!user) {
          console.log("No user logged in");
          clickToShowModal();
          return;
        }

        const attractionID=getAttractionIDFromURL();
        const fee=document.getElementById('booking-fee').textContent;

        const bookingData={
          attractionId: attractionID,
          date: date,
          time: timeOfDay,
          price: parseInt(fee)
        };

        fetch("/api/booking",{
          method: "POST",
          headers:{
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(bookingData)
        })
        .then(response => response.json())
        .then(data => {
          if(data.ok){
            // console.log("ok");
            window.location.href="/booking";
          }else{
            console.error(data.message);
          }
        })
        .catch(error =>{
          console.error("Error creating booking:", error);
        });
      })
  })
  checkUserSignInStatus();
  
});


