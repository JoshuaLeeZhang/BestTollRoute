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