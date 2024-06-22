const searchButton=document.getElementById("search-button");
const searchQueryText=document.getElementById("search-query-text");
const attractionsContainer=document.querySelector(".attractions-container");
const loadMoreTrigger=document.getElementById('load-more-trigger');

let nextPage=0;  // Start with the initial page
let isFetching=false;  // To prevent multiple fetches
let currentKeyword="";  // Track the current keyword
// Event listener
searchButton.addEventListener("click", queryBySearchBar);

let mrtListContainer=document.querySelector(".mrt-list-container");
let mrtListBlock=document.querySelector(".mrt-list-block");
// 取得捷運站列表
let url="/api/mrts";
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
        let mrtListItem=document.createElement("div");
        mrtListItem.textContent=mrt;
        mrtListItem.className="mrt-list-text";
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
let btn_left=document.getElementById("btn-left");
let btn_right=document.getElementById("btn-right");

function calculateScrollAmount() {
  const containerWidth = mrtListContainer.offsetWidth;
  return containerWidth/2; 
}

function scrollLeft() {
  mrtListContainer.scrollBy({
    left: -calculateScrollAmount(),
    behavior: 'smooth'
  });
}

function scrollRight() {
  mrtListContainer.scrollBy({
    left: calculateScrollAmount(),
    behavior: 'smooth'
  });
}
btn_left.addEventListener("click", scrollLeft);
btn_right.addEventListener("click", scrollRight);

mrtListBlock.addEventListener("click", function(event) {
  // Check if the click occurred on an MRT Station name
  if (event.target.classList.contains("mrt-list-text")) {
    queryByClickMrt(event.target);
  }
});

function fetchAndRenderAttractions(page, keyword="") {
  // let url = `http://127.0.0.1:8000/api/attractions?page=${page}`;
  url=`/api/attractions?page=${page}`;
  if(keyword) {
    url+=`&keyword=${keyword}`;
  }
  url=encodeURI(url);
  isFetching=true;

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
      isFetching=false;
    })
    .catch((error) => {
      console.error('There has been a problem with your fetch operation:', error);
      isFetching = false;
    });
  }

function renderAttractions(attractions) {
  attractions.forEach(attraction => {
      const attractionBlock = createAttractionBlock(attraction);
      attractionsContainer.appendChild(attractionBlock);
  });
}

function createAttractionBlock(attraction) {
  const attractionBlock=document.createElement("div");
  attractionBlock.className="attraction-block";
  attractionBlock.addEventListener("click", () => {
    window.location.href=`/attraction/${attraction.id}`;
  });

  const attractionImg=createAttractionImage(attraction.images);
  attractionBlock.appendChild(attractionImg);

  const attractionName=createAttractionName(attraction.name);
  attractionBlock.appendChild(attractionName);

  const attractionInfo=createAttractionInfo(attraction.mrt, attraction.category);
  attractionBlock.appendChild(attractionInfo);
  
  return attractionBlock;
}
function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img=new Image();
    img.src=url;
    img.onload = () => resolve(url);
    img.onerror = () => reject(url);
  });
}
function createAttractionImage(images) {
  const attractionImg=document.createElement("div");
  attractionImg.className="attraction-img";
  
  // Handle missing or empty images array
  const defaultImageUrl='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const firstImageUrl=images && images.length > 0 ? images[0] : defaultImageUrl;
  /////
  // attractionImg.style.backgroundImage=`url(${firstImageUrl})`;
  /////
  preloadImage(firstImageUrl).then((url) => {
    attractionImg.style.backgroundImage = `url(${url})`;
  }).catch((url) => {
    console.error(`Failed to preload image: ${url}`);
    attractionImg.style.backgroundImage = `url(default-image-url.jpg)`;
  });

  return attractionImg;
}

function createAttractionName(name) {
  const attractionName=document.createElement("div");
  attractionName.className="attraction-name";

  const attractionNameTxt=document.createElement("div");
  attractionNameTxt.className="attraction-name-txt";
  attractionNameTxt.textContent=name || 'Unknown';

  attractionName.appendChild(attractionNameTxt);
  return attractionName;
}

function createAttractionInfo(mrt, category) {
  const attractionInfo=document.createElement("div");
  attractionInfo.className="attraction-info";

  const attractionInfoMrt=document.createElement("div");
  attractionInfoMrt.className="attraction-info-mrt";
  attractionInfoMrt.textContent=mrt || '無';

  const attractionInfoCategory=document.createElement("div");
  attractionInfoCategory.className="attraction-info-category";
  attractionInfoCategory.textContent=category || 'Unknown';

  attractionInfo.appendChild(attractionInfoMrt);
  attractionInfo.appendChild(attractionInfoCategory);

  return attractionInfo;
}

function queryBySearchBar(){
  currentKeyword=searchQueryText.value;  // Update the current keyword
  nextPage=0;  // Reset nextPage to 0 for a new search
  url=`/api/attractions?page=0&keyword=${searchQueryText.value}`;
  url=encodeURI(url);
  fetch(url)
  .then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    return response.json();
  })
  .then((data) => {
    attractions=data["data"];
    nextPage=data["nextPage"];
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