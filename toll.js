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
  
async function findMatchingCoords(routeCoords) { //Finds first coord in JSON file that are close to routeCoords
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

function goingEastOrWest(string) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(string, 'text/html');
    if (doc.body.textContent.includes('ON-407 W')) {
        eastOrWest = 0;
    } else {
        eastOrWest = 1;
    }
}
  
async function calculateTollInfo (tollStart, tollEnd) {
    var tollRoute = await createRoute(tollStart, tollEnd, true);

    var tollInfo = document.getElementById("tollInfo");

    tollInfo.innerHTML = '';

    var route = tollRoute.routes[0].legs[0];

    tollInfo.innerHTML += '<p>' + "TIME: " + route.duration.text + '</p>';
    tollInfo.innerHTML += '<p>' + "DISTANCE: " + route.distance.value + '</p>';
}

async function calculateTollCost(hour, minute, weekend, eastOrWest, tollStart, tollEnd) {
    if (eastOrWest == 1) {
        if (weekend) {

        } else {
            
        }
    } else {
        if (weekend) {

        } else {
            
        }
    }
}
