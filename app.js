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

var originCoords;
var destinationCoords;

let originAutoComplete;
let destinationAutocomplete;

function initAutocomplete() {
    originAutoComplete = new google.maps.places.Autocomplete(
        document.getElementById("origin"), {
          componentRestrictions: {"country": ["CA"]}
        }
    );
    originAutoComplete.addListener('place_changed', onOriginPlaceChanged);

    destinationAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById("destination")
    );
    destinationAutocomplete.addListener('place_changed', onDestinationPlaceChanged);
}

function onOriginPlaceChanged() {
  var place = originAutoComplete.getPlace();
  if (!place.geometry) {
    console.log("OriginError");
  } else {
    var orgLat = place.geometry.location.lat();
    var orgLng = place.geometry.location.lng();
    originCoords = {lat: orgLat, lng: orgLng};
  }
}

function onDestinationPlaceChanged() {
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
        } else {
          window.alert("Directions request failed due to " + status);
        }
      }
    );
}

function displayInstructions(directionsResult) {
  var DirectionInstructions = document.getElementById("DirectionInstructions");
  DirectionInstructions.innerHTML = '';
  
  var route  = directionsResult.routes[0];

  for (var i = 0; i < route.legs.length; i++) {
    var leg = route.legs[i];
    
    for (var j = 0; j < leg.steps.length; j++) {
      var step = leg.steps[j];
      var lat = step.start_location.lat();
      var lng = step.start_location.lng();
      DirectionInstructions.innerHTML += '<p>' + step.instructions + '</p>';
      console.log(lat + "," + lng);
    }
  }
}
  

function updateRoute() {
    createMap(originCoords, destinationCoords);
}