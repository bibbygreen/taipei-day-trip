let headLine=document.querySelector('.headline');
headLine.addEventListener("click", (e) => {
  location.href="/";
});
document.addEventListener("DOMContentLoaded", () => {
  prevBtn=document.getElementById('btn-left');
  nextBtn=document.getElementById('btn-right');
  
  // Extract attraction ID from URL
  const href=location.href;
  const pattern=/^http:.+\/attraction\/(\d+)$/;
  const match=href.match(pattern);
  if (match) {
    const attractionID=match[1];
    renderAttraction(attractionID);
  } else {
    console.error("Invalid URL format. Unable to extract attraction ID.");
    }
});
async function renderAttraction(attractionID) {
  const url=`/api/attraction/${attractionID}`;
  const response=await fetch(url, { method: "GET" });
  const data=await response.json();
  displayAttraction(data); // Function to update the DOM with the attraction data
}

function displayAttraction(data) {
  document.querySelector('.profile-attraction-name').textContent=data.data.name;
  document.querySelector('.profile-attraction-cat-mrt').textContent=`${data.data.category} at ${data.data.mrt}`;
  document.querySelector('.infos-description').textContent=data.data.description;
  document.querySelector('.infos-address-text').textContent=data.data.address;
  document.querySelector('.infos-transport-text').textContent=data.data.transport;

  const images=data.data.images; 
  updateSlider(images);
}

function updateSlider(images) {
  const slide=document.getElementById('slide');
  const dotsContainer=document.querySelector('.dots');
  // slide.innerHTML=''; // Clear existing images
  // dotsContainer.innerHTML=''; // Clear existing dots

  images.forEach((url, index) => {
    const img=document.createElement('img');
    img.classList.add('attraction-img');
    img.src=url;
    slide.appendChild(img);

    const dot=document.createElement('div');
    dot.classList.add('dot');
    dot.dataset.index=index;
    dotsContainer.appendChild(dot);
  });
  initializeSlider();
}
function initializeSlider() {
  setTimeout(() => {
    let counter=0;
    const items=document.querySelectorAll('.attraction-img');
    const itemsCount=items.length;
    const prevBtn=document.getElementById('btn-left');
    const nextBtn=document.getElementById('btn-right');
    const dots=document.querySelectorAll('.dot');
    const timer=4000;
    let interval=setInterval(showNext, timer);

    const showCurrent=() => {
      const itemToShow=Math.abs(counter % itemsCount);
      items.forEach((el, index) => {
        el.classList.remove('show');
        dots[index].classList.remove('active');
      });
      items[itemToShow].classList.add('show');
      dots[itemToShow].classList.add('active');
    };

    function showNext() {
      counter++;
      showCurrent();
    }
    function showPrev() {
      counter--;
      showCurrent();
    }
    
    function showImage(index) {
      counter=index;
      showCurrent();
    }

    document.getElementById('slide').addEventListener('mouseover', () => clearInterval(interval));
    document.getElementById('slide').addEventListener('mouseout', () => interval=setInterval(showNext, timer));
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        const index=parseInt(e.target.dataset.index);
        showImage(index);
      });
    });

    items[0].classList.add('show');
    dots[0].classList.add('active');
  }, 100);
}

function radioToBookingFee(timeOfDay) {
  const bookingFeeSpan=document.getElementById('booking-fee');
  let price;
  
  if(timeOfDay === 'morning'){
    price=2000;
  }else if (timeOfDay === 'afternoon'){
    price=2500;
  }
  bookingFeeSpan.textContent=price;
}