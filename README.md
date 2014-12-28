central-walkgit
============

Overlay of several walking paths through central park.

### convertCoordinates.js
Converts GPX to GeoJSON, calculates time offsets and stats.

### parseAttractions.js
Converts attractions XML from centralparknyc.org to GeoJSON, filters and corrects coordinates, manually adds gates.

### walk.js
Maps paths and attractions on Leaflet map engine. Controls styling and playback of paths.