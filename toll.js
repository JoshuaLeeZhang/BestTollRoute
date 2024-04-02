function areCoordsClose(routeCoords, actualCoords, tolerance) {
    const earthRadius = 6371;
  
    const diffLat = degToRad(actualCoords.lat - routeCoords.lat);
    const diffLng = degToRad(actualCoords.lng - routeCoords.lng);
  
    const routeLat = degToRad(routeCoords.lat);
    const actualLat = degToRad(actualCoords.lat);
  
    let distance = Math.sin(diffLng/2)*Math.sin(diffLng/2) + Math.cos(routeLat)*Math.cos(actualLat)*Math.sin(diffLat/2)*Math.sin(diffLat/2);
    distance = 2*earthRadius*Math.asin(Math.sqrt(distance));
  
    return distance <= tolerance;
} //return true if two coords are within tolerance distance, false if not
  
function degToRad(degree) {
    return degree * (Math.PI / 180);
} //converts deg to rad, used in areCoordsClose
  
async function findMatchingCoords(routeCoords) { 
    const response = await fetch("407Zones.JSON");
    const data = await response.json();
  
    const size = data.Coords.length;
  
    for (let i=0; i<size; i++) {
      const dataFromJSON = data.Coords[i];
  
      const jsonCoords = {lat: dataFromJSON.Lat, lng: dataFromJSON.Lng};
      const tolerance = dataFromJSON.Tol;
  
      if (areCoordsClose(routeCoords, jsonCoords, tolerance)) {
        return {data: dataFromJSON, index: i};
      } 
    }
} //Finds the first coords in 407Zones.JSON that is considered to be "close" to the input coords, this is used to find the first and last interchange to be used
  
function isToll(string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(string, 'text/html');
    return doc.body.textContent.includes('Toll road');
} //Returns true if a string contains "Toll road". This is used to find the first and last interchange

function isGoingEast(string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(string, 'text/html');
    if (doc.body.textContent.includes('ON-407 W')) {
        return false;
    } else {
        return true;
    }
} //Checks if the 407 direction is east (true) or west (false)
  
async function calculateTollInfo (tollStart, tollEnd) {
    let tollRoute = await createRoute(tollStart, tollEnd, true);
    let tollInfo = document.getElementById("tollInfo");

    tollInfo.innerHTML = '';

    let route = tollRoute.routes[0].legs[0];

    tollInfo.innerHTML += '<p>' + "TIME: " + route.duration.text + '</p>';
    tollInfo.innerHTML += '<p>' + "DISTANCE: " + route.distance.value + '</p>';
} //Unused function that gives basic info about a toll route (duration and distance)

