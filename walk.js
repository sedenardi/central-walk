var map, currentLayer;
var startTime, endTime;
var speed = 3;

var initMap = function() {
	var a = geoJson.lineStrings[0].features[0].geometry.coordinates;
	var first = a[0],
		last = a[a.length-1],
		lon = (first[0] + last[0])/2,
		lat = (first[1] + last[1])/2;

	map = L.map('map').setView([lat, lon], 16);

	L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'examples.map-20v6611k'
	}).addTo(map);

  startTime = new Date();
  mapTick(0);
};

var getPathsAtTick = function(tick) {
  var paths = [];
  for (var i = 0; i < geoJson.lineStrings.length; i++) {
    var endIndex = geoJson.lineStrings[i].features[0].properties.ticks.length;
    for (var j = 0; j < geoJson.lineStrings[i].features[0].properties.ticks.length; j++) {
      var theTick = geoJson.lineStrings[i].features[0].properties.ticks[j];
      if (tick < theTick) {
        endIndex = j;
        break;
      }
    }
    var path = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: geoJson.lineStrings[i].features[0].properties.name,
            time: geoJson.lineStrings[i].features[0].properties.time,
            start: geoJson.lineStrings[i].features[0].properties.start,
            pathLength: geoJson.lineStrings[i].features[0].properties.pathLength,
            maxTick: geoJson.lineStrings[i].features[0].properties.ticks[geoJson.lineStrings[i].features[0].properties.ticks.length-1]
          },
          geometry: {
            type: 'LineString',
            coordinates: geoJson.lineStrings[i].features[0].geometry.coordinates.slice(0,(endIndex))
          }
        }
      ]
    };
    paths.push(path);
  }
  return paths;
};

var getStyle = function(feature) {
  var color = feature.properties.start === 'south' ? 'rgb(255, 51, 0)' : 'rgb(0, 51, 255)';
  return {
    color: color,
    opacity: 0.3
  };
};

var mapTick = function(tick) {
  var lines = getPathsAtTick(tick);
  var nextLayer = L.geoJson(lines, {
    style: getStyle,
    onEachFeature: function(feature,layer) {
      layer.on({
        mouseover: function(e) {
          layer.setStyle({
            opacity: 1
          });
          if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
          }
          $('#start').html(moment(feature.properties.time).format('ddd MMM D h:mm A'));
          var minutes = Math.floor(feature.properties.maxTick/60);
          var seconds = feature.properties.maxTick % 60;
          var duration = minutes + ' minutes ' + seconds + ' seconds';
          $('#duration').html(duration);
          $('#pathTooltip').css('left', e.originalEvent.x + 5);
          $('#pathTooltip').css('top', e.originalEvent.y - 25);
          $('#pathTooltip').show();

        },
        mouseout: function(e) {
          layer.setStyle(getStyle(feature));
          $('#pathTooltip').hide();
        }
      })
    }
  }).addTo(map);
  if (currentLayer) map.removeLayer(currentLayer);
  currentLayer = nextLayer;
  if (tick < geoJson.maxTick) {
    tick += speed;
    setTimeout(function() {
      mapTick(tick);
    },10);
  } else {
    endTime = new Date();
    console.log('done - ' + (endTime-startTime));
  }
};

initJson(initMap);