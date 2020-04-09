/*-----------------------------------------------------------------------------------
  
  Please create simple weather chatbot using Microsoft Bot Builder SDK v3 for Node.js.
  It should allow user to check weather in certain location for today/tomorrow/the day
  after tomorrow (prompt user for location and one of these 3 time options and then use
  answers to get and show weather from some online service).
    * use some public weather API
    * it is enough to use just default "console" channel
    * try to use existing NPM libraries whenever possible
    * try to produce "clean code" whatever it means for you ;-)
    * publish it as public Git repo or Gist and just send us link when done
  You can start by modifying following example of "waterfall" bot or check out docs:
  https://docs.microsoft.com/en-us/azure/bot-service/nodejs/bot-builder-nodejs-overview
  How to run the example? Install botbuilder module using "npm i botbuilder@3", run the
  bot using "node assignment.js" and then type anything to wake the bot up.
    
-----------------------------------------------------------------------------*/

const builder = require('botbuilder')
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest

const baseApiUrl = 'http://api.openweathermap.org/data/2.5/weather?'

const inMemoryStorage = new builder.MemoryBotStorage()
const connector = new builder.ConsoleConnector().listen()

const bot = new builder.UniversalBot(connector, [
  (session) => {
    builder.Prompts.text(session, "Welcome! Please insert your API key to Open Weather Map.")
  },
  (session, results) => {
    session.userData.apiId = results.response
    builder.Prompts.choice(session, 'What type of location you will be entering?', [
      'Latitude and longitude',
      'Town',
    ])
  },
  (session, results) => {
    session.userData.locationType = results.response.entity
    if(session.userData.locationType == 'Latitude and longitude') {
      builder.Prompts.text(session, "Enter latitude and longitude seperated by space please.")
    } else {
      builder.Prompts.text(session, "Enter town please.")
    }
  },
  (session, results) => {
    session.userData.locationTypeValue = results.response
    builder.Prompts.choice(session, 'Please enter weather time?', [
      'today',
      'tomorrow',
      'the day after tomorrow',
    ])
  },
  (session, results) => {
    session.userData.weatherTime = results.response.entity
    session.userData.weatherTimestamp = getTimeByChoice(session.userData.weatherTime)
    const url = baseApiUrl + getUrlParameterString(session.userData)
    const reponse = callOpenWeather(url)
    const weather = JSON.parse(reponse)
   
    if(weather.cod == 200) {
      session.send(`Got it! weather: ${weather.weather[0].main},  more specifically: ${weather.weather[0].description}.
      temperature: ${weather.main.temp}, feel Temperature: ${weather.main.feels_like}, maximun temperature: ${weather.main.temp_max}, 
      minimum temperature: ${weather.main.temp_min}, pressure: ${weather.main.pressure}, humidity: ${weather.main.humidity}, wind speed: ${weather.wind.speed}, 
      sunrise: ${getDateFromTimestamp(weather.sys.sunrise)}, sunset: ${getDateFromTimestamp(weather.sys.sunset)},
      url: ${url}`)
    } else {
      session.send(`Unexpected result with code: ${weather.cod} when requesting url: ${url}. Gathered input data from user-> api id: ${session.userData.apiId}, 
      location type: ${session.userData.locationType}, location type value: ${session.userData.locationTypeValue}, weather time: ${session.userData.weatherTime} 
      and weather timestamp: ${session.userData.weatherTimestamp}`)
    }
  },
]).set('storage', inMemoryStorage)

callOpenWeather = (url) => {
  let response;
  let xmlhttp = new XMLHttpRequest()
  xmlhttp.onreadystatechange = () => response = xmlhttp.responseText
  xmlhttp.open("GET", url, false)
  xmlhttp.send()

  return response
}

getDayTime = () => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return startOfDay / 1000
}

getTimeByChoice = (time) => {
  let timestamp
  switch(time) {
    case 'tomorrow': {
      timestamp = 3600 * 24 + getDayTime()
      break
    }
    case 'the day after tomorrow': {
      timestamp = 3600 * 24 * 2 + getDayTime() 
      break
    }
    default: {
      timestamp = getDayTime()
    }
  }

  return timestamp
}

getUrlParameterString = (userData) => {
  let parameterString;
  parameterString = `q=${userData.locationTypeValue.trim()}`
  if(userData.locationType == 'Latitude and longitude') {
    const values = userData.locationTypeValue.trim().split(' ')
    if(values.length == 2) {
      const latitude = parseFloat(values[0].trim())
      const longitude = parseFloat(values[1].trim())
      if(!isNaN(latitude) && !isNaN(longitude)) {  
        parameterString = `lat=${latitude}&lon=${longitude}`
      }
    }
  }

  parameterString += `&dt=${userData.weatherTimestamp}`
  parameterString += `&appid=${userData.apiId.trim()}`

  return parameterString
}

getDateFromTimestamp = (timestamp) => {
  const date = new Date(timestamp * 1000)
  const hours = date.getHours()
  const minutes = "0" + date.getMinutes()
  const seconds = "0" + date.getSeconds()

  return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2)
}
