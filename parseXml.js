var gates = [
  {
    name: 'Merchants\' Gate',
    description: 'Columbus Circle',
    coordinates: [-73.981032371521,40.76825672305774]
  },
  {
    name: 'Women\'s Gate',
    description: 'Central Park West at West 72nd Street',
    coordinates: [-73.97596836090088,40.77621929333075]
  },
  {
    name: 'Hunters\'s Gate',
    description: 'CPW at West 81st Street',
    coordinates: [-73.97180557250977,40.78206873687405]
  },
  {
    name: 'Mariners\'s Gate',
    description: 'CPW at West 85th Street',
    coordinates: [-73.96974563598633,40.784668324219524]
  },
  {
    name: 'All Saints\'s Gate',
    description: 'CPW at West 97th Street',
    coordinates: [-73.96468162536621,40.79139428421785]
  },
  {
    name: 'Boys\'s Gate',
    description: 'CPW at West 100th Street',
    coordinates: [-73.96248726339071,40.794071110092574]
  },
  {
    name: 'Strangers\'s Gate',
    description: 'CPW at West 106th Street',
    coordinates: [-73.95978927612305,40.79756727106044]
  },
  {
    name: 'Warriors\'s Gate',
    description: 'Central Park North at Adam Clayton Powell Blvd. (7th Avenue)',
    coordinates: [-73.95498275756836,40.79932159415491]
  },
  {
    name: 'Farmers\'s Gate',
    description: 'CPN at Malcolm X Blvd. (Lenox Ave.)',
    coordinates: [-73.95271092653275,40.79838758531546]
  },
  {
    name: 'Pioneers\'s Gate',
    description: 'Duke Ellington/James Frawley Circle at 5th Avenue',
    coordinates: [-73.94970417022705,40.79665760379586]
  },
  {
    name: 'Vanderbilt Gate',
    description: '5th Ave. at East 106th Street',
    coordinates: [-73.95163536071777,40.79357113982765]
  },
  {
    name: 'Girls\'s Gate',
    description: '5th Avenue at East 102nd Street',
    coordinates: [-73.95313123164689,40.79192626129264]
  },
  {
    name: 'Engineers\'s Gate',
    description: '5th Avenue at East 90th Street',
    coordinates: [-73.95901679992676,40.78418090934269]
  },
  {
    name: 'Inventors\'s Gate',
    description: '5th Avenue at East 72nd Street',
    coordinates: [-73.9671277999878,40.772465629092785]
  },
  {
    name: 'Scholars\'s Gate',
    description: '5th Avenue at East 60th Street',
    coordinates: [-73.97262914830858,40.7650559902641]
  },
  {
    name: 'Artists\'s Gate',
    description: 'Central Park South at 6th Avenue',
    coordinates: [-73.97626876831055,40.765884017600165]
  },
  {
    name: 'Artisans\'s Gate',
    description: 'CPS at 7th Avenue',
    coordinates: [-73.9790153503418,40.766859112288344]
  }
];
attractionsObj = [];
attractionsGeoJson = {
  type: 'FeatureCollection',
  features: [ ]
};
featureTypes = [];

var parseAttractionXml = function(cb) {
  $.ajax({
    url: 'map-list.xml',
    dataType: 'xml',
    contentType: "text/xml; charset=\"utf-8\"",
    success: function(response) {
      processAttractionXml(response,cb);
    }
  });
};

var getAttractionCoords = function(node) {
  var lon = parseFloat(node.getElementsByTagName('longitude')[0].firstChild.nodeValue);
  var lat = parseFloat(node.getElementsByTagName('latitude')[0].firstChild.nodeValue);
  lon = (lon > 1) ? (lon * -1) : lon;
  lat = (lat < 1) ? (lat * -1) : lat;
  return [lon,lat];
};

var processAttractionXml = function(doc,cb) {
  var attractionNodes = doc.getElementsByTagName('attraction');
  var attractions = [];
  for (var i = 0; i < attractionNodes.length; i++) {
    var title = attractionNodes[i].getElementsByTagName('title')[0].firstChild.nodeValue;
    var coords = getAttractionCoords(attractionNodes[i]);
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
  toAttractionGeoJson(cb);
};

var toAttractionGeoJson = function(cb) {
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
  }
  for (var j = 0; j < gates.length; j++) {
    attractionsGeoJson.features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: gates[j].coordinates
      },
      properties: {
        name: gates[j].name,
        description: gates[j].description,
        features: ['gate']
      }
    });
  }
  getDistinctFeatureTypes(cb);
};

var getDistinctFeatureTypes = function(cb) {
  for (var i = 0; i < attractionsGeoJson.features.length; i++) {
    var types = attractionsGeoJson.features[i].properties.features;
    for (var j = 0; j < types.length; j++) {
      var exists = false;
      for (var k = 0; k < featureTypes.length; k++) {
        exists = exists || (featureTypes[k] === types[j]);
      }
      if (!exists) featureTypes.push(types[j]);
    }
  }
  if (typeof geoJson !== 'undefined') {
    restrictToBounds(cb);
  } else {
    cb();
  }
};

var isInBounds = function(coord) {
  return coord[0] <= geoJson.bounds.maxLon &&
    coord[0] >= geoJson.bounds.minLon &&
    coord[1] <= geoJson.bounds.maxLat &&
    coord[1] >= geoJson.bounds.minLat;
};

var restrictToBounds = function(cb) {
  var fArray = [];
  for (var i = 0; i < attractionsGeoJson.features.length; i++) {
    if (isInBounds(attractionsGeoJson.features[i].geometry.coordinates))
      fArray.push(attractionsGeoJson.features[i]);
  }
  attractionsGeoJson.features = fArray;
  cb();
};