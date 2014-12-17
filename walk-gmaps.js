var map;
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

var distanceScale,
    durationScale,
    paceScale,
    startScale,
    endScale;

var colorings = {
  direction: {
    getStyle: function(feature) {
      var color = feature.getProperty('start') === 'north' ? 'rgb(255, 51, 0)' : 'rgb(0, 51, 255)';
      return {
        color: color,
        opacity: 0.3
      };
    }
  },
  distance: {
    getStyle: function(feature) {
      var scale = distanceScale(feature.getProperty('distance'));
      var colorNum = scale - (scale % 100);
      var color = palette.indigo[colorNum];
      return {
        color: color,
        opacity: 0.3
      };
    }
  },
  duration: {
    getStyle: function(feature) {
      var scale = durationScale(feature.getProperty('maxTick'));
      var colorNum = scale - (scale % 100);
      var color = palette.red[colorNum];
      return {
        color: color,
        opacity: 0.3
      };
    }
  },
  pace: {
    getStyle: function(feature) {
      var scale = paceScale(feature.getProperty('pace'));
      var colorNum = scale - (scale % 100);
      var color = palette.purple[colorNum];
      return {
        color: color,
        opacity: 0.3
      };
    }
  },
  start: {
    getStyle: function(feature) {
      var scale = feature.getProperty('start') === 'north' ?
        startScale(feature.getProperty('startTick')) :
        endScale(feature.getProperty('startTick'));
      var colorNum = scale - (scale % 100);
      var color = feature.getProperty('start') === 'north' ?
        palette.deepOrange[colorNum] : palette.blue[colorNum];
      return {
        color: color,
        opacity: 0.5
      };
    }
  }
};
var coloring = colorings.direction;

var initMap = function() {
	var a = geoJson.lineStrings[0].features[0].geometry.coordinates;
	var first = a[0],
		last = a[a.length-1],
		lon = (first[0] + last[0])/2,
		lat = (first[1] + last[1])/2;

  var mapOptions = {
    center: { lat: lat, lng: lon},
    zoom: 16
  };
  map = new google.maps.Map(document.getElementById('map'),
    mapOptions);

  google.maps.event.addListenerOnce(map, 'idle', function(){
    initScales();
    initControls();
    resetMap();
  });
};

var getPathsAtTick = function(tick) {
  var paths = {
    type: 'FeatureCollection',
    features: []
  };
  for (var i = 0; i < geoJson.lineStrings.length; i++) {
    var endIndex = geoJson.lineStrings[i].features[0].properties.ticks.length;
    for (var j = 0; j < geoJson.lineStrings[i].features[0].properties.ticks.length; j++) {
      var theTick = geoJson.lineStrings[i].features[0].properties.ticks[j];
      if (tick < theTick) {
        endIndex = j;
        break;
      }
    }
    paths.features.push({
      type: 'Feature',
      properties: {
        name: geoJson.lineStrings[i].features[0].properties.name,
        time: geoJson.lineStrings[i].features[0].properties.time,
        start: geoJson.lineStrings[i].features[0].properties.start,
        pathLength: geoJson.lineStrings[i].features[0].properties.pathLength,
        maxTick: geoJson.lineStrings[i].features[0].properties.maxTick,
        distance: geoJson.lineStrings[i].features[0].properties.distance,
        pace: geoJson.lineStrings[i].features[0].properties.pace,
        startTick: geoJson.lineStrings[i].features[0].properties.startTick
      },
      geometry: {
        type: 'LineString',
        coordinates: geoJson.lineStrings[i].features[0].geometry.coordinates.slice(0,(endIndex))
      }
    });
  }
  return paths;
};

var initScales = function() {
  distanceScale = d3.scale.linear()
    .domain([
      d3.min(geoJson.lineStrings, function(d) {
        return d.features[0].properties.distance;
    }),
      d3.max(geoJson.lineStrings, function(d) {
        return d.features[0].properties.distance;
    })])
    .rangeRound([300, 900]);

  durationScale = d3.scale.linear()
    .domain([
      d3.min(geoJson.lineStrings, function(d) {
        return d.features[0].properties.maxTick;
    }),
      d3.max(geoJson.lineStrings, function(d) {
        return d.features[0].properties.maxTick;
    })])
    .rangeRound([300, 900]);

  paceScale = d3.scale.linear()
    .domain([
      d3.min(geoJson.lineStrings, function(d) {
        return d.features[0].properties.pace;
    }),
      d3.max(geoJson.lineStrings, function(d) {
        return d.features[0].properties.pace;
    })])
    .rangeRound([300, 900]);

  startScale = d3.scale.linear()
    .domain([
      d3.min(geoJson.lineStrings.filter(function(d){
        return d.features[0].properties.start === 'north';
      }), function(d) {
        return d.features[0].properties.startTick;
    }),
      d3.max(geoJson.lineStrings.filter(function(d){
        return d.features[0].properties.start === 'north';
      }), function(d) {
        return d.features[0].properties.startTick;
    })])
    .rangeRound([300, 900]);

  endScale = d3.scale.linear()
    .domain([
      d3.min(geoJson.lineStrings.filter(function(d){
        return d.features[0].properties.start === 'south';
      }), function(d) {
        return d.features[0].properties.startTick;
    }),
      d3.max(geoJson.lineStrings.filter(function(d){
        return d.features[0].properties.start === 'south';
      }), function(d) {
        return d.features[0].properties.startTick;
    })])
    .rangeRound([300, 900]);
};

var currentTick = 0,
    playing = false,
    paused = false,
    currentLayers = [];
var mapTick = function() {
  playing = true;
  var lines = getPathsAtTick(currentTick);

  var nextLayers = map.data.addGeoJson(lines);

  for (var f = 0; f < currentLayers.length; f++) {
    map.data.remove(currentLayers[f]);
  }

  currentLayers = nextLayers;

  map.data.setStyle(function(feature) {
    var s = coloring.getStyle(feature);
    return {
      strokeColor: s.color,
      strokeOpacity: s.opacity,
      strokeWeight: 5
    };
  });

  map.data.addListener('mouseover', function(event) {
    map.data.overrideStyle(event.feature, {
      strokeOpacity: 1,
      zIndex: 100
    });
    
    var feature = event.feature;
    $('#start').html(moment(feature.getProperty('time')).format('ddd MMM D h:mm A'));
    var minutes = Math.floor(feature.getProperty('maxTick')/60);
    var seconds = feature.getProperty('maxTick') % 60;
    var duration = minutes + ' minutes ' + seconds + ' seconds';
    var pMin = Math.floor(feature.getProperty('pace')/60);
    var pSec = feature.getProperty('pace') % 60;
    var pace = pMin + ' minutes ' + (pSec !== 0 ? (pSec + ' seconds') : '');

    $('#duration').html(duration);
    $('#distance').html(feature.getProperty('distance') + ' mi');
    $('#pace').html(pace);

    var x = event.nb.x + 5,
        y = event.nb.y - 30;
    if (x + 235 > $(window).width()) x = x - 235;
    if (y + 95 > $(window).height()) y = $(window).height() - 95;
    $('#pathTooltip').css('left', x);
    $('#pathTooltip').css('top', y);
    $('#pathTooltip').show();
  });

  map.data.addListener('mouseout', function(event) {
    map.data.revertStyle();
    $('#pathTooltip').hide();
  });

  if (paused) {
    return;
  } else if (currentTick < geoJson.maxTick) {
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
  if (playing && !paused) {
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

  $('#colorControl').change(function() {
    coloring = colorings[$(this).val()];
    if (!playing || paused)
      mapTick();
  })
};

initJson(initMap);