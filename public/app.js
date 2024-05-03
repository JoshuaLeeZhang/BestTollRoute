let currentOriginCoords = {lat: null, lng: null}
let currentDestinationCoords = {lat: null, lng: null}
let isWeekend = false
let hasTransponder = false

let routeDrawingData = {tollStart: null, tollEnd: null} //this is to be used for drawNewRoute

document.addEventListener("DOMContentLoaded", () => {
  let weekendCheckbox = document.getElementById("weekendCheckbox");
  let transCheckbox = document.getElementById("transCheckbox");

  weekendCheckbox.addEventListener("change", function() {
    isWeekend = this.checked;
  })

  transCheckbox.addEventListener("change", function() {
    hasTransponder = this.checked;
  })
})

function initGoogleMaps() {
  initMap();
  initAutocomplete();
}

async function updateRoute() {
    if (currentOriginCoords.lat == null || currentOriginCoords.lng == null || currentDestinationCoords.lat == null || currentDestinationCoords.lng == null) {
      window.alert("Invalid request")
      return
    }

    document.getElementById("bestRoute").innerHTML = "Pending Results";

    const response = await fetch(`/updateRoute?currentOriginLat=${currentOriginCoords.lat}&currentOriginLng=${currentOriginCoords.lng}&currentDestinationLat=${currentDestinationCoords.lat}&currentDestinationLng=${currentDestinationCoords.lng}&isWeekend=${isWeekend}&hasTransponder=${hasTransponder}`)
    const result = await response.json()
    
    if (result.usedToll) displayTollRoute(currentOriginCoords, result.entryCoords, result.exitCoords, currentDestinationCoords)
    else displayNoTollRoute(currentOriginCoords, currentDestinationCoords)

    document.getElementById("bestRoute").innerHTML = result.string
}

function drawNewRoute() {
  if (routeDrawingData.tollStart != null && routeDrawingData.tollEnd != null) drawTollRoute(routeDrawingData.tollStart, routeDrawingData.tollEnd);
}