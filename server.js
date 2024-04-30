const express = require('express')
const fs = require('fs')

const app = express()

global.ICNames = JSON.parse(fs.readFileSync('./data/407InterchangeNames.JSON', 'utf8'))
global.ICZones = JSON.parse(fs.readFileSync('./data/407Zones.JSON', 'utf8'))
global.ICCoords = JSON.parse(fs.readFileSync('./data/407Interchanges.JSON', 'utf8'))



const myRoute = new Route()

const PORT = 3000

app.use(express.static('public'))
app.use(express.json())

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
