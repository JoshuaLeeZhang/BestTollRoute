function isToll(string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(string, 'text/html');
    return doc.body.textContent.includes('Toll road');
} //Returns true if a string contains "Toll road". This is used to find the first and last interchange

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

    let maxTimeSavedPerDollar = {
        ratio: 0,
        timeSaved: 0,
        dollar: 0
    };
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
                    totalTime += tollRoute.routes[0].legs[0].duration.value;
                    const timeSaved = originToDestinationNoTollTime - totalTime;

                    const entryTimeOn407 = (toInterchangeTimes.get(i) + currentTime());

                    const maxAllowableTollCost = timeSaved/maxTimeSavedPerDollar;

                    const tollCost = await calculateTollCost(entryTimeOn407, weekend, i, j, maxAllowableTollCost, entryFee);
    
                    if (tollCost != -1) { //calculateTollCost will return -1 if the route cannot be more effective
                        maxTimeSavedPerDollar.ratio = timeSaved/tollCost;
                        maxTimeSavedPerDollar.dollar = tollCost;
                        maxTimeSavedPerDollar.timeSaved = timeSaved;
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
                    totalTime += tollRoute.routes[0].legs[0].duration.value;


                    const timeSaved = originToDestinationNoTollTime - totalTime;

                    const entryTimeOn407 = (toInterchangeTimes.get(i) + currentTime());

                    const maxAllowableTollCost = timeSaved/maxTimeSavedPerDollar; 

                    const tollCost = await calculateTollCost(entryTimeOn407, weekend, i, j, maxAllowableTollCost, entryFee);
    
                    if (tollCost != -1) { //calculateTollCost will return -1 if the route cannot be more effective
                        maxTimeSavedPerDollar.ratio = timeSaved/tollCost; // seconds per cent
                        maxTimeSavedPerDollar.dollar = tollCost;
                        maxTimeSavedPerDollar.timeSaved = timeSaved;
                        maxTimeSavedPerDollarRoute = {
                            entry: i,
                            exit: j
                        }
                    }
                }

            }
        }
    }

    return {maxTimeSavedPerDollar, maxTimeSavedPerDollarRoute, tollStart, tollEnd};
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
} //returns the price in cents per km at various points on the 407

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
    
            minOriginToInterchangeTime = originToInterchange.routes[0].legs[0].duration.value;
            minInterchangeToDestinationTime = interchangeToDestination.routes[0].legs[0].duration.value;

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
                
                originToInterchangeTimeArray.push(originToInterchange.routes[0].legs[0].duration.value);
                interchangeToDestinationTimeArray.push(interchangeToDestination.routes[0].legs[0].duration.value);
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
        
                minOriginToInterchangeTime = originToInterchange.routes[0].legs[0].duration.value;
                minInterchangeToDestinationTime = interchangeToDestination.routes[0].legs[0].duration.value;
    
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
    
                    originToInterchangeTimeArray.push(originToInterchange.routes[0].legs[0].duration.value);
                    interchangeToDestinationTimeArray.push(interchangeToDestination.routes[0].legs[0].duration.value);
                }
    
                minOriginToInterchangeTime = Math.min(...originToInterchangeTimeArray);
                minInterchangeToDestinationTime = Math.min(...interchangeToDestinationTimeArray);
            }
    
            originToInterchangeTimeMap.set(i, minOriginToInterchangeTime);
            interchangeToDestinationTimeMap.set(i, minInterchangeToDestinationTime);
            }
    }
    

    return {originToInterchangeTimeMap, interchangeToDestinationTimeMap};
} //returns originToInterchangeTimes and interchangeToDestinationTimes in seconds