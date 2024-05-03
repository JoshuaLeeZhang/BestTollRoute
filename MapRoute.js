const {apiKey, googleMaps} = require('./server.js')

class MapRoute {
    constructor(originCoords, destinationCoords, entryCoords, exitCoords) {
        this.originCoords = originCoords
        this.destinationCoords = destinationCoords
        this.entryCoords = entryCoords
        this.exitCoords = exitCoords
    }

    async calculateRoute() {

        const requestTO407 = {
            origin: this.originCoords,
            destination: this.entryCoords,
            travelMode: 'DRIVING',
            avoidTolls: true
        }
    
        const requestIN407 = {
            origin: this.entryCoords,
            destination: this.exitCoords,
            travelMode: 'DRIVING',
            avoidTolls: false
        }
    
        const requestFROM407 = {
            origin: this.exitCoords,
            destination: this.destinationCoords,
            travelMode: 'DRIVING',
            avoidTolls: true
        }
    
        const directionsService = new google.maps.DirectionsService();
    
        const routeTO407 = directionsService.route(requestTO407, function(result, status) {
            if (status === 'OK') {
                renderTO407.setDirections(result);
            } else {
                window.alert('First segment failed due to ' + status);
            }
        });
    
        const routeIN407 = directionsService.route(requestIN407, function(result, status) {
            if (status === 'OK') {
                renderIN407.setDirections(result);
            } else {
                window.alert('Second segment failed due to ' + status);
            }
        });
    
        const routeFROM407 = directionsService.route(requestFROM407, function(result, status) {
            if (status === 'OK') {
                renderFROM407.setDirections(result);
            } else {
                window.alert('Third segment failed due to ' + status);
            }
        });
    }
}