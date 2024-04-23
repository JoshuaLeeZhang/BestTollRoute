function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      zoom: 8,
      center: {lat: 43.69, lng: -79.37},
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
}

function displayRoute(calculatedRoute) {
    const map = new google.maps.Map(document.getElementById("map"), {
      zoom: 8,
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

async function drawTollRoute(tollEntryIndex, tollExitIndex) {
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: originCoords,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    });
    
    const renderTO407 = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#FF0000'
        }
    }); //RED

    const renderIN407 = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#0000FF'
        }
    }); //BLUE

    const renderFROM407 = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#00EE00'
        }
    }); //GREEN

    let tollEntryCoords = {lat: undefined, lng: undefined}
    let tollExitCoords = {lat: undefined, lng: undefined}

    if (fastestIndexOnLargeICsENTRY.has(tollEntryIndex)) {
        fastedIndexOnIC = fastestIndexOnLargeICsENTRY.get(tollEntryIndex)

        tollEntryCoords = {
            lat: ICCoords[tollEntryIndex].Coords[fastedIndexOnIC].Lat,
            lng: ICCoords[tollEntryIndex].Coords[fastedIndexOnIC].Lng
        }
    } else {
        tollEntryCoords = {
            lat: ICCoords[tollEntryIndex].Lat,
            lng: ICCoords[tollEntryIndex].Lng
        }
    }

    if (fastestIndexOnLargeICsEXIT.has(tollExitIndex)) {
        fastedIndexOnIC = fastestIndexOnLargeICsEXIT.get(tollExitIndex)

        tollExitCoords = {
            lat: ICCoords[tollExitIndex].Coords[fastedIndexOnIC].Lat,
            lng: ICCoords[tollExitIndex].Coords[fastedIndexOnIC].Lng
        }
    } else {
        tollExitCoords = {
            lat: ICCoords[tollExitIndex].Lat,
            lng: ICCoords[tollExitIndex].Lng
        }
    }

    const requestTO407 = {
        origin: originCoords,
        destination: tollEntryCoords,
        travelMode: 'DRIVING',
        avoidTolls: true
    };

    const requestIN407 = {
        origin: tollEntryCoords,
        destination: tollExitCoords,
        travelMode: 'DRIVING',
        avoidTolls: false
    };

    const requestFROM407 = {
        origin: tollExitCoords,
        destination: destinationCoords,
        travelMode: 'DRIVING',
        avoidTolls: true
    };

    const directionsService = new google.maps.DirectionsService();

    const routeTO407 = directionsService.route(requestTO407, function(result, status) {
        if (status === 'OK') {
            renderTO407.setDirections(result);
        } else {
            window.alert('First segment failed due to ' + status);
        }
    });

    const routeIN407 = directionsService.route(requestIN407, function(result, status) {
        if (status === 'OK') {
            renderIN407.setDirections(result);
        } else {
            window.alert('Second segment failed due to ' + status);
        }
    });

    const routeFROM407 = directionsService.route(requestFROM407, function(result, status) {
        if (status === 'OK') {
            renderFROM407.setDirections(result);
        } else {
            window.alert('Third segment failed due to ' + status);
        }
    });
}