async function mostCostEffectiveToll(originCoords, tollStart, tollEnd, destinationCoords, weekend, transponder) {
    const response = await fetch("407Zones.JSON");
    const zones = await response.json();

    const interchangeTimes = await calculateInterchangeTimes(originCoords, tollStart, tollEnd, destinationCoords);

    const toInterchangeTimes = interchangeTimes.originToInterchangeTimeMap;
    const fromInterchangeTimes = interchangeTimes.interchangeToDestinationTimeMap;

    const originToDestinationNoToll = await createRoute(originCoords, destinationCoords, true);
    const originToDestinationNoTollTime = originToDestinationNoToll.routes[0].legs[0].duration.value/60; //This calculates the time if no toll is taken, this will be used for comparison

    const goingEast = tollStart < tollEnd; // Determine the direction of travel on the 407 toll route. The toll interchanges on the 407 are indexed such that their index value increases from west to east. Ex. index 0 is the most westward interchange 

    let entryFee = 4.2;
    if (transponder) entryFee = 1;

    console.log("TRANSPONDER FEE:" + entryFee);

    let maxTimeSavedPerDollar = 0;
    let maxTimeSavedPerDollarRoute = {
        entry: tollStart,
        exit: tollEnd
    }

    if (goingEast) {
        for (let i = tollStart; i < tollEnd; i++) {

            let startCoords = {
                lat: zones.Coords[i].Lat,
                lng: zones.Coords[i].Lng,
            }

            for (let j = i+1; j <= tollEnd; j++) {
                
                let totalTime = toInterchangeTimes.get(i) + fromInterchangeTimes.get(j);

                let endCoords = {
                    lat: zones.Coords[j].Lat,
                    lng: zones.Coords[j].Lng,
                }


                if (totalTime < originToDestinationNoTollTime) {
                    const tollRoute = await createRoute(startCoords, endCoords, false);
                    totalTime += tollRoute.routes[0].legs[0].duration.value/60;
                    const timeSaved = originToDestinationNoTollTime - totalTime;

                    const entryTimeOn407 = (toInterchangeTimes.get(i) + currentTime());

                    const maxAllowableTollCost = timeSaved/maxTimeSavedPerDollar;

                    const tollCost = await calculateTollCost(entryTimeOn407, weekend, i, j, maxAllowableTollCost, entryFee);
    
                    if (tollCost != -1) { //calculateTollCost will return -1 if the route cannot be more effective
                        maxTimeSavedPerDollar = timeSaved/tollCost;
                        maxTimeSavedPerDollarRoute = {
                            entry: i,
                            exit: j
                        }
                    }
                }

            }
        }
    } else {
        for (let i = tollStart; i > tollEnd; i--) {

            let startCoords = {
                lat: zones.Coords[i].Lat,
                lng: zones.Coords[i].Lng,
            }

            for (let j = i-1; j >= tollEnd; j--) {
                let totalTime = toInterchangeTimes.get(i) + fromInterchangeTimes.get(j);

                let endCoords = {
                    lat: zones.Coords[j].Lat,
                    lng: zones.Coords[j].Lng,
                }

                if (totalTime < originToDestinationNoTollTime) {
                    const tollRoute = await createRoute(startCoords, endCoords, false);
                    totalTime += tollRoute.routes[0].legs[0].duration.value/60;
                    const timeSaved = originToDestinationNoTollTime - totalTime;

                    const entryTimeOn407 = (toInterchangeTimes.get(i) + currentTime());

                    const maxAllowableTollCost = timeSaved/maxTimeSavedPerDollar;

                    const tollCost = await calculateTollCost(entryTimeOn407, weekend, i, j, maxAllowableTollCost, entryFee);
    
                    if (tollCost != -1) { //calculateTollCost will return -1 if the route cannot be more effective
                        maxTimeSavedPerDollar = timeSaved/tollCost;
                        maxTimeSavedPerDollarRoute = {
                            entry: i,
                            exit: j
                        }
                    }
                }

            }
        }
    }

    if (maxTimeSavedPerDollar == 0 || (tollStart == maxTimeSavedPerDollarRoute.entry && tollEnd == maxTimeSavedPerDollarRoute.exit)) {
        console.log("The most economical toll route is the one provided by Google Maps");
    } else {
        console.log("Entry and exit for most economical toll route is provided below: ");
        console.log("ENTRY:" + zones.Coords[maxTimeSavedPerDollarRoute.entry].COMMENT);
        console.log("EXIT:" + zones.Coords[maxTimeSavedPerDollarRoute.exit].COMMENT);
    }


    return {maxTimeSavedPerDollar, maxTimeSavedPerDollarRoute};
}

