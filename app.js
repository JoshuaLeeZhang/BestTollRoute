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

function displayInstructions(directionsResult) {
  var DirectionInstructions = document.getElementById("DirectionInstructions");
  DirectionInstructions.innerHTML = '';

  for (var j = 0; j < directionsResult.routes[0].legs[0].steps.length; j++) {
    var instruction = directionsResult.routes[0].legs[0].steps[j].instructions;
    var lat = directionsResult.routes[0].legs[0].steps[j].start_location.lat();
    var lng = directionsResult.routes[0].legs[0].steps[j].start_location.lng();
    DirectionInstructions.innerHTML += '<p>' + instruction + " ";
    DirectionInstructions.innerHTML += lat + "," + lng + '</p>';

    // if (counter == 0) {
    //   if (isToll(instruction)) {
    //     counter++;
    //   } else {
    //     start407 = extractStreetName(instruction);
    //   }
    // }
    // if (counter == 1) {
    //   if (!isToll(instruction)) counter++;
    //   end407 = extractStreetName(instruction);
    // }
  }
}

function areCoordsClose(routeCoords, actualCoords, tolerance) {
  var distance = sqrt((routeCoords.lat - actualCoords.lat)*(routeCoords.lat - actualCoords.lat) + (routeCoords.lng - actualCoords.lng)*(routeCoords.lng - actualCoords.lng));
  return distance <= tolerance;
}

// function extractStreetName(string) {
//   var parser = new DOMParser();
//   var doc = parser.parseFromString(string, 'text/html');
//   var boldElements = doc.querySelectorAll('b');
//   return boldElements[1].textContent;
// }

function isToll(string) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(string, 'text/html');
  return doc.body.textContent.includes('Toll road');
}

let start407;
let end407;
var counter = 0; // at 0 is before 407, at 1 is on 407, at 2 is after 407
  

function updateRoute() {
    createMap(originCoords, destinationCoords);
}