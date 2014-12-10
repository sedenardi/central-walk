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

var geoJson = [];

var processXml = function(index,xml) {
  var json = toGeoJSON.gpx(xml);

  var m = moment(json.features[0].properties.time);
  console.log(m);

  geoJson.push(json);


  if (++index < files.length) {
    downloadAndProcess(index);
  } else {
    finish();
  }
};

var downloadAndProcess = function(index) {
  $('#container').prepend('Processing ' + files[index] + '\n');
  $.ajax({
    url: 'gpx/' + files[index],
    dataType: 'xml',
    contentType: "text/xml; charset=\"utf-8\"",
    success: function(response) {
      processXml(index,response);
    }
  });
};

var finish = function() {
  $('#container').html(JSON.stringify(geoJson,null,2));
};

downloadAndProcess(0);