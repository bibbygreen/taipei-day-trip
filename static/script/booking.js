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
function redirectUnauthorizedUser() {
  verifyUserSignInToken()
    .then(data => {
      if (!data) {
        window.location.href = "/"; // Redirect to home page if not authenticated
      }
    })
    .catch(error => {
      console.error("Error verifying user token:", error);
      window.location.href = "/"; // Handle verification error by redirecting to home page
    });
}

document.addEventListener("DOMContentLoaded", function () {
  
  const StartBooking=document.getElementById("start-booking");
  const navSignIn=document.getElementById('signin-signup');

  
  function clickToShowModal() {
    modal.style.display="block";
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
        if(!user){
          navSignIn.textContent="登入/註冊";
          navSignIn.onclick=clickToShowModal;
          throw new Error('User not authenticated');
        }
        navSignIn.textContent="登出系統";
        navSignIn.onclick=handleSignOut;

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
            console.log("Booking data:", booking);
            
            if (!booking || !booking.attraction || Object.keys(booking.attraction).length === 0) {
              renderNoBookingMessage(user_info);
              return;
            }

            let imagesArray;
            try {
              imagesArray = JSON.parse(booking.attraction.images);
            } catch (e) {
              console.error("Error parsing images array:", e);
              throw new Error('Invalid image data');
            }
            // Update DOM with booking information
            document.querySelector('.booking-info-greeting').textContent = `您好，${user_info.name}，待預訂的行程如下：`;
            document.querySelector('.booking-attraction-name').textContent = booking.attraction.name;
            document.querySelector('.booking-date').textContent = `日期：${booking.date}`;

            let timeText = "";
            if (booking.time === "morning") {
              timeText = "上午九點至下午二點";
            } else if (booking.time === "afternoon") {
              timeText = "下午二點至晚上八點";
            } else {
              timeText = booking.time; // Use original value if not "morning" or "afternoon"
            }
            document.querySelector('.booking-time').textContent = `時間：${timeText}`;
            
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
  function renderNoBookingMessage(user_info) {
    // Remove all content from the body except header and footer
    const body = document.body;
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const username = user_info.name || '訪客';
    // Clear the body content
    body.innerHTML = '';

    const greetingDiv = document.createElement('div');
    greetingDiv.className = 'booking-info-greeting-delete';
    greetingDiv.textContent = `您好，${username}，待預訂的行程如下：`;
    // Create a div element with the message
    const messageDiv = document.createElement('div');
    messageDiv.textContent = '沒有預定行程';
    messageDiv.className = 'booking-info-box-delete'; // Ensure correct class name for styling

    // Append header, message, and footer back to the body
    body.appendChild(header.cloneNode(true)); // Ensure header remains intact
    body.appendChild(greetingDiv);
    body.appendChild(messageDiv);
    body.appendChild(footer.cloneNode(true)); // Ensure footer remains intact
  }
  const deleteBookingBtn = document.getElementById('btn-delete-booking');
  if (deleteBookingBtn) {
    deleteBookingBtn.addEventListener('click', deleteBooking);
  }
  function deleteBooking() {
    // Confirm deletion
    if (!confirm('確定要刪除此預訂嗎？')) {
      return; // Do nothing if user cancels
    }
  
    // Fetch the delete endpoint
    fetch("/api/booking", {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to delete booking');
      }
      return response.json();
    })
    .then(data => {
      // Handle successful deletion
      alert('預訂已成功刪除');
      location.reload(); // Refresh the page after deletion
    })
    .catch(error => {
      console.error("Error deleting booking:", error);
      alert('刪除預訂時發生錯誤');
    });
  }
  renderBookingPage();
  redirectUnauthorizedUser();
});