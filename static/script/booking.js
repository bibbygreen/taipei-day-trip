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
  }
}

function redirectUnauthorizedUser(user) {
  if (!user) {
    window.location.href = "/";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const navSignIn=document.getElementById('signin-signup');
  const modal = document.getElementById('modal');
  
  function clickToShowModal() {
    modal.style.display="block";
  }

  function checkUserSignInStatus(user) {
    if(user){
      navSignIn.textContent="登出系統";
      navSignIn.onclick=handleSignOut;
    }else{
      navSignIn.textContent="登入/註冊";
      navSignIn.onclick=clickToShowModal;
    }  
  }
      
  function handleSignOut() {
    localStorage.removeItem('token');
    checkUserSignInStatus(null);
  }

  async function fetchBookingData(){
    const response=await fetch("/api/booking",{
      method: "GET",
      headers:{
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok){
      throw new Error('Failed to fetch booking data');
    }
    return await response.json();
  }

  function updateDOMWithBookingData(user_info, booking){
    document.querySelector('.booking-info-greeting').textContent = `您好，${user_info.name}，待預訂的行程如下：`;
    document.querySelector('.booking-attraction-name').textContent = booking.attraction.name;
    document.querySelector('.booking-date').textContent = `日期：${booking.date}`;

    let timeText = "";
    if (booking.time === "morning") {
      timeText = "上午九點至下午二點";
    } else if (booking.time === "afternoon") {
      timeText = "下午二點至晚上八點";
    } else {
      timeText = booking.time;
    }
    document.querySelector('.booking-time').textContent = `時間：${timeText}`;
    
    document.querySelector('.booking-fee').textContent = `費用：${booking.price}`;
    document.querySelector('.booking-attraction-address').textContent = `地點：${booking.attraction.address}`;

    let imagesArray;
    try {
      imagesArray = JSON.parse(booking.attraction.images);
      if (imagesArray && Array.isArray(imagesArray) && imagesArray.length > 0) {
        document.querySelector('.attraction-img img').src = imagesArray[0];
      } else {
        console.error("Images array is not valid:", booking.attraction.images);
      }
    } catch (e) {
      console.error("Error parsing images array:", e);
    }

    document.getElementById('contact-name-input').value = user_info.name;
    document.getElementById('contact-email-input').value = user_info.email;
    document.querySelector('.sum-of-price').textContent=`總價：新台幣 ${booking.price} 元`;
  }

  function renderNoBookingMessage(user_info) {
    const body = document.body;
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const username = user_info.name || '訪客';

    body.innerHTML = '';

    const greetingDiv = document.createElement('div');
    greetingDiv.className = 'booking-info-greeting-delete';
    greetingDiv.textContent = `您好，${username}，待預訂的行程如下：`;

    const messageDiv = document.createElement('div');
    messageDiv.textContent = '沒有預定行程';
    messageDiv.className = 'booking-info-box-delete'; 

    const containerInfoDelDiv=document.createElement('div');
    containerInfoDelDiv.className='booking-info-delete-container';
    containerInfoDelDiv.appendChild(greetingDiv);
    containerInfoDelDiv.appendChild(messageDiv);
    
    body.appendChild(header.cloneNode(true));
    body.appendChild(containerInfoDelDiv);
    body.appendChild(footer.cloneNode(true)); 
  }

  async function renderBookingPage(user){
    try{
      const bookingData=await fetchBookingData();
      const booking=bookingData.data;

      if (!booking || !booking.attraction || Object.keys(booking.attraction).length === 0) {
        renderNoBookingMessage(user.data);
      }else{
        updateDOMWithBookingData(user.data, booking);
      }
    }catch (error){
        console.error("Error fetching booking data:", error);
        renderNoBookingMessage();
    }
  }
  async function initializePage(){
    try{
      const user = await verifyUserSignInToken();
      redirectUnauthorizedUser(user);
      checkUserSignInStatus(user);
      await renderBookingPage(user);
    }catch (error){
      console.error("Error verifying user token:", error);
      window.location.href="/";
    } 
  }

  const deleteBookingBtn = document.getElementById('btn-delete-booking');
  if (deleteBookingBtn) {
    deleteBookingBtn.addEventListener('click', deleteBooking);
  }

  function deleteBooking() {
    if (!confirm('確定要刪除此預訂嗎？')) {
      return;
    }

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
      alert('預訂已成功刪除');
      location.reload();
    })
    .catch(error => {
      console.error("Error deleting booking:", error);
      alert('刪除預訂時發生錯誤');
    });
  }

  initializePage();
});