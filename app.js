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

function initAutocomplete() {
    var originAutoComplete = new google.maps.places.Autocomplete(
        document.getElementById("origin"), {
          componentRestrictions: {"country": ["CA"]}
        }
    );
    originAutoComplete.addListener('place_changed', function() {
      onOriginPlaceChanged(originAutoComplete);
    });

    var destinationAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById("destination"), {
          componentRestrictions: {"country": ["CA"]}
        }
    );
    destinationAutocomplete.addListener('place_changed', function() {
      onDestinationPlaceChanged(destinationAutocomplete);
    });
}

function onOriginPlaceChanged(originAutoComplete) {
  var place = originAutoComplete.getPlace();
  if (!place.geometry) {
    console.log("OriginError");
  } else {
    var orgLat = place.geometry.location.lat();
    var orgLng = place.geometry.location.lng();
    originCoords = {lat: orgLat, lng: orgLng};
  }
}

function onDestinationPlaceChanged(destinationAutocomplete) {
  var place = destinationAutocomplete.getPlace();
  if (!place.geometry) {
    console.log("DestinationError");
  } else {
    var desLat = place.geometry.location.lat();
    var desLng = place.geometry.location.lng();
    destinationCoords = {lat: desLat, lng: desLng};
  }
}

function createMap(origin, destination) {
    const map = new google.maps.Map(document.getElementById("map"), {
      zoom: 7,
      center: origin,
    });
  
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true,
    });
  
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },

      (response, status) => {
        if (status === "OK") {
          directionsRenderer.setDirections(response);
          displayInstructions(response);
          travelTime(response);
        } else {
          window.alert("Directions request failed due to " + status);
        }
      }
    );
}


function travelTime(directionsResult) {
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
  var End407Coords

  for (var j = 0; j < directionsResult.routes[0].legs[0].steps.length; j++) {
    var condense = directionsResult.routes[0].legs[0].steps[j];
    var instruction = condense.instructions;
    var currLat = condense.start_location.lat();
    var currLng = condense.start_location.lng();
    DirectionInstructions.innerHTML += '<p>' + instruction + "   ----------> COORDS ARE: " + currLat + "," + currLng + '</p>';
    var currentCoords = {lat: currLat, lng: currLng};
    
    if (counter == 0) {
      if (isToll(instruction)) {
        counter++;
        DirectionInstructions.innerHTML += '<p>' + "ON TOLL" + '</p>';
        Start407 = await findMatchingCoords(currentCoords);
        console.log(Start407.COMMENT);
        Start407Coords = currentCoords;
      }
    }
    if (counter == 1) {
      if (!isToll(instruction)) {
        counter++;
        DirectionInstructions.innerHTML += '<p>' + "OFF TOLL" + '</p>';
        End407 = await findMatchingCoords(currentCoords);
        console.log(End407.COMMENT);
        End407Coords = currentCoords;
      }
    }

    DirectionInstructions.innerHTML += '<p>' + "__________________________________________________" + '</p>';
  }

  calculateTollInfo(Start407Coords, End407Coords);
}

function areCoordsClose(routeCoords, actualCoords, tolerance) {
  const earthRadius = 6371;

  const diffLat = degToRad(actualCoords.lat - routeCoords.lat);
  const diffLng = degToRad(actualCoords.lng - routeCoords.lng);

  const routeLat = degToRad(routeCoords.lat);
  const actualLat = degToRad(actualCoords.lat);

  var distance = Math.sin(diffLng/2)*Math.sin(diffLng/2) + Math.cos(routeLat)*Math.cos(actualLat)*Math.sin(diffLat/2)*Math.sin(diffLat/2);
  distance = 2*earthRadius*Math.asin(Math.sqrt(distance));

  return distance <= tolerance;
}

function degToRad(degree) {
  return degree * (Math.PI / 180);
}

async function findMatchingCoords(routeCoords) {
  const response = await fetch("407Zones.JSON");
  const data = await response.json();

  const size = data.Coords.length;

  for (var i=0; i<size; i++) {
    const dataFromJSON = data.Coords[i];

    var jsonCoords = {lat: dataFromJSON.Lat, lng: dataFromJSON.Lng};
    var tolerance = dataFromJSON.Tol;

    if (areCoordsClose(routeCoords, jsonCoords, tolerance)) {
      return dataFromJSON;
    } 
  }
}

function isToll(string) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(string, 'text/html');
  return doc.body.textContent.includes('Toll road');
}

function calculateTollInfo (origin, destination) {
  const directionsService = new google.maps.DirectionsService();

  directionsService.route(
    {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
    },

    (response, status) => {
      if (status === "OK") {
        var tollInfo = document.getElementById("tollInfo");
        tollInfo.innerHTML = '';

        var route = response.routes[0];

        tollInfo.innerHTML += '<p>' + "TIME: " + route.legs[0].duration.text + '</p>';
        tollInfo.innerHTML += '<p>' + "DISTANCE: " + route.legs[0].distance.value + '</p>';

      } else {
        window.alert("Directions request failed due to " + status);
      }
    }
  );
}

function updateRoute() {
    createMap(originCoords, destinationCoords);
}