async function calculateTollCost(minute, weekend, tollStart, tollEnd, maxPrice, transponder) {
    const response = await fetch("407Zones.JSON");
    const data = await response.json();
    const data407 = data.Coords;

    let price = transponder;

    if (price > maxPrice) return -1; //If price is already greater than max price allowed, return -1
   
    const goingEast = tollStart < tollEnd; //checks if going east
    const rate407 = await determine407Rate(minute, goingEast, weekend); //returns rate for 407 in each zone

    function iterateTolls(i) {
        if (goingEast) return i <= tollEnd;
        else return i >= tollEnd;
    }

    for (let i = tollStart; iterateTolls(i); goingEast ? i++: i--) {
        let distanceToNext;

        if (goingEast) distanceToNext = data407[i].EAST;
        else distanceToNext = data407[i].WEST;

        let currentZone = data407[i].ZONE[0];
        if (goingEast && data407[i].ZONE.length == 2) currentZone = data407[i].ZONE[1]; //If interchange is between two zones, choose the one going each, which is at index 1
        currentZone--;
        //currentZone is subtracted by 1 to align with rate407 array indices.
        //Ex. If currentZone = 3, the corresponding zone in rate407 is "3" BUT "3" is at index 2.
        //Zone 1 is at index 0, Zone 2 is at index 1, Zone 3 is at index 2, Zone 4 is at index 3

        let incrementPrice = distanceToNext * rate407[currentZone.toString()];
        price += incrementPrice;
        
        if (price > maxPrice) return -1;
    }

    return price;
} //Calculates price to drive between two interchanges, includes flat rate.
  //Compares price to maxPrice to check if price has exceeded maxPrice.
  //If price has exceeded, that means it is not possible that this route can be more cost effective than the most effective route.
  //Returns price in cents

async function determine407Rate(minute, east, weekend) {
    let response;
    
    if (east) {
        if (weekend) {
            response = await fetch("407EastWeekend.JSON");
        } else {
            response = await fetch("407EastWeekday.JSON");
        }
    } else {
        if (weekend) {
            response = await fetch("407WestWeekend.JSON");
        } else {
            response = await fetch("407WestWeekday.JSON");
        }
    }

    const data = await response.json();
    const size = data.length;

    for (let i=0; i<size; i++) {
        if (minute < data[i].minute) {
            return data[i].values;
        }
    }

    return 0;
} //returns the cost per km on the 407

function haveCommonNumber(arr1, arr2) {
    return arr1.some(item => arr2.includes(item));
} //returns true if two arrays have a common number, false if not.

function findCommonNumbers(arr1, arr2) {
    let common = [];

    for (let i = 0; i < arr1.length; i++) {
        if (arr2.includes(arr1[i])) {
            common.push(arr1[i]);
        }
    }

    return common;
}

function currentTime() {
    let now = new Date();
    return now.getMinutes() + now.getHours()*60;
} //gets current time in seconds

