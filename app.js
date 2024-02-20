function loadMapScript() {
  const apiKey = document.getElementById('api-key').value;
  
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAaKHa0arLH9YjeKzYU0yc8ILNCBkzFC7U&loading=async&libraries=places&callback=initGoogleMaps`;

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

let originCoords;
let destinationCoords;
let toll = true;
let weekend = false;

async function updateRoute() {
  const calculatedRoute = await createRoute(originCoords, destinationCoords, toll);
  displayRoute(calculatedRoute);
  displayInstructions(calculatedRoute);
  displayTravelTime(calculatedRoute);
}

function createRoute(origin, destination, toll) {
  return new Promise((resolve, reject) => {
    const directionsService = new google.maps.DirectionsService();

    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      avoidTolls: !toll
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

function displayTravelTime(directionsResult) {
  const travelTime = document.getElementById("travelTime");
  travelTime.innerHTML = '<p>' + directionsResult.routes[0].legs[0].duration.text + '</p>';
}

async function displayInstructions(directionsResult) {
  const DirectionInstructions = document.getElementById("DirectionInstructions");
  DirectionInstructions.innerHTML = '';

  let counter = 0;
  let Start407;
  let End407;
  let Start407Coords;
  let End407Coords;

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
        Start407 = await findMatchingCoords(currentCoords);
        console.log(Start407.data.COMMENT);
        Start407Coords = currentCoords;
        counter++;
      }
    }
    if (counter == 1) {
      if (!isToll(instruction)) {
        End407 = await findMatchingCoords(currentCoords);
        console.log(End407.data.COMMENT);
        End407Coords = currentCoords;
        counter++;
      }
    }

    DirectionInstructions.innerHTML += '<p>' + "__________________________________________________" + '</p>';
  }  

  calculateTollInfo(Start407Coords, End407Coords);
}

document.addEventListener("DOMContentLoaded", function() {
  let tollCheckbox = document.getElementById("tollCheckbox");
  let weekendCheckbox = document.getElementById("weekendCheckbox")

  tollCheckbox.addEventListener("change", function() {
    toll = this.checked;
  })

  weekendCheckbox.addEventListener("change", function() {
    weekend = this.checked;
  })
})