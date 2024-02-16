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

let originCoords;
let destinationCoords;
let toll = true;
let eastOrWest; //1 for EAST, 0 for WEST

async function updateRoute() {
  var calculatedRoute = await createRoute(originCoords, destinationCoords, toll);
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
  var travelTime = document.getElementById("travelTime");
  travelTime.innerHTML = '';

  var route = directionsResult.routes[0];

  travelTime.innerHTML += '<p>' + directionsResult.routes[0].legs[0].duration.text + '</p>';
}

async function displayInstructions(directionsResult) {
  var DirectionInstructions = document.getElementById("DirectionInstructions");
  DirectionInstructions.innerHTML = '';

  var counter = 0;
  var Start407;
  var End407;
  var Start407Coords;
  var End407Coords;

  for (var j = 0; j < directionsResult.routes[0].legs[0].steps.length; j++) {
    var condense = directionsResult.routes[0].legs[0].steps[j];

    var instruction = condense.instructions;
    var currLat = condense.start_location.lat();
    var currLng = condense.start_location.lng();

    DirectionInstructions.innerHTML += '<p>' + instruction + '</p>';
    
    console.log(instruction + "COORDS: " + currLat + "," + currLng);
    var currentCoords = {lat: currLat, lng: currLng};
    
    if (counter == 0) {
      if (isToll(instruction)) {
        goingEastOrWest(instruction);
        Start407 = await findMatchingCoords(currentCoords);
        console.log(Start407.COMMENT);
        Start407Coords = currentCoords;
        counter++;
      }
    }
    if (counter == 1) {
      if (!isToll(instruction)) {
        End407 = await findMatchingCoords(currentCoords);
        console.log(End407.COMMENT);
        End407Coords = currentCoords;
        counter++;
      }
    }

    DirectionInstructions.innerHTML += '<p>' + "__________________________________________________" + '</p>';
  }  

  calculateTollInfo(Start407Coords, End407Coords);
}

document.addEventListener("DOMContentLoaded", function() {
  var checkbox = document.getElementById("tollCheckbox");

  checkbox.addEventListener("change", function() {
    toll = this.checked;
  })
})