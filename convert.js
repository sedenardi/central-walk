var files = [
  '2014-06-23-2029.gpx',
  '2014-07-02-1035.gpx',
  '2014-07-11-0942.gpx',
  '2014-07-21-1930.gpx',
  '2014-07-28-0954.gpx',
  '2014-08-05-1009.gpx',
  '2014-08-12-1021.gpx',
  '2014-06-24-0951.gpx',
  '2014-07-07-0931.gpx',
  '2014-07-15-1742.gpx',
  '2014-07-22-0934.gpx',
  '2014-07-28-1838.gpx',
  '2014-08-06-0943.gpx',
  '2014-08-13-1809.gpx',
  '2014-06-24-1936.gpx',
  '2014-07-08-1003.gpx',
  '2014-07-16-0959.gpx',
  '2014-07-23-0940.gpx',
  '2014-07-29-1323.gpx',
  '2014-08-07-1148.gpx',
  '2014-06-25-1015.gpx',
  '2014-07-08-2043.gpx',
  '2014-07-17-0950.gpx',
  '2014-07-24-1016.gpx',
  '2014-07-29-1724.gpx',
  '2014-08-07-1915.gpx',
  '2014-06-30-0947.gpx',
  '2014-07-09-0935.gpx',
  '2014-07-18-0936.gpx',
  '2014-07-24-1858.gpx',
  '2014-07-30-1348.gpx',
  '2014-08-08-1003.gpx',
  '2014-07-01-0956.gpx',
  '2014-07-10-1005.gpx',
  '2014-07-18-1848.gpx',
  '2014-07-25-1047.gpx',
  '2014-07-30-1724.gpx',
  '2014-08-11-1011.gpx',
  '2014-07-01-1930.gpx',
  '2014-07-10-2025.gpx',
  '2014-07-21-0955.gpx',
  '2014-07-25-1851.gpx',
  '2014-08-04-1014.gpx',
  '2014-08-11-1826.gpx'
];

var geoJson = {
  lineStrings: [],
  maxTick: 0,
  bounds: {}
};

var processXml = function(index,xml,cb) {
  var json = toGeoJSON.gpx(xml);
  geoJson.lineStrings.push(json);
  if (++index < files.length) {
    downloadAndProcess(index,cb);
  } else {
    processJson(cb);
  }
};

var downloadAndProcess = function(index,cb) {
  console.log('Processing ' + files[index]);
  $.ajax({
    url: 'gpx/' + files[index],
    dataType: 'xml',
    contentType: "text/xml; charset=\"utf-8\"",
    success: function(response) {
      processXml(index,response,cb);
    }
  });
};

var convertToUTC = function() {
  _.each(geoJson.lineStrings, function(v,i) {
    var m = moment(v.features[0].properties.time);

    var startTick = m.hours()*3600 + m.minutes()*60 + m.seconds();
    v.features[0].properties.startTick = startTick;
    
    // time zone offset (EST DST -4 hours)
    m.add(4,'hours').utc();
    v.features[0].properties.time = m.toISOString();

    _.each(v.features[0].properties.coordTimes, function(w,j) {
      var n = moment(w);
      n.add(4,'hours');
      n.utc();
      v.features[0].properties.coordTimes[j] = n.toISOString();
    });
  });
};

var calculateTicks = function() {
  _.each(geoJson.lineStrings, function(v,i) {
    var baseTime = moment(v.features[0].properties.coordTimes[0]);
    v.features[0].properties.ticks = _.map(v.features[0].properties.coordTimes, function(w,j) {
      var time = moment(w);
      return time.diff(baseTime,'s');
    });
  });
  var maxObj = _.max(geoJson.lineStrings, function(v,i) {
    var len = v.features[0].properties.ticks.length;
    return v.features[0].properties.ticks[len-1];
  });
  geoJson.maxTick = maxObj.features[0].properties.ticks[maxObj.features[0].properties.ticks.length-1];
};

var groupByStart = function() {
  var averageLats = [];
  for (var i = 0; i < geoJson.lineStrings.length; i++) {
    // find start points
    var numCoords = geoJson.lineStrings[i].features[0].geometry.coordinates.length;
    var firstLat = geoJson.lineStrings[i].features[0].geometry.coordinates[0][1];
    var lastLat = geoJson.lineStrings[i].features[0].geometry.coordinates[numCoords-1][1];
    averageLats.push((firstLat+lastLat)/2);
  }

  var latSum = 0.0;
  for (var j = 0; j < averageLats.length; j++) {
    latSum += averageLats[j];
  }
  var averageLat = latSum / averageLats.length;

  for (var k = 0; k < geoJson.lineStrings.length; k++) {
    var startLat = geoJson.lineStrings[k].features[0].geometry.coordinates[0][1];
    geoJson.lineStrings[k].features[0].properties.start = startLat < averageLat ? 'south' : 'north';
  }
};

var calculateStats = function() {
  for (var i = 0; i < geoJson.lineStrings.length; i++) {
    var len = 0;
    var coords = geoJson.lineStrings[i].features[0].geometry.coordinates;
    for (var j = 0; j < (coords.length-1); j++) {
      len += gju.pointDistance({
          type: 'Point',
          coordinates: coords[j]
        },
        {
          type: 'Point', 
          coordinates: coords[j+1]
        }
      );
    }
    geoJson.lineStrings[i].features[0].properties.pathLength = len; // in meters

    // distance
    var miles = geoJson.lineStrings[i].features[0].properties.pathLength * 0.000621371;
    geoJson.lineStrings[i].features[0].properties.distance = parseFloat(miles.toFixed(2));

    // duration
    var maxTick = geoJson.lineStrings[i].features[0].properties.ticks[geoJson.lineStrings[i].features[0].properties.ticks.length-1];
    geoJson.lineStrings[i].features[0].properties.maxTick = maxTick;

    // pace
    geoJson.lineStrings[i].features[0].properties.pace = Math.floor(maxTick/miles);
  }
};

var calculateBounds = function() {
  var maxLon = geoJson.lineStrings[0].features[0].geometry.coordinates[0][0],
      minLon = geoJson.lineStrings[0].features[0].geometry.coordinates[0][0],
      maxLat = geoJson.lineStrings[0].features[0].geometry.coordinates[0][1],
      minLat = geoJson.lineStrings[0].features[0].geometry.coordinates[0][1];
  for (var i = 0; i < geoJson.lineStrings.length; i++) {
    var coords = geoJson.lineStrings[0].features[0].geometry.coordinates;
    for (var j = 0; j < coords.length; j++) {

    }
  }
};

var processJson = function(cb) {
  convertToUTC();
  calculateTicks();
  groupByStart();
  calculateStats();
  cb();
};

var initJson = function(cb) {
  downloadAndProcess(0, cb);
};