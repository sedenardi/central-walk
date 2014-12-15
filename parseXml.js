attractionsObj = [];
attractionsGeoJson = {
  type: 'FeatureCollection',
  features: [ ]
};

var parseXml = function(cb) {
  $.ajax({
    url: 'map-list.xml',
    dataType: 'xml',
    contentType: "text/xml; charset=\"utf-8\"",
    success: function(response) {
      processXml(response,cb);
    }
  });
};

var getCoords = function(node) {
  var lon = parseFloat(node.getElementsByTagName('longitude')[0].firstChild.nodeValue);
  var lat = parseFloat(node.getElementsByTagName('latitude')[0].firstChild.nodeValue);
  lon = (lon > 1) ? (lon * -1) : lon;
  lat = (lat < 1) ? (lat * -1) : lat;
  return [lon,lat]
};

var processXml = function(doc,cb) {
  var attractionNodes = doc.getElementsByTagName('attraction');
  var attractions = [];
  for (var i = 0; i < attractionNodes.length; i++) {
    var title = attractionNodes[i].getElementsByTagName('title')[0].firstChild.nodeValue;
    var coords = getCoords(attractionNodes[i]);
    var description = attractionNodes[i].getElementsByTagName('description')[0].firstChild.nodeValue;
    var link = attractionNodes[i].getElementsByTagName('link')[0].firstChild.nodeValue;
    var featureNodes = attractionNodes[i].getElementsByTagName('feature');
    var features = [];
    for (var j = 0; j < featureNodes.length; j++) {
      features.push(featureNodes[j].firstChild.nodeValue);
    }
    if (coords[0] !== 0) {
      attractionsObj.push({
        title: title,
        coordinates: coords,
        description: description,
        link: link,
        features: features 
      });
    }
  }
  toGeoJson(cb);
};

var toGeoJson = function(cb) {
  for (var i = 0; i < attractionsObj.length; i++) {
    attractionsGeoJson.features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: attractionsObj[i].coordinates
      },
      properties: {
        name: attractionsObj[i].title,
        description: attractionsObj[i].description,
        link: attractionsObj[i].link,
        features: attractionsObj[i].features
      }
    });
    console.log(attractionsObj[i].coordinates[0] + ',' +
      attractionsObj[i].coordinates[1]);
  }
  cb();
};