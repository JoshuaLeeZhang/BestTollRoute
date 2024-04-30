let ICNames
let ICZones
let ICCoords
let currentOriginCoords
let currentDestinationCoords
let isWeekend = false
let hasTransponder = false

async function loadJSON() {
  const ICNamesResponse = await fetch("./data/407InterchangeNames.JSON");
  const ICZonesResponse = await fetch("./data/407Zones.JSON");
  const ICCoordsResponse = await fetch("./data/407Interchanges.JSON");

  ICNames = await ICNamesResponse.json();
  ICZones = await ICZonesResponse.json();
  ICCoords = await ICCoordsResponse.json(); 
}

function loadMapScript() {
  const apiKey = document.getElementById('api-key').value;
  
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places&callback=initGoogleMaps`;

  document.head.appendChild(script);

  loadJSON()
}

function initGoogleMaps() {
  initMap();
  initAutocomplete();
}

function drawNewRoute() {
  if (routeDrawingData.tollStart != undefined && routeDrawingData.tollEnd != undefined) drawTollRoute(routeDrawingData.tollStart, routeDrawingData.tollEnd);
}

let routeDrawingData = {
  tollStart: undefined,
  tollEnd: undefined
} //this is to be used for drawNewRoute

async function updateRoute() {
  document.getElementById("bestRoute").innerHTML = "Pending Results";

  const newRoute = new Route(currentOriginCoords, currentDestinationCoords, hasTransponder, isWeekend)
  const result = newRoute.createSmartRoute()

  document.getElementById("bestRoute").innerHTML = result
}

document.addEventListener("DOMContentLoaded", function() {
  let weekendCheckbox = document.getElementById("weekendCheckbox");
  let transCheckbox = document.getElementById("transCheckbox");

  weekendCheckbox.addEventListener("change", function() {
    isWeekend = this.checked;
  })

  transCheckbox.addEventListener("change", function() {
    hasTransponder = this.checked;
  })
})