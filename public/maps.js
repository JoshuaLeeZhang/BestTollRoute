function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      zoom: 8,
      center: {lat: 43.69, lng: -79.37},
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
}

function displayNoTollRoute(originCoords, destinationCoords) {
    const map = new google.maps.Map(document.getElementById("map"), {
      zoom: 8,
      center: originCoords,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    })

    const render = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true,
    })

    const request = {
        origin: originCoords,
        destination: destinationCoords,
        travelMode: 'DRIVING',
        avoidTolls: true
    }

    const directionsService = new google.maps.DirectionsService()
    
    const route = directionsService.route(request, (result, status) => {
        if (status === 'OK') render.setDirections(result)
        else window.alert('Render failed due to ' + status)
    })
}

async function displayTollRoute(originCoords, tollEntryCoords, tollExitCoords, destinationCoords) {
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: originCoords,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    })
    
    const renderTO407 = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true
    })

    const renderIN407 = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true
    })

    const renderFROM407 = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true
    })

    const requestTO407 = {
        origin: originCoords,
        destination: tollEntryCoords,
        travelMode: 'DRIVING',
        avoidTolls: true
    }

    const requestIN407 = {
        origin: tollEntryCoords,
        destination: tollExitCoords,
        travelMode: 'DRIVING',
        avoidTolls: false
    }

    const requestFROM407 = {
        origin: tollExitCoords,
        destination: destinationCoords,
        travelMode: 'DRIVING',
        avoidTolls: true
    }

    const directionsService = new google.maps.DirectionsService()

    const routeTO407 = directionsService.route(requestTO407, (result, status) => {
        if (status === 'OK') renderTO407.setDirections(result)
        else window.alert('First segment render failed due to ' + status)
    })

    const routeIN407 = directionsService.route(requestIN407, (result, status) => {
        if (status === 'OK') renderIN407.setDirections(result)
        else window.alert('Second segment render failed due to ' + status)
    })

    const routeFROM407 = directionsService.route(requestFROM407, (result, status) => {
        if (status === 'OK') renderFROM407.setDirections(result)
        else window.alert('Third segment render failed due to ' + status)
    })
}