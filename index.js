// @weather_the_bot
// https://github.com/telegraf/telegraf/issues/320
// https://github.com/telegraf/telegraf/issues/420
const { Composer, log, Markup, Extra } = require('micro-bot');
const axios = require('axios');
const firebaseSession = require('telegraf-session-firebase');
const admin = require('firebase-admin');

const bot = new Composer();
const dark_sky_key = '<API_KEY>';

// https://github.com/schachmat/wego/blob/master/frontends/ascii-art-table.go
// clear-day, clear-night, rain, snow, sleet, wind, fog, cloudy, partly-cloudy-day, or partly-cloudy-night || make sure there's a default too
const weather_symbols = {
  fog: "🌫️",
  cloudy: "☁️",
  sleet: "❄️ ☔️",
  wind: "🌬️",
  rain: "☔️",
  snow: "❄️",
  "clear-day": "☀️",
  "clear-night": "🌙",
  "partly-cloudy-day": "⛅",
  "partly-cloudy-night": "☁️🌙",
  default: "🌎"
}

const main_menu = [['Current Weather'],['Next Day Forecast','7-Day Forecast','Set Location']];

const serviceAccount = require('./firebase.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://weather-the-bot.firebaseio.com'
});
const database = admin.database();

bot.use(firebaseSession(database.ref('sessions')));

// bot.use(log());
bot.command('start', (ctx) => {
  ctx.session.temp = 'fahrenheit';
  getLocation(ctx, true);
});

bot.command('location', (ctx) => {
  getLocation(ctx, false);
});

bot.command('settings', (ctx) => {
  ctx.replyWithMarkdown(`Your current settings: \nLocation: ${ctx.session.location.latitude}, ${ctx.session.location.longitude} \nTemperature: ${ctx.session.temp}`, 
    Markup.keyboard([['Use Fahrenheit','Use Celcius'],['Set Location']]).oneTime().resize().extra() );
});

bot.command('help', (ctx) => ctx.reply('Use /start or /location to set your location. Use /settings to set your options.'));

bot.hears('Use Fahrenheit', (ctx) => {
  ctx.session.temp = 'fahrenheit';
  ctx.replyWithMarkdown('Now using fahrenheit', Markup.keyboard(main_menu).oneTime().resize().extra() );
});

bot.hears('Use Celcius', (ctx) => {
  ctx.session.temp = 'celcius';
  ctx.replyWithMarkdown('Now using celcius', Markup.keyboard(main_menu).oneTime().resize().extra() );
});

bot.hears('Current Weather', (ctx) => {
  ctx.webhookReply = false;
  if (ctx.session.location.latitude == '' || ctx.session.location.longitude == '') {
    getLocation(ctx, false, false);
  } else {
    getWeather(ctx, false, false);
  }
});

bot.hears('Next Day Forecast', (ctx) => {
  ctx.webhookReply = false;
  if (ctx.session.location.latitude == '' || ctx.session.location.longitude == '') {
    getLocation(ctx, false, true);
  } else {
    getWeather(ctx, false, true);
  }
});

bot.hears('7-Day Forecast', (ctx) => {
  ctx.webhookReply = false;
  if (ctx.session.location.latitude == '' || ctx.session.location.longitude == '') {
    getLocation(ctx, false, false);
  } else {
    getWeather(ctx, true, false);
  }
});

bot.on('location', (ctx) => {
  ctx.session.location = ctx.update.message.location;
  ctx.replyWithMarkdown('Got your location!', Markup.keyboard(main_menu).oneTime().resize().extra() );
});

bot.hears('Set Location', (ctx) => {
  getLocation(ctx, false);
});