async function calculateInterchangeTimes(originCoords, tollStart, tollEnd, destinationCoords) {
    let originToInterchangeTimeMap = new Map();
    let interchangeToDestinationTimeMap = new Map();

    const interchangeResponse = await fetch("407Interchanges.JSON");
    const interchangeData = await interchangeResponse.json();

    const goingEast = tollStart < tollEnd;

    if (goingEast) {
        for (let i = tollStart; i <= tollEnd; i++) { //This block calculates the time to and from all entrys and exits between the fastest entrys and exits 
        let currentInterchangeCoords;
        let minOriginToInterchangeTime;
        let minInterchangeToDestinationTime;

        if (interchangeData[i].COMMENT != "403" && interchangeData[i].COMMENT != "401" && interchangeData[i].COMMENT != "410" &&
            interchangeData[i].COMMENT != "427" && interchangeData[i].COMMENT != "400" && interchangeData[i].COMMENT != "404") {
            
            currentInterchangeCoords = {
                lat: interchangeData[i].Lat,
                lng: interchangeData[i].Lng
            }

            const originToInterchange = await createRoute(originCoords, currentInterchangeCoords, true);
            const interchangeToDestination = await createRoute(currentInterchangeCoords, destinationCoords, true);
    
            minOriginToInterchangeTime = originToInterchange.routes[0].legs[0].duration.value/60;
            minInterchangeToDestinationTime = interchangeToDestination.routes[0].legs[0].duration.value/60;

        } else {
            let length = interchangeData[i].Coords.length;
            
            let originToInterchangeTimeArray = [];
            let interchangeToDestinationTimeArray = [];

            for (let j=0; j<length; j++) {

                currentInterchangeCoords = {
                    lat: interchangeData[i].Coords[j].Lat,
                    lng: interchangeData[i].Coords[j].Lng
                }

                const originToInterchange = await createRoute(originCoords, currentInterchangeCoords, true);
                const interchangeToDestination = await createRoute(currentInterchangeCoords, destinationCoords, true);

                originToInterchangeTimeArray.push(originToInterchange.routes[0].legs[0].duration.value/60);
                interchangeToDestinationTimeArray.push(interchangeToDestination.routes[0].legs[0].duration.value/60);
            }

            minOriginToInterchangeTime = Math.min(...originToInterchangeTimeArray);
            minInterchangeToDestinationTime = Math.min(...interchangeToDestinationTimeArray);
        }

        originToInterchangeTimeMap.set(i, minOriginToInterchangeTime);
        interchangeToDestinationTimeMap.set(i, minInterchangeToDestinationTime);
        }
    } else {
        for (let i = tollStart; i >= tollEnd; i--) { //This block calculates the time to and from all entrys and exits between the fastest entrys and exits 
            let currentInterchangeCoords;
            let minOriginToInterchangeTime;
            let minInterchangeToDestinationTime;
    
            if (interchangeData[i].COMMENT != "403" && interchangeData[i].COMMENT != "401" && interchangeData[i].COMMENT != "410" &&
                interchangeData[i].COMMENT != "427" && interchangeData[i].COMMENT != "400" && interchangeData[i].COMMENT != "404") {
                currentInterchangeCoords = {
                    lat: interchangeData[i].Lat,
                    lng: interchangeData[i].Lng
                }
    
                const originToInterchange = await createRoute(originCoords, currentInterchangeCoords, true);
                const interchangeToDestination = await createRoute(currentInterchangeCoords, destinationCoords, true);
        
                minOriginToInterchangeTime = originToInterchange.routes[0].legs[0].duration.value/60;
                minInterchangeToDestinationTime = interchangeToDestination.routes[0].legs[0].duration.value/60;
    
            } else {
                let length = interchangeData[i].Coords.length;
                
                let originToInterchangeTimeArray = [];
                let interchangeToDestinationTimeArray = [];
    
                for (let j=0; j<length; j++) {
    
                    currentInterchangeCoords = {
                        lat: interchangeData[i].Coords[j].Lat,
                        lng: interchangeData[i].Coords[j].Lng
                    }
    
                    const originToInterchange = await createRoute(originCoords, currentInterchangeCoords, true);
                    const interchangeToDestination = await createRoute(currentInterchangeCoords, destinationCoords, true);
    
                    originToInterchangeTimeArray.push(originToInterchange.routes[0].legs[0].duration.value/60);
                    interchangeToDestinationTimeArray.push(interchangeToDestination.routes[0].legs[0].duration.value/60);
                }
    
                minOriginToInterchangeTime = Math.min(...originToInterchangeTimeArray);
                minInterchangeToDestinationTime = Math.min(...interchangeToDestinationTimeArray);
            }
    
            originToInterchangeTimeMap.set(i, minOriginToInterchangeTime);
            interchangeToDestinationTimeMap.set(i, minInterchangeToDestinationTime);
            }
    }
    

    return {originToInterchangeTimeMap, interchangeToDestinationTimeMap};
}


async function createRoute(origin, destination, toll) {
    return new Promise((resolve, reject) => {
      const direction = new google.maps.DirectionsService();
  
      direction.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        avoidTolls: toll
      }, 
  
        (response, status) => {
          if (status == "OK") resolve(response);
          else reject("Request failed due to: " + status);
        }
      )
    })
  }