var map, currentLayer, attractionLayer;
var interval = 10;
var speeds = {
  realTime: {
    speed: 0.01,
    duration: 1180
  },
  slow: {
    speed: 1,
    duration: 110
  },
  normal: {
    speed: 2,
    duration: 55
  },
  fast: {
    speed: 6,
    duration: 19
  },
  superSpeed: {
    speed: 15,
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
      var color = feature.properties.start === 'north' ? 'rgb(255, 51, 0)' : 'rgb(0, 51, 255)';
      return {
        color: color,
        opacity: 0.5
      };
    }
  },
  distance: {
    getStyle: function(feature) {
      var scale = distanceScale(feature.properties.distance);
      var colorNum = scale - (scale % 100);
      var color = palette.indigo[colorNum];
      return {
        color: color,
        opacity: 0.6
      };
    }
  },
  duration: {
    getStyle: function(feature) {
      var scale = durationScale(feature.properties.maxTick);
      var colorNum = scale - (scale % 100);
      var color = palette.red[colorNum];
      return {
        color: color,
        opacity: 0.6
      };
    }
  },
  pace: {
    getStyle: function(feature) {
      var scale = paceScale(feature.properties.pace);
      var colorNum = scale - (scale % 100);
      var color = palette.purple[colorNum];
      return {
        color: color,
        opacity: 0.6
      };
    }
  },
  start: {
    getStyle: function(feature) {
      var scale = feature.properties.start === 'north' ?
        startScale(feature.properties.startTick) :
        endScale(feature.properties.startTick);
      var colorNum = scale - (scale % 100);
      var color = feature.properties.start === 'north' ?
        palette.deepOrange[colorNum] : palette.blue[colorNum];
      return {
        color: color,
        opacity: 0.5
      };
    }
  }
};
var coloring = colorings.direction;

var tiles = {
  Mapbox: {
    url: 'https://{s}.tiles.mapbox.com/v3/sedenardi.kfmi8afc/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
      '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="http://mapbox.com">Mapbox</a>'
  },
  OpenStreetMap: {
    url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
  },
  OpenMapSurferRoads: {
    url: 'http://openmapsurfer.uni-hd.de/tiles/roads/x={x}&y={y}&z={z}',
    attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ ' +
      'University of Heidelberg</a> &mdash; Map data &copy; ' +
      '<a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  HyddaFull: {
    url: 'http://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png',
    attribution: 'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap ' +
      'Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }
};
var tile = tiles.Mapbox;

var initMap = function() {
	var a = geoJson.lineStrings[0].features[0].geometry.coordinates;
	var first = a[0],
		last = a[a.length-1],
		lon = (first[0] + last[0])/2,
		lat = (first[1] + last[1])/2;

	map = L.map('map').setView([lat, lon], 16);
  L.tileLayer(tile.url, {
    maxZoom: 20,
    attribution: tile.attribution
  }).addTo(map);

  initScales();
  initControls();
  resetMap();
  showAttractions();
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
            pace: geoJson.lineStrings[i].features[0].properties.pace,
            startTick: geoJson.lineStrings[i].features[0].properties.startTick
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

var initScales = function() {
  distanceScale = d3.scale.linear()
    .domain([
      d3.min(geoJson.lineStrings, function(d) {
        return d.features[0].properties.distance;
    }),
      d3.max(geoJson.lineStrings, function(d) {
        return d.features[0].properties.distance;
    })])
    .rangeRound([100, 900]);

  durationScale = d3.scale.linear()
    .domain([
      d3.min(geoJson.lineStrings, function(d) {
        return d.features[0].properties.maxTick;
    }),
      d3.max(geoJson.lineStrings, function(d) {
        return d.features[0].properties.maxTick;
    })])
    .rangeRound([100, 900]);

  paceScale = d3.scale.linear()
    .domain([
      d3.min(geoJson.lineStrings, function(d) {
        return d.features[0].properties.pace;
    }),
      d3.max(geoJson.lineStrings, function(d) {
        return d.features[0].properties.pace;
    })])
    .rangeRound([100, 900]);

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
    paused = false;
var mapTick = function() {
  playing = true;
  var lines = getPathsAtTick(currentTick);

  var nextLayer = L.geoJson(lines, {
    style: coloring.getStyle,
    onEachFeature: function(feature,layer) {
      layer.on({
        mouseover: function(e) {
          layer.setStyle({
            color: palette.grey[900],
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
          if (x + 245 > $(window).width()) x = x - 245;
          if (y + 95 > $(window).height()) y = $(window).height() - 95;
          $('#pathTooltip').css('left', x);
          $('#pathTooltip').css('top', y);
          $('#pathTooltip').show();

        },
        mouseout: function(e) {
          layer.setStyle(coloring.getStyle(feature));
          $('#pathTooltip').hide();
        }
      });
    }
  }).addTo(map);

  if (currentLayer) map.removeLayer(currentLayer);
  currentLayer = nextLayer;

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

var showAttractions = function() {
  attractionLayer = L.geoJson(attractions, {
    pointToLayer: function(feature, latlng) {
      var c = 'icon-custom icon-' + feature.properties.type;
      var icon = L.divIcon({ 
        className: c,
        iconSize: L.point(16, 16)
      });
      return L.marker(latlng, {icon: icon});
    },
    onEachFeature: function(feature,layer) {
      var popupContent = '<div class="popupTitle">' + feature.properties.name + '</div>';
      layer.bindPopup(popupContent);
    }
  }).addTo(map);
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
  });

  $('#attCheckbox').change(function() {
    if ($('#attCheckbox').is(':checked')) {
      showAttractions();
    } else if (attractionLayer) {
      map.removeLayer(attractionLayer);
    }
  });

  $('#attrToggle').click(function() {
    $('#attCheckbox').prop('checked', !$('#attCheckbox').is(':checked'))
      .change();
  });
};

var initWalk = function(cb) {
  $.ajax({
    url: 'coordinates.json',
    dataType: 'json',
    success: function(geoRes) {
      geoJson = geoRes;
      $.ajax({
        url: 'attractions.json',
        dataType: 'json',
        success: function(attRes) {
          attractions = attRes;
          cb();
        }
      });
    }
  });
};

initWalk(initMap);