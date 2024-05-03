function initAutocomplete() {
    const originAutoComplete = new google.maps.places.Autocomplete(
        document.getElementById("origin"), {
          componentRestrictions: {"country": ["CA"]}
        }
    );
    originAutoComplete.addListener('place_changed', function() {
      onOriginPlaceChanged(originAutoComplete);
    });

    const destinationAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById("destination"), {
          componentRestrictions: {"country": ["CA"]}
        }
    );
    destinationAutocomplete.addListener('place_changed', function() {
      onDestinationPlaceChanged(destinationAutocomplete);
    });
}

function onOriginPlaceChanged(originAutoComplete) {
  const place = originAutoComplete.getPlace();
  if (!place.geometry) {
    console.log("OriginError");
  } else {
    const orgLat = place.geometry.location.lat();
    const orgLng = place.geometry.location.lng();
    currentOriginCoords = {lat: orgLat, lng: orgLng};
  }
}

function onDestinationPlaceChanged(destinationAutocomplete) {
  const place = destinationAutocomplete.getPlace();
  if (!place.geometry) {
    console.log("DestinationError");
  } else {
    const desLat = place.geometry.location.lat();
    const desLng = place.geometry.location.lng();
    currentDestinationCoords = {lat: desLat, lng: desLng};
  }
}