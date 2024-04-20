function isToll(string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(string, 'text/html');
    return doc.body.textContent.includes('Toll road');
} //Returns true if a string contains "Toll road". This is used to find the first and last interchange

let toICMap = new Map(); //toInterchangeMap - Key is interchange index and value is time from origin to interchange in seconds
let fromICMap = new Map(); //fromInterchangeMap - Key is interchange index and value is time from interchange to desination in seconds

let fastestIndexOnLargeICsENTRY = new Map()
let fastestIndexOnLargeICsEXIT = new Map()

//ON403 = 6, ON401 = 9, ON410 = 13, ON427 = 18, ON400 = 22, ON404 = 30


async function mostCostEffectiveToll(originCoords, tollStart, tollEnd, destinationCoords) {
    const response = await fetch("407Zones.JSON");
    const zones = await response.json();

    await calculateInterchangeTimes(originCoords, tollStart, tollEnd, destinationCoords);

    const noTollRoute = await createRoute(originCoords, destinationCoords, true);
    const noTollRouteTime = noTollRoute.routes[0].legs[0].duration.value; //This calculates the time if no toll is taken, this will be used for comparison

    const goingEast = tollStart < tollEnd; // Determine the direction of travel on the 407 toll route. The toll interchanges on the 407 are indexed such that their index value increases from west to east. Ex. index 0 is the most westward interchange 

    let entryFee = 420;
    if (hasTransponder) entryFee = 100;

    let bestRoute = {
        ratio: 0,
        timeSaved: 0,
        cents: 0,
        entry: tollStart,
        exit: tollEnd
    }

    for (let i = tollStart; goingEast ? i < tollEnd : i > tollEnd; goingEast ? i++ : i--) {

        let entryCoords407 = {
            lat: zones.Coords[i].Lat,
            lng: zones.Coords[i].Lng,
        }

        for (let j = goingEast ? i + 1 : i - 1; goingEast ? j <= tollEnd : j >= tollEnd; goingEast ? j++ : j--) {

            
            let totalTime = toICMap.get(i) + fromICMap.get(j);

            if (totalTime > noTollRouteTime) continue //if total time from traveling to and from each interchange is already greater than noTollTime, continues

            let exitCoords407 = {
                lat: zones.Coords[j].Lat,
                lng: zones.Coords[j].Lng,
            }

            const tollPortion = await createRoute(entryCoords407, exitCoords407, false);
            totalTime += tollPortion.routes[0].legs[0].duration.value;

            if (totalTime > noTollRouteTime) continue //if total time is greater than noTollTime, continue. There is no point in paying for a slower time

            const timeSaved = noTollRouteTime - totalTime;

            const entryTimeOn407 = toICMap.get(i) + currentTime();

            let maxAllowableTollCost;
            if (bestRoute.ratio == 0) maxAllowableTollCost = -1
            else maxAllowableTollCost = timeSaved/bestRoute.ratio;

            const tollCost = await calculateTollCost(entryTimeOn407, i, j, maxAllowableTollCost, entryFee);

            if (tollCost != -1) { //calculateTollCost will return -1 if the route cannot be more effective
                bestRoute = {
                    ratio: timeSaved/tollCost,
                    cents: tollCost,
                    timeSaved: timeSaved,
                    entry: i,
                    exit: j
                }
            }
        }
    }

    return {bestRoute, tollStart, tollEnd};
}

async function calculateTollCost(second, tollStart, tollEnd, maxPrice, entryFee) {
    const response = await fetch("407Zones.JSON");
    const data = await response.json();
    const data407 = data.Coords;

    let price = entryFee;

    if (price > maxPrice && maxPrice != -1) return -1; //If price is already greater than max price allowed, return -1
   
    const goingEast = tollStart < tollEnd; //checks if going east
    const rate407 = await determine407Rate(second, goingEast); //returns rate for 407 in each zone

    for (let i = tollStart; goingEast ? i <= tollEnd : i >= tollEnd; goingEast ? i++: i--) {
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
        
        if (price > maxPrice && maxPrice != -1) return -1;
    }
    
    return price;
} //Calculates price to drive between two interchanges, includes flat rate.
  //Compares price to maxPrice to check if price has exceeded maxPrice.
  //If price has exceeded, that means it is not possible that this route can be more cost effective than the most effective route.
  //Returns price in cents

async function determine407Rate(seconds, east) {
    let response;
    
    if (east) {
        if (isWeekend) {
            response = await fetch("407EastWeekend.JSON");
        } else {
            response = await fetch("407EastWeekday.JSON");
        }
    } else {
        if (isWeekend) {
            response = await fetch("407WestWeekend.JSON");
        } else {
            response = await fetch("407WestWeekday.JSON");
        }
    }

    const data = await response.json();
    const size = data.length;
    const minute = seconds/60

    for (let i=0; i<size; i++) {
        if (minute < data[i].minute) {
            return data[i].values;
        }
    }

    return 0;
} //returns the price in cents per km at various points on the 407

function currentTime() {
    let now = new Date();
    return now.getSeconds() + now.getMinutes()*60 + now.getHours()*3600;
} //gets current time in seconds

async function calculateInterchangeTimes(originCoords, tollStart, tollEnd, destinationCoords) {
    const ICResponse = await fetch("407Interchanges.JSON");
    const ICData = await ICResponse.json();

    const goingEast = tollStart < tollEnd;

    const largeICs = ["403", "401", "410", "427", "400", "404"]

    for (let i = tollStart; goingEast ? i <= tollEnd : i >= tollEnd; goingEast ? i++: i--) { //This block calculates the time to and from all entrys and exits between the fastest entrys and exits 
        let toICTime;
        let fromICTime;

        if (toICMap.has(i)) continue // if already in map, do not compute. Only checks toICMap as if it exists in toICMap, it will exist in fromICMap

        if (!largeICs.includes(ICData[i].COMMENT)) {
            const currICCoords = {lat: ICData[i].Lat, lng: ICData[i].Lng}

            const toICRoute = await createRoute(originCoords, currICCoords, true);
            const fromICRoute = await createRoute(currICCoords, destinationCoords, true);
    
            toICTime = toICRoute.routes[0].legs[0].duration.value;
            fromICTime = fromICRoute.routes[0].legs[0].duration.value;

        } else {
            let numCoordsToCompare = ICData[i].Coords.length;

            for (let j=0; j<numCoordsToCompare; j++) {

                const currICCoords = {lat: ICData[i].Coords[j].Lat, lng: ICData[i].Coords[j].Lng}

                const originToIC = await createRoute(originCoords, currICCoords, true);
                const ICToDesination = await createRoute(currICCoords, destinationCoords, true);

                const currToICTime = originToIC.routes[0].legs[0].duration.value
                const currFromICTime = ICToDesination.routes[0].legs[0].duration.value
                
                if (toICTime == undefined) {
                    toICTime = currToICTime
                    fromICTime = currFromICTime
                    fastestIndexOnLargeICs.entry.
                } else if (currToICTime < toICTime) {
                    toICTime = currToICTime
                    //assign index for this interchange
                } else if (currFromICTime < fromICTime) {
                    fromICTime = currFromICTime
                    //assign index for this interchange
                }
            }
        }

        console.log(ICData[i].COMMENT + "| toInterchange: " + toICTime + "| fromInterchange: " + fromICTime)

        toICMap.set(i, toICTime);
        fromICMap.set(i, fromICTime);
    }
} //adds originToInterchangeTimes and interchangeToDestinationTimes in seconds