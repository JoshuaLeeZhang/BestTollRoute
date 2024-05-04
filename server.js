const {Client} = require("@googlemaps/google-maps-services-js")
require('dotenv').config()
const googleMaps = new Client({})
module.exports = {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    googleMaps: googleMaps
}

const express = require('express')
const fs = require('fs')
const Route = require('./route.js')

const app = express()

global.ICNames = JSON.parse(fs.readFileSync('./data/407InterchangeNames.JSON', 'utf8'))
global.ICZones = JSON.parse(fs.readFileSync('./data/407Zones.JSON', 'utf8'))
global.ICCoords = JSON.parse(fs.readFileSync('./data/407Interchanges.JSON', 'utf8'))
global.EastWeekend = JSON.parse(fs.readFileSync('./data/407EastWeekend.JSON', 'utf8'))
global.WestWeekend = JSON.parse(fs.readFileSync('./data/407WestWeekend.JSON', 'utf8'))
global.EastWeekday = JSON.parse(fs.readFileSync('./data/407EastWeekday.JSON', 'utf8'))
global.WestWeekday = JSON.parse(fs.readFileSync('./data/407WestWeekday.JSON', 'utf8'))

const PORT = process.env.PORT || 8080

app.use('/tollrouteoptimize', express.static('public'))
app.use(express.json())

app.get('/updateRoute', async (req, res) => {
    const currentOriginCoords = {lat: req.query.currentOriginLat, lng: req.query.currentOriginLng}
    const currentDestinationCoords = {lat: req.query.currentDestinationLat, lng: req.query.currentDestinationLng}
    const isWeekend = req.query.isWeekend
    const hasTransponder = req.query.hasTransponder

    const newRoute = new Route(currentOriginCoords, currentDestinationCoords, isWeekend, hasTransponder)
    const result = await newRoute.createSmartRoute()

    res.json({string: result, usedToll: newRoute.usedToll, entryCoords: newRoute.bestRoute.entryCoords, exitCoords: newRoute.bestRoute.exitCoords})
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/tollrouteoptimize`)
})
