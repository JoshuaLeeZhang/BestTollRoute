let ICNames
let ICZones
let ICCoords

async function loadJSON() {
  const ICNamesResponse = await fetch("407InterchangeNames.JSON");
  const ICZonesResponse = await fetch("407Zones.JSON");
  const ICCoordsResponse = await fetch("407Interchanges.JSON");

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

let originCoords;
let destinationCoords;
let isWeekend = false;
let hasTransponder = false;

let routeDrawingData = {
  tollStart: undefined,
  tollEnd: undefined
} //this is to be used for drawNewRoute

async function updateRoute() {
  document.getElementById("bestRoute").innerHTML = "Pending Results";

  const calculatedRoute = await createRoute(originCoords, destinationCoords, false);
  displayRoute(calculatedRoute);

  const routeData = await routeInstructions(calculatedRoute);

  if (typeof routeData.tollStartIndex == 'undefined') {
    document.getElementById("bestRoute").innerHTML = "No Toll Needed!";
  } else {
    const { bestRoute, tollStart, tollEnd} = await mostCostEffectiveToll(originCoords, routeData.tollStartIndex, routeData.tollEndIndex, destinationCoords);
    
    const minutesPerDollar = parseFloat((bestRoute.ratio/60*100).toFixed(2))
    const dollarCost = parseFloat((bestRoute.cents/100).toFixed(2))

    if (bestRoute.entry == tollStart && bestRoute.exit == tollEnd) document.getElementById("bestRoute").innerHTML = `The best route is to enter and exit according to Google Maps' original instructions. Enter at ${ICNames[bestRoute.entry]} and exit at ${ICNames[bestRoute.exit]}. You will save ${minutesPerDollar} minutes per dollar for ${dollarCost} dollars total`
    else document.getElementById("bestRoute").innerHTML = `Enter at ${ICNames[bestRoute.entry]} and exit at ${ICNames[bestRoute.exit]} to save ${minutesPerDollar} minutes per dollar for ${dollarCost} dollars total.`

    routeDrawingData.tollStart = bestRoute.entry;
    routeDrawingData.tollEnd = bestRoute.exit
  }
}

async function routeInstructions(directionsResult) {
  let Start407Data;
  let End407Data;
  let tollStartIndex;
  let tollEndIndex;

  let wasPreviousToll = false;

  for (let j = 0; j < directionsResult.routes[0].legs[0].steps.length; j++) {
    let step = directionsResult.routes[0].legs[0].steps[j];

    let instruction = step.instructions;
    
    let currentCoords = {lat: step.start_location.lat(), lng: step.start_location.lng()};

    const isCurrentToll = isToll(instruction);
    
    if (isCurrentToll && !wasPreviousToll) {
      const prevInstruction = directionsResult.routes[0].legs[0].steps[j-1].instructions;
      const Start407 = await findMatchingCoords(currentCoords, prevInstruction); 
      //Use prev instruction here as for 407 entry, the street name is mentioned in the instruction before the one that mentions toll

      Start407Data = Start407.data;
      tollStartIndex = Start407.index;

      console.log("ORIGINAL TOLL ENTRY:" + Start407.data.COMMENT); // FOR DEBUGGING
    }
    
    if (!isCurrentToll && wasPreviousToll) {  
      
      const End407 = await findMatchingCoords(currentCoords, instruction);
      End407Data = End407.data;
      tollEndIndex = End407.index;

      console.log("ORIGINAL TOLL EXIT:" + End407.data.COMMENT); // FOR DEBUGGING
    }

    if (isCurrentToll) wasPreviousToll = true;
    else wasPreviousToll = false;
  }

  return {
    Start407Data,
    End407Data,
    tollStartIndex,
    tollEndIndex
  }

}

async function createRoute(origin, destination, avoidToll) {
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