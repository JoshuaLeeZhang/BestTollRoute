function loadMapScript() {
  const apiKey = document.getElementById('api-key').value;
  
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places&callback=initGoogleMaps`;

  document.head.appendChild(script);
}

function initGoogleMaps() {
  initMap();
  initAutocomplete();
}

function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      zoom: 8,
      center: {lat: 43.69, lng: -79.37},
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
}

let originCoords;
let destinationCoords;
let avoidToll = false;
let isWeekend = false;
let hasTransponder = false;

async function updateRoute() {
  const calculatedRoute = await createRoute(originCoords, destinationCoords, avoidToll);
  displayRoute(calculatedRoute);
  const routeData = await routeInstructions(calculatedRoute);

  if (typeof routeData.tollStartIndex == 'undefined') {
    console.log("No toll needed");
  } else {
    const mostCostEffectiveTollRoute = await mostCostEffectiveToll(originCoords, routeData.tollStartIndex, routeData.tollEndIndex, destinationCoords, isWeekend, hasTransponder);
    console.log(mostCostEffectiveTollRoute);
  }
}

function displayRoute(calculatedRoute) {
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: originCoords,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });

  const directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    suppressMarkers: true,
  });

  directionsRenderer.setDirections(calculatedRoute);
}

async function displayTravelTime(directionsResult) {
  const travelTime = document.getElementById("travelTime");
  travelTime.innerHTML = '<p>' + directionsResult.routes[0].legs[0].duration.text + '</p>';
}

async function routeInstructions(directionsResult) {
  let counter = 0;
  let Start407Data;
  let End407Data;
  let tollStartIndex;
  let tollEndIndex;

  for (let j = 0; j < directionsResult.routes[0].legs[0].steps.length; j++) {
    let step = directionsResult.routes[0].legs[0].steps[j];

    let instruction = step.instructions;
    
    let currentCoords = {lat: step.start_location.lat(), lng: step.start_location.lng()};
    
    if (counter == 0) {
      if (isToll(instruction)) {
        const Start407 = await findMatchingCoords(currentCoords);
        Start407Data = Start407.data;
        tollStartIndex = Start407.index;
        counter++;

        console.log("ORIGINAL TOLL ENTRY:" + Start407.data.COMMENT); // FOR DEBUGGING
      }
    }
    if (counter == 1) {
      if (!isToll(instruction)) {
        const End407 = await findMatchingCoords(currentCoords);
        End407Data = End407.data;
        tollEndIndex = End407.index;
        counter++;

        console.log("ORIGINAL TOLL EXIT:" + End407.data.COMMENT); // FOR DEBUGGING
      }
    }
  }

  return {
    Start407Data,
    End407Data,
    tollStartIndex,
    tollEndIndex
  }

}

document.addEventListener("DOMContentLoaded", function() {
  let weekendCheckbox = document.getElementById("weekendCheckbox");
  let transCheckbox = document.getElementById("transCheckbox");

  weekendCheckbox.addEventListener("change", function() {
    isWeekend = this.checked;
    console.log("WEEKEND SWITCHED TO: " + isWeekend)
  })

  transCheckbox.addEventListener("change", function() {
    hasTransponder = this.checked;
    console.log("TRANSPONDER SWITCHED TO: " + hasTransponder)
  })
})