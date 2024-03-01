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
      center: {lat: 43.69, lng: -79.37}
    });
}

async function testFunction() {
  destinationCoords = {
    lat: 43.78003004333791, 
    lng: -79.4158018519877
  }

  originCoords = {
    lat: 43.84461895842245, 
    lng: -79.2448531687698
  }

  let answer = await mostCostEffectiveToll(originCoords, 35, 27, destinationCoords, isWeekend, hasTransponder);

  console.log(answer);
}

let originCoords;
let destinationCoords;
let avoidToll = false;
let isWeekend = false;
let hasTransponder = false;

async function updateRoute() {
  const calculatedRoute = await createRoute(originCoords, destinationCoords, avoidToll);
  displayRoute(calculatedRoute);
  const routeData = await displayInstructions(calculatedRoute);
  displayTravelTime(calculatedRoute);

  if (typeof routeData.tollStartIndex == 'undefined') {
    console.log("No toll needed");
  } else {
    const mostCostEffectiveTollRoute = mostCostEffectiveToll(originCoords, routeData.tollStartIndex, routeData.tollEndIndex, destinationCoords, isWeekend, hasTransponder);
  }
}

async function createRoute(origin, destination, toll) {
  return new Promise((resolve, reject) => {
    const directionsService = new google.maps.DirectionsService();

    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      avoidTolls: toll
    }, 

      (response, status) => {
        if (status == "OK") resolve(response);
        else reject("Request failed due to: " + status);
      }
    )
  })
}

function displayRoute(calculatedRoute) {
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: originCoords,
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

async function displayInstructions(directionsResult) {
  const DirectionInstructions = document.getElementById("DirectionInstructions");
  DirectionInstructions.innerHTML = '';

  let counter = 0;
  let Start407Data;
  let End407Data;
  let tollStartIndex;
  let tollEndIndex;

  for (let j = 0; j < directionsResult.routes[0].legs[0].steps.length; j++) {
    let step = directionsResult.routes[0].legs[0].steps[j];

    let instruction = step.instructions;
    let currLat = step.start_location.lat();
    let currLng = step.start_location.lng();

    DirectionInstructions.innerHTML += '<p>' + instruction + '</p>';
    
    // console.log(instruction + "COORDS: " + currLat + "," + currLng);
    
    let currentCoords = {lat: currLat, lng: currLng};
    
    if (counter == 0) {
      if (isToll(instruction)) {
        const Start407 = await findMatchingCoords(currentCoords);
        Start407Data = Start407.data;
        tollStartIndex = Start407.index;
        counter++;

        console.log(Start407.data.COMMENT); // FOR DEBUGGING
      }
    }
    if (counter == 1) {
      if (!isToll(instruction)) {
        const End407 = await findMatchingCoords(currentCoords);
        End407Data = End407.data;
        tollEndIndex = End407.index;
        counter++;

        console.log(End407.data.COMMENT); // FOR DEBUGGING
      }
    }

    DirectionInstructions.innerHTML += '<p>' + "__________________________________________________" + '</p>';
  }

  return {
    Start407Data,
    End407Data,
    tollStartIndex,
    tollEndIndex
  }

}

document.addEventListener("DOMContentLoaded", function() {
  let tollCheckbox = document.getElementById("tollCheckbox");
  let weekendCheckbox = document.getElementById("weekendCheckbox")
  let transCheckbox = document.getElementById("transCheckbox")

  tollCheckbox.addEventListener("change", function() {
    avoidToll = this.checked;
  })

  weekendCheckbox.addEventListener("change", function() {
    isWeekend = this.checked;
  })

  transCheckbox.addEventListener("change", function() {
    hasTransponder = this.checked;
  })
})