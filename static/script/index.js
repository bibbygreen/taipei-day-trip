
let mrt_list_container=document.querySelector(".mrt-list-container");
let mrt_list_block=document.querySelector(".mrt-list-block");
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
    for (mrt of mrts) {
        let mrt_list_item = document.createElement("div");
        mrt_list_item.textContent = mrt;
        mrt_list_item.className = "mrt-list-text";
        // mrt_list_item.addEventListener("click", searchByMRT);
        mrt_list_container.appendChild(mrt_list_item);
    }
  })
  .catch((error) => {
    console.error('There has been a problem with your fetch operation:', error);
  });


// mrt scroll bar
let btn_left = document.getElementById("btn-left");
let btn_right = document.getElementById("btn-right");

// btn_left.addEventListener("click", scrollLeft);
// btn_right.addEventListener("click", scrollRight);

// url="http://127.0.0.1:8000/api/attractions?page=0"
// fetch(url)
//   .then((response) => {
//     if (!response.ok) {
//       throw new Error('Network response was not ok ' + response.statusText);
//     }
//     return response.json();
//   })
//   .then((data) => {
//     let attractions=data["data"];
//     let nextPage=data["nextPage"];
//     renderAttractions(attractions);
    
// })

const attractions_container = document.querySelector(".attractions-container");
const loadMoreTrigger = document.getElementById('load-more-trigger');
let nextPage = 0;  // Start with the initial page
let isFetching = false;  // To prevent multiple fetches

function fetchAndRenderAttractions(page) {
    const url = `http://127.0.0.1:8000/api/attractions?page=${page}`;
    isFetching = true;  // Set fetching flag to true
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        renderAttractions(data.data);
        nextPage = data.nextPage;
        isFetching = false;  // Reset fetching flag
      })
      .catch((error) => {
        console.error('There has been a problem with your fetch operation:', error);
        isFetching = false;  // Reset fetching flag on error
      });
  }

// function renderAttractions(attractions){
//     for (let attraction of attractions){
//     const attraction_block = document.createElement("div");
//     attraction_block.className="attraction-block";
//     attractions_container.appendChild(attraction_block);

//     const attraction_img=document.createElement("div");
//     attraction_img.className="attraction-img";
//     first_image_url=attraction["images"][0];
//     attraction_img.style.backgroundImage=`url(${first_image_url})`;
    
//     const attraction_name=document.createElement("div");
//     attraction_name.className="attraction-name"

//     const attraction_name_txt=document.createElement("div");
//     attraction_name_txt.className="attraction-name-txt";
//     attraction_name_txt.textContent=`${attraction["name"]}`;
    
//     const attraction_info=document.createElement("div");
//     attraction_info.className="attraction-info";
//     const attraction_info_mrt=document.createElement("div");
//     attraction_info_mrt.className="attraction-info-mrt";
//     attraction_info_mrt.textContent=`${attraction["mrt"]}`;
//     const attraction_info_category=document.createElement("div");
//     attraction_info_category.className="attraction-info-category";
//     attraction_info_category.textContent=`${attraction["category"]}`;
//     attraction_block.appendChild(attraction_img);
//     attraction_name.appendChild(attraction_name_txt);
//     attraction_block.appendChild(attraction_name);
//     attraction_info.appendChild(attraction_info_mrt);
//     attraction_info.appendChild(attraction_info_category);
//     attraction_block.appendChild(attraction_info);
//     }
// }   

function renderAttractions(attractions) {
    attractions.forEach(attraction => {
        const attractionBlock = createAttractionBlock(attraction);
        attractions_container.appendChild(attractionBlock);
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
    attractionNameTxt.textContent = name || 'Unknown Name';

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

// IntersectionObserver callback
function loadMoreEntries(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting && !isFetching && nextPage !== null) {
            fetchAndRenderAttractions(nextPage);
            }
    });
}
  
  // Set up IntersectionObserver
function setupIntersectionObserver() {
    const observer = new IntersectionObserver(loadMoreEntries, {
        root: null,  // Default is the viewport
        rootMargin: '0px',
        threshold: 1.0
    });
    
    observer.observe(loadMoreTrigger);
    return observer; // Return the observer
}
  
// Initial fetch when DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
    fetchAndRenderAttractions(nextPage);
    setupIntersectionObserver();
  });