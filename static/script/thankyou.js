function getQueryParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

async function verifyUserSignInToken() {
  const token = localStorage.getItem('token');
  if (token) {
    const response = await fetch("/api/user/auth", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Token verification failed');
    }
    return await response.json();
  } else {
    throw new Error('No token found');
  }
}
async function checkPayment() {

  const orderNumber = getQueryParameter('number');
  if (!orderNumber) {
    throw new Error('Order number not found');
  }
  
  const response = await fetch(`/api/order/${orderNumber}`);
  if (!response.ok) {
    throw new Error('Failed to fetch order details');
  }
  const orderData = await response.json();
}

async function fetchOrderData(orderNumber){
  const response=await fetch(`/api/order/${orderNumber}`,{
    method: "GET",
    headers:{
      "Authorization": `Bearer ${localStorage.getItem('token')}`
    }
  });
  if (!response.ok){
    throw new Error('Failed to fetch ordered data');
  }
  return await response.json();
}

document.addEventListener("DOMContentLoaded", async () => {
  const modal = document.getElementById('modal');
  const navSignIn = document.getElementById('signin-signup');
  const navBookingTour=document.getElementById("booking-tour");

  function clickToShowModal() {
    modal.style.display = "block";
  }

  function handleSignOut() {
    localStorage.removeItem('token');
    checkUserSignInStatus();
  }

  function redirectToBookingPage() {
    window.location.href = "/booking";
  }

  navBookingTour.onclick = function () {
    verifyUserSignInToken()
      .then(data => {
        if (data) {
          redirectToBookingPage();
        } else {
          clickToShowModal();
        }
      })
      .catch(error => {
        console.error(error);
        clickToShowModal();
      });
  }
  async function checkUserSignInStatus() {
    try {
      const user = await verifyUserSignInToken();
      if (user) {
        navSignIn.textContent = "登出系統";
        navSignIn.onclick = handleSignOut;
        // window.location.href = '/';
      } else {
        navSignIn.textContent = "登入/註冊";
        navSignIn.onclick = clickToShowModal;
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      window.location.href = '/';
    }
  }

  const orderNumber = getQueryParameter('number');
  const orderNumberElement = document.getElementById('order-number');
  const iconElement = document.getElementById('icon-img');

  if (orderNumberElement && iconElement) {
    if (orderNumber) {
      iconElement.src = "/static/pics/checked.png";
      iconElement.alt = "Order Success";
      orderNumberElement.textContent = orderNumber;
    } else {
      iconElement.src = "/static/pics/failed.png"; 
      iconElement.alt = "Order Failed";
      orderNumberElement.innerHTML = "";
      orderNumberElement.textContent = "交易失敗，敬請重新訂購";
    }
  } else {
    console.error("Element order-number or icon-img not found.");
  }
  checkUserSignInStatus();
});