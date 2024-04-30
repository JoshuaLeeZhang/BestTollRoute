class Route {
    constructor(originCoords, destinationCoords, hasTransponder, isWeekend) {
        this.originCoords = originCoords
        this.destinationCoords = destinationCoords
        this.hasTransponder = hasTransponder
        this.isWeekend = isWeekend

        this.Start407Data = null
        this.End407Data = null
        this.tollStartIndex = null
        this.tollEndIndex = null

        this.currentTime = this.getCurrentTime()

        this.goingEast = null

        this.bestRoute = {
            ratio: 0,
            timeSaved: 0,
            cents: 0,
            entry: null,
            exit: null
        }

        this.toICMap = new Map()
        this.fromICMap = new Map()

        this.fastestIndexOnLargeICsENTRY = new Map()
        this.fastestIndexOnLargeICsEXIT = new Map()
    }

    async createSmartRoute() {
        const defaultRoute = await this.createRoute(this.originCoords, this.destinationCoords, false);
        displayRoute(this.originCoords, defaultRoute);
        await this.routeInstructions(defaultRoute);

        this.goingEast = this.tollStartIndex < this.tollEndIndex // Determine the direction of travel on the 407 toll route. The toll interchanges on the 407 are indexed such that their index value increases from west to east. Ex. index 0 is the most westward interchange 
      
        if (typeof this.tollStartIndex == 'undefined') {
            return "NO TOLL NEEDED"
        } else {
            await this.calculateInterchangeTimes();
            await this.mostCostEffectiveToll()
            
            const bestEntryICName = ICNames[this.bestRoute.entry]
            const bestExitICName = ICNames[this.bestRoute.exit]
            const minutesPerDollar = parseFloat((this.bestRoute.ratio/60*100).toFixed(2))
            const dollarCost = parseFloat((this.bestRoute.cents/100).toFixed(2))
        
            if (this.bestRoute.entry == this.tollStartIndex && this.bestRoute.exit == this.tollEndIndex) {
                return `The best route is to enter and exit according to Google Maps' original instructions. Enter at ${bestEntryICName} and exit at ${bestExitICName}. You will save ${minutesPerDollar} minutes per dollar for ${dollarCost} dollars total`
            } else {
                return `Enter at ${bestEntryICName} and exit at ${bestExitICName} to save ${minutesPerDollar} minutes per dollar for ${dollarCost} dollars total.`
            }
        }
    }

    async mostCostEffectiveToll() {        
        let entryFee = 420;
        if (this.hasTransponder) entryFee = 100;
    
        const noTollRoute = await this.createRoute(this.originCoords, this.destinationCoords, true);
        const noTollRouteTime = noTollRoute.routes[0].legs[0].duration.value; //This calculates the time if no toll is taken, this will be used for comparison
    
        this.bestRoute = {
            entry: this.tollStartIndex,
            exit: this.tollEndIndex
        }
    
        const directTollRoute = await this.createRoute(this.originCoords, this.destinationCoords, false);
        const directTollRouteTime = directTollRoute.routes[0].legs[0].duration.value;
    
        this.bestRoute.timeSaved = noTollRouteTime - directTollRouteTime;
        this.bestRoute.cents = this.calculateTollCost(this.toICMap.get(this.tollStartIndex) + this.currentTime, this.tollStartIndex, this.tollEndIndex, -1, entryFee) 
        this.bestRoute.ratio = this.bestRoute.timeSaved/this.bestRoute.cents

        for (let i = this.tollStartIndex; this.goingEast ? i < this.tollEndIndex : i > this.tollEndIndex; this.goingEast ? i++ : i--) {
            let entryCoords407 = {lat: ICZones[i].Lat, lng: ICZones[i].Lng}
            
            for (let j = this.goingEast ? i + 1 : i - 1; this.goingEast ? j <= this.tollEndIndex : j >= this.tollEndIndex; this.goingEast ? j++ : j--) {
                
                let totalTime = this.toICMap.get(i) + this.fromICMap.get(j);
    
                if (totalTime > noTollRouteTime) continue //if total time from traveling to and from each interchange is already greater than noTollTime, continues
    
                let exitCoords407 = {lat: ICZones[j].Lat, lng: ICZones[j].Lng}
    
                const tollPortion = await this.createRoute(entryCoords407, exitCoords407, false);
                totalTime += tollPortion.routes[0].legs[0].duration.value;
    
                if (totalTime > noTollRouteTime) continue //if total time is greater than noTollTime, continue. There is no point in paying for a slower time
    
                const timeSaved = noTollRouteTime - totalTime;
    
                const entryTimeOn407 = this.toICMap.get(i) + this.currentTime;
    
                let maxAllowableTollCost;
                if (this.bestRoute.ratio == 0) maxAllowableTollCost = -1
                else maxAllowableTollCost = timeSaved/this.bestRoute.ratio;
    
                const tollCost = await this.calculateTollCost(entryTimeOn407, i, j, maxAllowableTollCost, entryFee);

                if (tollCost != -1) { //calculateTollCost will return -1 if the route cannot be more effective
                    this.bestRoute = {
                        ratio: timeSaved/tollCost,
                        cents: tollCost,
                        timeSaved: timeSaved,
                        entry: i,
                        exit: j
                    }
                }
            }
        }
    }

    async calculateTollCost(second, ICEntryIndex, ICExitIndex, maxPrice, entryFee) {
        let price = entryFee;
    
        if (price > maxPrice && maxPrice != -1) return -1; //If price is already greater than max price allowed, return -1
       
        const rate407 = await this.determine407Rate(second) //returns rate for 407 in each zone
    
        for (let i = ICEntryIndex; this.goingEast ? i <= ICExitIndex : i >= ICExitIndex; this.goingEast ? i++: i--) {
            let distanceToNext;
    
            if (this.goingEast) distanceToNext = ICZones[i].EAST;
            else distanceToNext = ICZones[i].WEST;
    
            let currentZone = ICZones[i].ZONE[0];
            if (this.goingEast && ICZones[i].ZONE.length == 2) currentZone = ICZones[i].ZONE[1]; //If interchange is between two zones, choose the one going east, which is at index 1
            currentZone--;
            //currentZone is subtracted by 1 to align with rate407 array indices.
            //Ex. If currentZone = 3, the corresponding zone in rate407 is "3" BUT "3" is at index 2.
            //Zone 1 is at index 0, Zone 2 is at index 1, Zone 3 is at index 2, Zone 4 is at index 3
    
            let incrementPrice = distanceToNext * rate407[currentZone.toString()];
            price += incrementPrice;
            
            if (price > maxPrice && maxPrice != -1) return -1;
        }
        
        return price;
    }

    async calculateInterchangeTimes() {
        const largeICs = ["403", "401", "410", "427", "400", "404"]

        for (let i = this.tollStartIndex; this.goingEast ? i <= this.tollEndIndex : i >= this.tollEndIndex; this.goingEast ? i++: i--) { //This block calculates the time to and from all entrys and exits between the fastest entrys and exits 
            let toICTime;
            let fromICTime;
    
            if (!largeICs.includes(ICCoords[i].COMMENT)) {
                const currICCoords = {lat: ICCoords[i].Lat, lng: ICCoords[i].Lng}
    
                const toICRoute = await this.createRoute(this.originCoords, currICCoords, true);
                const fromICRoute = await this.createRoute(currICCoords, this.destinationCoords, true);
        
                toICTime = toICRoute.routes[0].legs[0].duration.value;
                fromICTime = fromICRoute.routes[0].legs[0].duration.value;
    
            } else {
                let numCoordsToCompare = ICCoords[i].Coords.length;
    
                for (let j=0; j<numCoordsToCompare; j++) {
    
                    const currICCoords = {lat: ICCoords[i].Coords[j].Lat, lng: ICCoords[i].Coords[j].Lng}
    
                    const originToIC = await this.createRoute(this.originCoords, currICCoords, true);
                    const ICToDesination = await this.createRoute(currICCoords, this.destinationCoords, true);
    
                    const currToICTime = originToIC.routes[0].legs[0].duration.value
                    const currFromICTime = ICToDesination.routes[0].legs[0].duration.value
                    
                    if (toICTime == undefined) {
                        toICTime = currToICTime
                        fromICTime = currFromICTime
                        this.fastestIndexOnLargeICsENTRY.set(i, j)
                        this.fastestIndexOnLargeICsEXIT.set(i, j)
                    } else if (currToICTime < toICTime) {
                        toICTime = currToICTime
                        this.fastestIndexOnLargeICsENTRY.set(i, j)
                    } else if (currFromICTime < fromICTime) {
                        fromICTime = currFromICTime
                        this.fastestIndexOnLargeICsEXIT.set(i, j)
                    }
                }
            }
    
            console.log(ICCoords[i].COMMENT + "| toInterchange: " + toICTime + "| fromInterchange: " + fromICTime)
    
            this.toICMap.set(i, toICTime);
            this.fromICMap.set(i, fromICTime);
        }
    } //adds originToInterchangeTimes and interchangeToDestinationTimes in seconds

    async determine407Rate(seconds) {
        let response;
        
        if (this.goingEast) {
            if (isWeekend) {
                response = await fetch("./data/407EastWeekend.JSON");
            } else {
                response = await fetch("./data/407EastWeekday.JSON");
            }
        } else {
            if (isWeekend) {
                response = await fetch("./data/407WestWeekend.JSON");
            } else {
                response = await fetch("./data/407WestWeekday.JSON");
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
    
        return -1;
    } //returns the price in cents per km at various points on the 407

    async createRoute(origin, destination, avoidToll) {
        return new Promise((resolve, reject) => {
          const direction = new google.maps.DirectionsService();
      
          direction.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING,
            avoidTolls: avoidToll
          }, 
      
            (response, status) => {
              if (status == "OK") resolve(response);
              else reject(`Error: ${status}`);
            }
          )
        })
    }

    async routeInstructions(directionsResult) {      
        let wasPreviousToll = false
        let numSteps = directionsResult.routes[0].legs[0].steps.length
      
        for (let j = 0; j < numSteps; j++) {
          let step = directionsResult.routes[0].legs[0].steps[j];
      
          let instruction = step.instructions;
          
          let currentCoords = {lat: step.start_location.lat(), lng: step.start_location.lng()};
      
          const isCurrentToll = this.isToll(instruction);
          
          if (isCurrentToll && !wasPreviousToll) {
            const prevInstruction = directionsResult.routes[0].legs[0].steps[j-1].instructions;
            const Start407 = await this.findMatchingCoords(currentCoords, prevInstruction); 
            //Use prev instruction here as for 407 entry, the street name is mentioned in the instruction before the one that mentions toll
      
            this.Start407Data = Start407.data;
            this.tollStartIndex = Start407.index;
      
            console.log("ORIGINAL TOLL ENTRY:" + Start407.data.COMMENT); // FOR DEBUGGING
          }
          
          if (!isCurrentToll && wasPreviousToll) {  
            
            const End407 = await this.findMatchingCoords(currentCoords, instruction);
            this.End407Data = End407.data;
            this.tollEndIndex = End407.index;
      
            console.log("ORIGINAL TOLL EXIT:" + End407.data.COMMENT); // FOR DEBUGGING
          }
      
          if (isCurrentToll) wasPreviousToll = true;
          else wasPreviousToll = false;
        }      
    }

    async findMatchingCoords(routeCoords, instruction) { 
        const size = ICZones.length;
      
        for (let i=0; i<size; i++) {
          const currentIC = ICZones[i];
      
          const ICCoord = {lat: currentIC.Lat, lng: currentIC.Lng};
          const tolerance = currentIC.Tol;
    
          const areCoordsCloseResults = this.areCoordsClose(routeCoords, ICCoord, tolerance);
        
          if (areCoordsCloseResults == 1) {
            if (currentIC.COMMENT == "427" || currentIC.COMMENT == "400" || currentIC.COMMENT == "404") {
                //The tolerance for 427, 400, and 404 has been made bigger to overlap interchanges close to it.
                const indexChange = this.dealWithCloseCoords(currentIC.COMMENT, instruction);
                return {data: ICZones[i + indexChange], index: i + indexChange}
            }
    
            return {data: currentIC, index: i};
          } 
        }
    
    } //Finds the first coords in 407Zones.JSON that is considered to be "close" to the input coords, this is used to find the first and last interchange to be used

    areCoordsClose(routeCoords, actualCoords, tolerance) {
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

    dealWithCloseCoords(interchangeName, instruction) {
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

    isToll(string) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(string, 'text/html');
        return doc.body.textContent.includes('Toll road');
    }

    getCurrentTime() {
        let now = new Date();
        return now.getSeconds() + now.getMinutes()*60 + now.getHours()*3600;
    } //gets current time in seconds
}