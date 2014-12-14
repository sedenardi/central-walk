var map, currentLayer;
var interval = 10;
var speeds = {
  realTime: {
    speed: 0.01,
    duration: 1180
  },
  slow: {
    speed: 0.5,
    duration: 110
  },
  normal: {
    speed: 1,
    duration: 55
  },
  fast: {
    speed: 3,
    duration: 19
  },
  superSpeed: {
    speed: 10,
    duration: 6
  }
};
var speed = speeds.normal.speed;

var initMap = function() {
	var a = geoJson.lineStrings[0].features[0].geometry.coordinates;
	var first = a[0],
		last = a[a.length-1],
		lon = (first[0] + last[0])/2,
		lat = (first[1] + last[1])/2;

	map = L.map('map').setView([lat, lon], 15);

	L.tileLayer('https://{s}.tiles.mapbox.com/v3/sedenardi.kfmi8afc/{z}/{x}/{y}.png', {
		maxZoom: 20,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'examples.map-20v6611k'
	}).addTo(map);

  initControls();
  resetMap();
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
            maxTick: geoJson.lineStrings[i].features[0].properties.maxTick,
            distance: geoJson.lineStrings[i].features[0].properties.distance,
            pace: geoJson.lineStrings[i].features[0].properties.pace
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

var currentTick = 0,
    playing = false,
    paused = false;
var mapTick = function() {
  if (paused) {
    return;
  }
  playing = true;
  var lines = getPathsAtTick(currentTick);
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
          var pMin = Math.floor(feature.properties.pace/60);
          var pSec = feature.properties.pace % 60;
          var pace = pMin + ' minutes ' + (pSec !== 0 ? (pSec + ' seconds') : '');

          $('#duration').html(duration);
          $('#distance').html(feature.properties.distance + ' mi');
          $('#pace').html(pace);

          var x = e.originalEvent.x + 5,
              y = e.originalEvent.y - 30;
          if (x + 235 > $(window).width()) x = x - 235;
          if (y + 95 > $(window).height()) y = $(window).height() - 95;
          $('#pathTooltip').css('left', x);
          $('#pathTooltip').css('top', y);
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
  if (currentTick < geoJson.maxTick) {
    currentTick += speed;
    setTimeout(function() {
      mapTick();
    },interval);
  } else {
    playing = false;
    syncControlState();
  }
};

var resetMap = function() {
  playing = false;
  paused = false;
  currentTick = geoJson.mapTick;
  mapTick();
  syncControlState();
};

var syncControlState = function() {
  var $toggleIcon = $('.playbackControl[data-control="toggle"] > i');
  if (playing) {
    $toggleIcon.removeClass('fa-play').addClass('fa-pause');
  } else {
    $toggleIcon.removeClass('fa-pause').addClass('fa-play');
  }
};

var initControls = function() {
  $('.playbackControl').click(function(e) {
    var control = $(this).attr('data-control');
    if (control === 'toggle') {
      $toggleIcon = $(this).children('i');
      if (!paused) {
        if (playing) {
          paused = true;
        } else {
          currentTick = 0;
          mapTick();
        }
      } else {
        paused = false;
        mapTick();
      }
      syncControlState();
    } else if (control === 'stop') {
      resetMap();
    }
    e.preventDefault();
  });
  $('#speedControl').change(function() {
    speed = speeds[$(this).val()].speed;
  });
};

initJson(initMap);