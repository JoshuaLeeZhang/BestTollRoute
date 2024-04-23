function areCoordsClose(routeCoords, actualCoords, tolerance) {
    function degToRad(degree) {
        return degree * (Math.PI / 180);
    }

    if (tolerance == -1) return -1;

    const earthRadius = 6371;
  
    const diffLat = degToRad(actualCoords.lat - routeCoords.lat);
    const diffLng = degToRad(actualCoords.lng - routeCoords.lng);
  
    const routeLat = degToRad(routeCoords.lat);
    const actualLat = degToRad(actualCoords.lat);
  
    const a = Math.sin(diffLat/2)*Math.sin(diffLat/2) + Math.cos(routeLat)*Math.cos(actualLat)*Math.sin(diffLng/2)*Math.sin(diffLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = earthRadius * c;
    //https://www.movable-type.co.uk/scripts/latlong.html for haversine formula above
  
    if (distance <= tolerance) {
        return 1;
    } else {
        return 0;
    }
} //return 1 if two coords are within tolerance distance, 0 if not, and -1 for specific points
  
async function findMatchingCoords(routeCoords, instruction) { 
    const size = ICZones.length;
  
    for (let i=0; i<size; i++) {
      const currentIC = ICZones[i];
  
      const ICCoord = {lat: currentIC.Lat, lng: currentIC.Lng};
      const tolerance = currentIC.Tol;

      const areCoordsCloseResults = areCoordsClose(routeCoords, ICCoord, tolerance);
    
      if (areCoordsCloseResults == 1) {
        if (currentIC.COMMENT == "427" || currentIC.COMMENT == "400" || currentIC.COMMENT == "404") {
            //The tolerance for 427, 400, and 404 has been made bigger to overlap interchanges close to it.
            const indexChange = dealWithCloseCoords(currentIC.COMMENT, instruction);
            return {data: ICZones[i + indexChange], index: i + indexChange}
        }

        return {data: currentIC, index: i};
      } 
    }

} //Finds the first coords in 407Zones.JSON that is considered to be "close" to the input coords, this is used to find the first and last interchange to be used

function dealWithCloseCoords(interchangeName, instruction) {
    if (interchangeName == "404") {
        if (instruction.includes("Woodbine")) return 1;
        else if (instruction.includes("Leslie")) return -1;
        else return 0
    }
    if (interchangeName == "400") {
        if (instruction.includes("Jane")) return 1;
        else if (instruction.includes("Weston")) return -1;
        else return 0
    }
    if (interchangeName == "427") {
        if (instruction.includes("York Regional Rd 27") || instruction.includes("ON-27")) return 1; //York Regional Rd 27 and ON-27 is the same
        else return 0
    }
}