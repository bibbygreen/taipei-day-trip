const searchButton = document.getElementById("search-button");
const searchQueryText=document.getElementById("search-query-text");
const attractionsContainer = document.querySelector(".attractions-container");
const loadMoreTrigger = document.getElementById('load-more-trigger');

let nextPage = 0;  // Start with the initial page
let isFetching = false;  // To prevent multiple fetches
let currentKeyword = "";  // Track the current keyword
// Event listener
searchButton.addEventListener("click", queryBySearchBar);


let mrtListContainer=document.querySelector(".mrt-list-container");
let mrtListBlock=document.querySelector(".mrt-list-block");
// 取得捷運站列表
// let url="/api/mrts";
// let url="http://52.89.165.57:8000/api/mrts";
let url="http://127.0.0.1:8000/api/mrts";
fetch(url)
  .then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    return response.json();
  })
  .then((data) => {
    let mrts = data["data"];
    for (let mrt of mrts) {
        let mrtListItem = document.createElement("div");
        mrtListItem.textContent = mrt;
        mrtListItem.className = "mrt-list-text";
        // mrtListItem.addEventListener("click", searchByMRT);
        mrtListItem.addEventListener("click", function(event) {
          queryByClickMrt(event.target);
        });
        mrtListContainer.appendChild(mrtListItem);
    }
  })
  .catch((error) => {
    console.error('There has been a problem with your fetch operation:', error);
  });

// mrt scroll bar
let btn_left = document.getElementById("btn-left");
let btn_right = document.getElementById("btn-right");
// Function to calculate scrollAmount based on the width of the container
function calculateScrollAmount() {
  // Get the width of the container
  const containerWidth = mrtListContainer.offsetWidth;
  return containerWidth/2; 
}
// Function to handle scrolling to the left
function scrollLeft() {
  mrtListContainer.scrollBy({
    left: -calculateScrollAmount(),
    behavior: 'smooth' // Use smooth scrolling behavior
  });
}
// Function to handle scrolling to the right
function scrollRight() {
  mrtListContainer.scrollBy({
    left: calculateScrollAmount(),
    behavior: 'smooth' // Use smooth scrolling behavior
  });
}
btn_left.addEventListener("click", scrollLeft);
btn_right.addEventListener("click", scrollRight);

// Attach click event listener to the MRT Station names
mrtListBlock.addEventListener("click", function(event) {
  // Check if the click occurred on an MRT Station name
  if (event.target.classList.contains("mrt-list-text")) {
    queryByClickMrt(event.target);
  }
});
// function start ----------
function fetchAndRenderAttractions(page, keyword="") {
  let url = `http://127.0.0.1:8000/api/attractions?page=${page}`;
  // url = `/api/attractions?page=${page}`;
  if(keyword) {
    url+=`&keyword=${keyword}`;
  }
  url=encodeURI(url);
  isFetching=true;  // Set fetching flag to true

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      if (page === 0) {
        // First page: replace existing list
        attractionsContainer.replaceChildren();
      }
      renderAttractions(data.data);
      nextPage=data.nextPage;
      isFetching=false;  // Reset fetching flag
    })
    .catch((error) => {
      console.error('There has been a problem with your fetch operation:', error);
      isFetching = false;  // Reset fetching flag on error
    });
  }

function renderAttractions(attractions) {
  attractions.forEach(attraction => {
      const attractionBlock = createAttractionBlock(attraction);
      attractionsContainer.appendChild(attractionBlock);
  });
}

function createAttractionBlock(attraction) {
  const attractionBlock = document.createElement("div");
  attractionBlock.className = "attraction-block";

  const attractionImg = createAttractionImage(attraction.images);
  attractionBlock.appendChild(attractionImg);

  const attractionName = createAttractionName(attraction.name);
  attractionBlock.appendChild(attractionName);

  const attractionInfo = createAttractionInfo(attraction.mrt, attraction.category);
  attractionBlock.appendChild(attractionInfo);

  return attractionBlock;
}

