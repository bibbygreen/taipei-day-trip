const bookingNumberDiv = document.getElementById('booking-number');

function setupTPDirectSDK() {
  TPDirect.setupSDK(151901, 'app_vixuBsk4bJ7W6FZe0OBoujnI0ZnDoDMSaY0qPzrWxvcgV1DJply2PeV8BlZV', 'sandbox');

  let fields = {
    number: {
      element: '#card-number',
      placeholder: '**** **** **** ****'
    },
    expirationDate: {
      element: document.getElementById('card-expiration-date'),
      placeholder: 'MM / YY'
    },
    ccv: {
      element: '#card-ccv',
      placeholder: 'ccv'
    }
  };

  TPDirect.card.setup({
    fields: fields,
    styles: {
      'input': {
        'color': 'gray'
      },
      '.valid': {
        'color': 'green'
      },
      '.invalid': {
        'color': 'red'
      },
      '@media screen and (max-width: 400px)': {
        'input': {
          'color': 'orange'
        }
      }
    },
    isMaskCreditCardNumber: true,
    maskCreditCardNumberRange: {
      beginIndex: 6,
      endIndex: 11
    }
  });

  TPDirect.card.onUpdate(function(update) {
    const btnConfirmPayment = document.getElementById('confirm-payment');
    if (update.canGetPrime) {
      btnConfirmPayment.removeAttribute('disabled');
    } else {
      btnConfirmPayment.setAttribute('disabled', true);
    }
  });

  // Add event listener for form submission
  const btnConfirmPayment = document.getElementById('confirm-payment');
  btnConfirmPayment.addEventListener('click', onSubmitOrder);
}

// Function to handle form submission
async function onSubmitOrder(event) {
  event.preventDefault();

  const tappayStatus = TPDirect.card.getTappayFieldsStatus();
  if (!tappayStatus.canGetPrime) {
    alert('Cannot get prime. Please check the card information and try again.');
    return;
  }

  TPDirect.card.getPrime((result) => {
    if (result.status !== 0) {
      alert('Failed to get prime. Error: ' + result.msg);
      return;
    }

    const prime = result.card.prime;
    const contactName = document.getElementById('contact-name-input').value;
    const contactEmail = document.getElementById('contact-email-input').value;
    const contactPhone = document.getElementById('contact-phone-input').value;
    const bookingAttractionName = document.querySelector('.booking-attraction-name').textContent;
    const bookingDate = document.querySelector('.booking-date').textContent.split('：')[1];
    const bookingTimeText = document.querySelector('.booking-time').textContent.split('：')[1];
    const bookingFee = document.querySelector('.booking-fee').textContent.split('：')[1];
    const bookingAttractionAddress = document.querySelector('.booking-attraction-address').textContent.split('：')[1];
    const bookingAttractionImage = document.querySelector('.attraction-img img').getAttribute('src');

    const bookingTime = bookingTimeText === '上午九點至下午二點' ? 'morning' : 'afternoon';
    const orderData={
      prime: prime,
      order: {
        price: parseInt(bookingFee),
        trip: {
          attraction: {
            // id: attractionId,  // Include the attraction ID here
            name: bookingAttractionName,
            address: bookingAttractionAddress,
            image: bookingAttractionImage
          },
          date: bookingDate,
          time: bookingTime
        },
        contact: {
          name: contactName,
          email: contactEmail,
          phone: contactPhone
        }
      }
    };
        
    fetch("/api/orders", {
      method: "POST",
      headers:{
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(orderData)
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          console.error('Error response from server:', error); // Log the error response
          throw new Error(`Booking failed: ${error.message}`);
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.data.payment.status === 1) {
        window.location.href = `/thankyou?number=${data.data.number}`;
      } else {
        console.log(data.data.payment.status);
        alert('Booking failed. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert(`Booking failed. Please try again. Error: ${error.message}`);
    });
  });
}

// Load TPDirect SDK script dynamically
const script = document.createElement('script');
script.src = 'https://js.tappaysdk.com/sdk/tpdirect/v5.14.0';
script.async = true;
document.head.appendChild(script);

// Execute setup function after TPDirect SDK script is loaded
script.onload = setupTPDirectSDK;