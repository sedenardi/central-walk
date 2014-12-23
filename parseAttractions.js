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

var filterFeatures = [
  'arches-and-bridges', 
  'fountain-monument-sculpture', 
  'landscapes-points-of-interest', 
  'recreation', 
  'playground', 
  'refreshments', 
  'gate'
];
var processAttractionXml = function(doc,cb) {
  var attractionNodes = doc.getElementsByTagName('attraction');

  var attractions = _.map(attractionNodes, function(v,i) {
    var title = v.getElementsByTagName('title')[0].firstChild.nodeValue.trim();
    var coords = getAttractionCoords(v);
    var description = v.getElementsByTagName('description')[0].firstChild.nodeValue.trim();
    var link = v.getElementsByTagName('link')[0].firstChild.nodeValue;
    var featureNodes = v.getElementsByTagName('feature');

    var features = _.map(featureNodes, function(w,j) {
      return w.firstChild.nodeValue;
    });

    features = _.filter(features, function(v,i) {
      return _.contains(filterFeatures,v);
    });

    return {
      title: title,
      coordinates: coords,
      description: description,
      link: link,
      features: features
    };
  });

  attractionsObj = _.filter(attractions, function(v,i) {
    return v.coordinates[0] !== 0 &&
      v.features.length > 0;
  });

  toAttractionGeoJson(cb);
};

var toAttractionGeoJson = function(cb) {
  attractionsGeoJson.features = _.map(attractionsObj, function(v,i) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: v.coordinates
      },
      properties: {
        name: v.title,
        description: v.description,
        link: v.link,
        features: v.features
      }
    };
  }).concat(_.map(gates, function(v,i) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: v.coordinates
      },
      properties: {
        name: v.name,
        description: v.description,
        link: 'http://www.nytimes.com/1999/12/03/nyregion/central-park-entrances-in-a-return-to-the-past.html',
        features: ['gate']
      }
    };
  }));
  restrictToBounds(cb);
};

var isInBounds = function(coord) {
  return coord[0] <= geoJson.bounds.maxLon &&
    coord[0] >= geoJson.bounds.minLon &&
    coord[1] <= geoJson.bounds.maxLat &&
    coord[1] >= geoJson.bounds.minLat;
};

var restrictToBounds = function(cb) {
  attractionsGeoJson.features = _.filter(attractionsGeoJson.features, function(v,i) {
    return isInBounds(v.geometry.coordinates);
  });
  manualFilter(cb);
};

var excludeArray = [
  'Gill Rustic Bridge', 
  'Bow Bridge', 
  'The Lake', 
  'Bicycle Rental', 
  'Loeb Boathouse Refreshments', 
  'Loeb Boathouse', 
  'Trefoil Arch', 
  'Hans Christian Andersen',
  'Pilgrim Hill', 
  'The Pilgrim'
];
var manualFilter = function(cb) {
  attractionsGeoJson.features = _.filter(attractionsGeoJson.features, function(v,i) {
    return !_.contains(excludeArray, v.properties.name);
  });
  getDistinctFeatureTypes(cb);
};

var getDistinctFeatureTypes = function(cb) {
  featureTypes = _.uniq(_.reduce(attractionsGeoJson.features, function(m,n) {
    return m.concat(n.properties.features);
  }, []));
  mapFeatures(cb);
};

var featureMap = {
  'arches-and-bridges': function() { return 'bridge'; },
  'fountain-monument-sculpture': function(feature) {
    if (feature.properties.name.toLowerCase().indexOf('fountain') !== -1)
      return 'fountain';
    return 'monument';
  },
  'landscapes-points-of-interest': function(feature) { 
    if (feature.properties.name.toLowerCase().indexOf('bethesda') !== -1)
      return 'fountain';
    if (feature.properties.name.toLowerCase().indexOf('zoo') !== -1)
      return 'zoo';
    if (feature.properties.name.toLowerCase().indexOf('dairy') !== -1 ||
      feature.properties.name.toLowerCase().indexOf('cop cot') !== -1)
      return 'pavilion';
    return 'landscape'; 
  },
  'refreshments': function() { return 'restaurant'; },
  'recreation': function() { return 'recreation'; },
  'playground': function() { return 'playground'; },
  'gate': function() { return 'gate'; },
};
var mapFeatures = function(cb) {
  _.each(attractionsGeoJson.features, function(v,i) {
    v.properties.type = featureMap[v.properties.features[0]](v);
    delete v.properties.features;
  });
  cb();
};

var loadAttractions = function(cb) {
  $.ajax({
    url: 'coordinates.json',
    dataType: 'json',
    success: function(geoRes) {
      geoJson = geoRes;
      parseAttractionXml(cb);
    }
  });
};