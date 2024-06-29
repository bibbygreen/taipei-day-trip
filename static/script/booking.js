document.addEventListener("DOMContentLoaded", function () {
  const StartBooking=document.getElementById("start-booking");
  const navSignIn=document.getElementById('signin-signup');

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
      throw new Error('No token found');
      // return null;
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
  function renderBookingPage() {
    verifyUserSignInToken()
      .then(user => {
        if(user){
          navSignIn.textContent="登出系統";
          navSignIn.onclick=handleSignOut;
        }else {
          navSignIn.textContent="登入/註冊";
          navSignIn.onclick=clickToShowModal;
          throw new Error('User not authenticated');
        }
        const user_info = user.data;
        // Fetch booking data
        fetch("/api/booking", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem('token')}`
          }
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to fetch booking data');
            }
            return response.json();
          })
          .then(data => {
            const booking = data.data;
            // console.log("Booking data:", booking);
            if (!booking || !booking.attraction) {
              throw new Error('No booking data found');
            }
            let imagesArray;
            try {
              imagesArray = JSON.parse(booking.attraction.images);
            } catch (e) {
              console.error("Error parsing images array:", e);
              return;
            }
            // Update DOM with booking information
            document.querySelector('.booking-info-greeting').textContent = `您好，${user_info.name}，待預訂的行程如下：`;
            document.querySelector('.booking-attraction-name').textContent = booking.attraction.name;
            document.querySelector('.booking-date').textContent = `日期：${booking.date}`;
            document.querySelector('.booking-time').textContent = `時間：${booking.time}`;
            document.querySelector('.booking-fee').textContent = `費用：${booking.price}`;
            document.querySelector('.booking-attraction-address').textContent = `地點：${booking.attraction.address}`;
            if (imagesArray && Array.isArray(imagesArray) && imagesArray.length > 0) {
              document.querySelector('.attraction-img img').src = imagesArray[0];
            }else {
              console.error("Images array is not valid:", booking.attraction.images);
            }
            document.getElementById('contact-name-input').value = user_info.name;
            document.getElementById('contact-email-input').value = user_info.email;
            document.querySelector('.sum-of-price').textContent=`總價：新台幣 ${booking.price} 元`;
          })
          .catch(error => {
            console.error("Error fetching or rendering booking data:", error);
            renderNoBookingMessage(); // Display a message indicating no booking data
          });
      })
      .catch(error => {
        console.error("Error verifying user token:", error);
        // Handle authentication errors or token issues
        // For example, redirect to login page or show a message to the user
      });
  }
  function renderNoBookingMessage() {
    const bookingInfoBox=document.querySelector('.booking-info-box');
    bookingInfoBox.innerHTML='<div>沒有預定行程</div>';
  }

  renderBookingPage();
});