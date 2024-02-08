function loadMapScript() {
  const apiKey = document.getElementById('api-key').value;
  
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=initMap`;
  script.async = true;

  document.head.appendChild(script);
}

function initMap() {

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
        } else {
          window.alert("Directions request failed due to " + status);
        }
      }
    );
}
  

function updateRoute() {
    const origin = {
        lat: parseFloat(document.getElementById('origin-lat').value),
        lng: parseFloat(document.getElementById('origin-lng').value)
    };
    const destination = {
        lat: parseFloat(document.getElementById('destination-lat').value),
        lng: parseFloat(document.getElementById('destination-lng').value)
    };

    createMap(origin, destination);
}