function createAttractionImage(images) {
  const attractionImg = document.createElement("div");
  attractionImg.className = "attraction-img";
  
  // Handle missing or empty images array
  const firstImageUrl = images && images.length > 0 ? images[0] : 'default-image-url.jpg';
  attractionImg.style.backgroundImage = `url(${firstImageUrl})`;

  return attractionImg;
}

function createAttractionName(name) {
  const attractionName = document.createElement("div");
  attractionName.className = "attraction-name";

  const attractionNameTxt = document.createElement("div");
  attractionNameTxt.className = "attraction-name-txt";
  attractionNameTxt.textContent = name || 'Unknown';

  attractionName.appendChild(attractionNameTxt);
  return attractionName;
}

function createAttractionInfo(mrt, category) {
  const attractionInfo = document.createElement("div");
  attractionInfo.className = "attraction-info";

  const attractionInfoMrt = document.createElement("div");
  attractionInfoMrt.className = "attraction-info-mrt";
  attractionInfoMrt.textContent = mrt || '無';

  const attractionInfoCategory = document.createElement("div");
  attractionInfoCategory.className = "attraction-info-category";
  attractionInfoCategory.textContent = category || 'Unknown';

  attractionInfo.appendChild(attractionInfoMrt);
  attractionInfo.appendChild(attractionInfoCategory);

  return attractionInfo;
}
// query by search bar
// function queryBySearchBar() {
//   currentKeyword = searchQueryText.value;  // Update the current keyword
//   nextPage = 0;  // Reset nextPage to 0 for a new search
//   fetchAndRenderAttractions(nextPage, currentKeyword);
//   searchQueryText.value = "";
// }
function queryBySearchBar(){
  currentKeyword = searchQueryText.value;  // Update the current keyword
  nextPage = 0;  // Reset nextPage to 0 for a new search
  // url = `/api/attractions?page=0&keyword=${searchQueryText.value}`;
  url = `http://127.0.0.1:8000/api/attractions?page=0&keyword=${currentKeyword}`;
  url = encodeURI(url);
  fetch(url)
  .then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    return response.json();
  })
  .then((data) => {
    attractions = data["data"];
    nextPage = data["nextPage"];
    attractionsContainer.replaceChildren();  // Replace existing list
    renderAttractions(attractions);
    // if (nextPage != null){
    //   fetchAndRenderAttractions(nextPage, currentKeyword);
    // }
    // currentKeyword="";
});
}

function queryByClickMrt(target){
  const clickedMRTStation = target.textContent.trim();
  searchQueryText.value = clickedMRTStation;
  queryBySearchBar();
}
// Function to handle window scroll event
function handleScroll() {
  // Check if the user has scrolled to the bottom of the page
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
    // If not currently fetching and there is a next page, fetch and render attractions
    if (!isFetching && nextPage !== null) {
      fetchAndRenderAttractions(nextPage, currentKeyword);
    }
  }
}

// Attach scroll event listener to the window
window.addEventListener('scroll', handleScroll);

// Initial fetch when DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderAttractions(nextPage, currentKeyword);
});
// function renderNextPage(entries, observer) {
//   entries.forEach(entry => {
//     if (entry.isIntersecting && !isFetching && nextPage !== null) {
//       fetchAndRenderAttractions(nextPage, currentKeyword);
//     }
//   });
// }
// IntersectionObserver callback
// function loadMoreEntries(entries, observer) {
//   entries.forEach(entry => {
//     if (entry.isIntersecting && !isFetching && nextPage !== null) {
//       fetchAndRenderAttractions(nextPage, currentKeyword);
//       }
//   });
// }
// // Set up IntersectionObserver
// function setupIntersectionObserver() {
//   const observer = new IntersectionObserver(loadMoreEntries, {
//       root: null,  // Default is the viewport
//       rootMargin: '0px',
//       threshold: 1.0
//   });   
//   observer.observe(loadMoreTrigger);
//   return observer; // Return the observer
// }
  
// // Initial fetch when DOM content is loaded
// document.addEventListener("DOMContentLoaded", () => {
//   fetchAndRenderAttractions(nextPage);
//   setupIntersectionObserver();
// });