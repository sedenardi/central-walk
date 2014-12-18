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
  maxTick: 0
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
    return _.last(v.features[0].properties.ticks);
  });
  geoJson.maxTick = _.last(maxObj.features[0].properties.ticks);
};

var groupByStart = function() {
  var averageLats = _.map(geoJson.lineStrings, function(v,i) {
    return (_.first(v.features[0].geometry.coordinates)[1] +
      _.last(v.features[0].geometry.coordinates)[1]) /2;
  });

  var averageLat = _.reduce(averageLats, function(m,n) {
    return m + n;
  }) / averageLats.length;

  _.each(geoJson.lineStrings, function(v,i) {
    v.features[0].properties.start =
      _.first(v.features[0].geometry.coordinates)[1] < averageLat ? 'south' : 'north';
  });
};

var calculateStats = function() {
  _.each(geoJson.lineStrings, function(v,i) {
    var len = 0;
    var coords = v.features[0].geometry.coordinates;
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
    v.features[0].properties.pathLength = len; // in meters

    // distance
    var miles = v.features[0].properties.pathLength * 0.000621371;
    v.features[0].properties.distance = parseFloat(miles.toFixed(2));

    // duration
    var maxTick = v.features[0].properties.ticks[geoJson.lineStrings[i].features[0].properties.ticks.length-1];
    v.features[0].properties.maxTick = maxTick;

    // pace
    v.features[0].properties.pace = Math.floor(maxTick/miles);
  });
};

var calculateBounds = function() {
  var lons = _.reduce(geoJson.lineStrings, function(m,n) {
    return m.concat(_.map(n.features[0].geometry.coordinates, function(w,j) {
      return w[0];
    }));
  }, []);
  var lats = _.reduce(geoJson.lineStrings, function(m,n) {
    return m.concat(_.map(n.features[0].geometry.coordinates, function(w,j) {
      return w[1];
    }));
  }, []);
  geoJson.bounds = {
    maxLon: _.max(lons),
    minLon: _.min(lons),
    maxLat: _.max(lats),
    minLat: _.min(lats)
  };
};

var processJson = function(cb) {
  convertToUTC();
  calculateTicks();
  groupByStart();
  calculateStats();
  calculateBounds();
  cb();
};

var initJson = function(cb) {
  downloadAndProcess(0, cb);
};