function getWeather(ctx, forecast, next_day) {
  ctx.webhookReply = false;
  let units = 'auto';
  let speed = '';
  let precip_unit = '"';
  let icon = weather_symbols.default;
  if (ctx.session.temp == 'celcius') { units = 'si'; speed = 'km/h'; precip_unit = 'mm' } else if (ctx.session.temp == 'fahrenheit') { units = 'us'; speed = 'm/h'; precip_unit = '"'; }
  return axios.get('https://api.darksky.net/forecast/'+dark_sky_key+'/'+ctx.session.location.latitude+','+ctx.session.location.longitude+'/?units='+units)
    .then(res => {
      if (forecast) {
      if (weather_symbols[res.data.daily.icon]) { icon = weather_symbols[res.data.daily.icon]; }
        let date1 = timeConverter(res.data.daily.data[1].time);
        let date2 = timeConverter(res.data.daily.data[2].time);
        let date3 = timeConverter(res.data.daily.data[3].time);
        let date4 = timeConverter(res.data.daily.data[4].time);
        let date5 = timeConverter(res.data.daily.data[5].time);
        let date6 = timeConverter(res.data.daily.data[6].time);
        let date7 = timeConverter(res.data.daily.data[7].time);
        return ctx.replyWithMarkdown(`
${icon}
*${res.data.daily.summary}*
--------------------------
*Tomorrow*
${res.data.daily.data[0].summary}
*High:* ${res.data.daily.data[0].temperatureHigh}° | *Low:* ${res.data.daily.data[0].temperatureLow}°
--------------------------
*${date1}*
${res.data.daily.data[1].summary}
*High:* ${res.data.daily.data[1].temperatureHigh}° | *Low:* ${res.data.daily.data[1].temperatureLow}°
--------------------------
*${date2}*
${res.data.daily.data[2].summary}
*High:* ${res.data.daily.data[2].temperatureHigh}° | *Low:* ${res.data.daily.data[2].temperatureLow}°
--------------------------
*${date3}*
${res.data.daily.data[3].summary}
*High:* ${res.data.daily.data[3].temperatureHigh}° | *Low:* ${res.data.daily.data[3].temperatureLow}°
--------------------------
*${date4}*
${res.data.daily.data[4].summary}
*High:* ${res.data.daily.data[4].temperatureHigh}° | *Low:* ${res.data.daily.data[4].temperatureLow}°
--------------------------
*${date5}*
${res.data.daily.data[5].summary}
*High:* ${res.data.daily.data[5].temperatureHigh}° | *Low:* ${res.data.daily.data[5].temperatureLow}°
--------------------------
*${date6}*
${res.data.daily.data[6].summary}
*High:* ${res.data.daily.data[6].temperatureHigh}° | *Low:* ${res.data.daily.data[6].temperatureLow}°
--------------------------
*${date7}*
*${res.data.daily.data[7].summary}*
*High:* ${res.data.daily.data[7].temperatureHigh}° | *Low:* ${res.data.daily.data[7].temperatureLow}°`, Markup.keyboard(main_menu).oneTime().resize().extra());
      } else {
        if (next_day) {
          if (weather_symbols[res.data.daily.data[0].icon]) { icon = weather_symbols[res.data.daily.data[0].icon]; }
        return ctx.replyWithMarkdown(`${icon} \n*${res.data.daily.data[0].summary}* \n*High:* ${res.data.daily.data[0].temperatureHigh}° | *Low:* ${res.data.daily.data[0].temperatureLow}° \n*Wind:* ${res.data.daily.data[0].windGust} ${speed} \n*Precip:* ${res.data.daily.data[0].precipIntensity}${precip_unit}`, Markup.keyboard(main_menu).oneTime().resize().extra());
        } else {
          if (weather_symbols[res.data.currently.icon]) { icon = weather_symbols[res.data.currently.icon]; }
          return ctx.replyWithMarkdown(`${icon} \n*${res.data.currently.summary}* \n*Temp:* ${res.data.currently.temperature}° \n*Wind:* ${res.data.currently.windGust} ${speed} \n*Precip:* ${res.data.currently.precipIntensity}${precip_unit}`, Markup.keyboard(main_menu).oneTime().resize().extra());
        }
      }
    }).catch(err => console.log(err));
}

function getLocation(ctx, start) {
  let message = "Let's get your location!";
  if (start) { message = "Welcome! Let's start by getting your location"; }
  return ctx.reply(message, Extra.markup((markup) => {
    return markup.resize()
      .keyboard([
        markup.locationRequestButton('Send location')
      ]);
  }));
}

function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var time = date + ' ' + month + ' ' + year;
  return time;
}

module.exports = bot;
