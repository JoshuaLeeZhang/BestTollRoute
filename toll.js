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

    let maxTimeSavedPerDollar = 0;
    let maxTimeSavedPerDollarRoute = {
        entry: 0,
        exit: 0
    }

    let entryFee = 4.2;
    if (transponder) entryFee = 1;

    console.log(entryFee);

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
                    
                    let tollCost = entryFee;
                    if (timeSaved/tollCost < maxTimeSavedPerDollar) tollCost += await calculateTollCost(entryTimeOn407, weekend, i, j);
    
                    if (timeSaved/tollCost > maxTimeSavedPerDollar) {
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
                    
                    let tollCost = entryFee;
                    if (timeSaved/tollCost < maxTimeSavedPerDollar) tollCost += await calculateTollCost(entryTimeOn407, weekend, i, j);
    
                    if (timeSaved/tollCost > maxTimeSavedPerDollar) {
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
    
    return {maxTimeSavedPerDollar, maxTimeSavedPerDollarRoute};
}

async function calculateTollCost(minute, weekend, tollStart, tollEnd) {
    const response = await fetch("407Zones.JSON");
    const data407 = await response.json();

    let zoneDistance = [0, 0, 0, 0]; //distance traveled in each zone from Zone 1 to Zone 4
    let currentZone = data407.Coords[tollStart].ZONE; //this is the starting zone in the 407
    let origin = { lat: data407.Coords[tollStart].Lat, lng: data407.Coords[tollStart].Lng} //this is the starting coords in the 407
   
    const goingEast = tollStart < tollEnd; //checks if going east
    const rate407 = await determine407Rate(minute, goingEast, weekend); //returns rate for 407 in each zone

    if (goingEast) {
        for (let i = tollStart; i <= tollEnd; i++) {
            if (!haveCommonNumber(data407.Coords[i].ZONE, currentZone)) {

                let destination = {
                    lat: data407.Coords[i-1].Lat,
                    lng: data407.Coords[i-1].Lng
                };

                let calculatedRoute = await createRoute(origin, destination, false);

                let distance = calculatedRoute.routes[0].legs[0].distance.value;

                currentZone = findCommonNumbers(currentZone, data407.Coords[i-1].ZONE);

                zoneDistance[currentZone-1] = distance;

                origin = destination;
                currentZone = data407.Coords[i].ZONE;
            } else if (i == tollEnd) {
                let destination = {lat: data407.Coords[i].Lat, lng: data407.Coords[i].Lng};

                let calculatedRoute = await createRoute(origin, destination, false);

                let distance = calculatedRoute.routes[0].legs[0].distance.value;

                currentZone = findCommonNumbers(currentZone, data407.Coords[i-1].ZONE);

                zoneDistance[currentZone-1] = distance;
            }
        }
    } else {
        for (let i = tollStart; i >= tollEnd; i--) {
            if (!haveCommonNumber(data407.Coords[i].ZONE, currentZone)) {

                let destination = {
                    lat: data407.Coords[i-1].Lat,
                    lng: data407.Coords[i-1].Lng
                };

                let calculatedRoute = await createRoute(origin, destination, false);

                let distance = calculatedRoute.routes[0].legs[0].distance.value;

                currentZone = findCommonNumbers(currentZone, data407.Coords[i+1].ZONE);

                zoneDistance[currentZone-1] = distance;

                origin = destination;
                currentZone = data407.Coords[i].ZONE;
            } else if (i == tollEnd) {
                let destination = {lat: data407.Coords[i].Lat, lng: data407.Coords[i].Lng};

                let calculatedRoute = await createRoute(origin, destination, false);

                let distance = calculatedRoute.routes[0].legs[0].distance.value;

                currentZone = findCommonNumbers(currentZone, data407.Coords[i+1].ZONE);

                zoneDistance[currentZone-1] = distance;
            }
        }       
    }

    

    let totalCost = 0;
    let totalDistance = 0;

    for (let i=0; i < 4; i++) {
        let zone = i + 1;
        totalCost += zoneDistance[i] * rate407.values[zone.toString()];
        totalDistance += zoneDistance[i];
    }

    return totalCost/100000; //divide by 1000 as distance was in m and divide by 100 more to convert from cents to dollars
}

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
            return data[i];
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