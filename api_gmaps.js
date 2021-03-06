/* phpTrackme
 *
 * Copyright(C) 2013 Bartek Fabiszewski (www.fabiszewski.net)
 *
 * This is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Library General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Library General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 */

// google maps
var map;
var polies = new Array();
var markers = new Array();
var popups = new Array();
var polyOptions;
var mapOptions;
var loadedAPI = 'gmaps';
function init() {
  google.maps.visualRefresh = true;
  polyOptions = {
    strokeColor: '#FF0000',
    strokeOpacity: 1.0,
    strokeWeight: 2
  }
  mapOptions = {
    center: new google.maps.LatLng(init_latitude,init_longitude),
    zoom: 8,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    scaleControl: true
  };
  map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
}

function displayTrack(xml,update) {
  altitudes.length = 0;
  var totalMeters = 0;
  var totalSeconds = 0;
  // init polyline
  var poly = new google.maps.Polyline(polyOptions);
  poly.setMap(map);
  var path = poly.getPath();
  var latlngbounds = new google.maps.LatLngBounds( );
  var positions = xml.getElementsByTagName('position');
  var posLen = positions.length;
  for (var i=0; i<posLen; i++) {
    var p = parsePosition(positions[i]);
    totalMeters += p.distance;
    totalSeconds += p.seconds;
    p['totalMeters'] = totalMeters;
    p['totalSeconds'] = totalSeconds;
    p['coordinates'] = new google.maps.LatLng(p.latitude,p.longitude);
    // set marker
    setMarker(p,i,posLen);
    // update polyline
    path.push(p.coordinates);
    latlngbounds.extend(p.coordinates);
    // save altitudes for chart
    altitudes[i] = p.altitude;
  }
  if (update) {
    map.fitBounds(latlngbounds);
    if (i==1) {
      // only one point, zoom out
      zListener =
          google.maps.event.addListenerOnce(map, 'bounds_changed', function(event) {
              if (this.getZoom()){
                  this.setZoom(15);
              }
      });
      setTimeout(function(){google.maps.event.removeListener(zListener)}, 2000);
    }
  }
  latestTime = p.dateoccured;
  polies.push(poly);

  updateSummary(p.dateoccured,totalMeters,totalSeconds);
  if (p.tid!=trackid) {
    trackid=p.tid;
    setTrack(trackid);
  }
  if (document.getElementById('bottom').style.display=='block') {
    // update altitudes chart
    chart.clearChart();
    displayChart();
  }
}

function clearMap() {
  if (polies){
    for (var i=0; i<polies.length; i++){
      polies[i].setMap(null);
    }
  }
  if (markers){
    for (var i=0; i<markers.length; i++){
      google.maps.event.removeListener(popups[i].listener);
      popups[i].setMap(null);
      markers[i].setMap(null);
    }
  }
  markers.length = 0;
  polies.length = 0;
  popups.lentgth = 0;
}

var popup;
function setMarker(p,i,posLen) {
  // marker
  var marker = new google.maps.Marker( {
    map: map,
    position: p.coordinates,
    title: p.dateoccured
  });
  if (latest==1) { marker.setIcon('//maps.google.com/mapfiles/dd-end.png') }
  else if (i==0) { marker.setIcon('//maps.google.com/mapfiles/marker_greenA.png') }
  else if (i==posLen-1) { marker.setIcon('//maps.google.com/mapfiles/markerB.png') }
  else { marker.setIcon('//maps.gstatic.com/mapfiles/ridefinder-images/mm_20_gray.png') }
  // popup
  var content = '<div id="popup">'+
    '<div id="pheader">'+lang_user+': '+p.username.toUpperCase()+'<br />'+lang_track+': '+p.trackname.toUpperCase()+
    '</div>'+
    '<div id="pbody">'+
    ((p.comments != null)?'<div id="pcomments">'+p.comments+'</div>':'')+
    '<div id="pleft"><b>'+lang_time+':</b> '+p.dateoccured+'<br />'+
    ((p.speed != null)?'<b>'+lang_speed+':</b> '+(p.speed.toKmH()*factor_kmh)+' '+unit_kmh+'<br />':'')+
    ((p.altitude != null)?'<b>'+lang_altitude+':</b> '+(p.altitude*factor_m).toFixed()+' '+unit_m+'<br />':'')+'</div>'+
    ((latest==0)?
    ('<div id="pright"><b>'+lang_ttime+':</b> '+p.totalSeconds.toHMS()+'<br />'+
    '<b>'+lang_aspeed+':</b> '+((p.totalSeconds>0)?((p.totalMeters/p.totalSeconds).toKmH()*factor_kmh).toFixed():0)+' '+unit_kmh+'<br />'+
    '<b>'+lang_tdistance+':</b> '+(p.totalMeters.toKm()*factor_km).toFixed(2)+' '+unit_km+'<br />'+'</div>'):'')+
    '<div id="pfooter">'+lang_point+' '+(i+1)+' '+lang_of+' '+(posLen)+'</div>'+
    '</div></div>';
  popup = new google.maps.InfoWindow();
  popup.listener = google.maps.event.addListener(marker, 'click', (function(marker,content) {
    return function() {
      popup.setContent(content);
      popup.open(map, marker);
      if (document.getElementById('bottom').style.display=='block') {
        chart.setSelection([{row:i,column:null}]);
      }
    }
  })(marker,content));
  markers.push(marker);
  popups.push(popup);
}

function addChartEvent(chart) {
  google.visualization.events.addListener(chart, 'select', function() {
    if (popup) {popup.close(); clearTimeout(altTimeout);}
    var selection = chart.getSelection()[0];
    if (selection) {
      var id = selection.row;
      var icon = markers[id].getIcon();
      markers[id].setIcon('//maps.google.com/mapfiles/marker_orange.png');
      altTimeout = setTimeout(function() { markers[id].setIcon(icon); },2000);
    }
  });
}
//((52.20105108685229, 20.789387865580238), (52.292069558807135, 21.172192736185707))
function getBounds() {
  var b =  map.getBounds().toString();
  var bounds = b.split(',',4);
  var lat_sw = bounds[0].replace(/\(/g,'');
  var lon_sw = bounds[1].replace(/[ )]/g,'');
  var lat_ne = bounds[2].replace(/[ (]/g,'');
  var lon_ne = bounds[3].replace(/[ )]/g,'');
  return [lon_sw,lat_sw,lon_ne,lat_ne];
}

function zoomToBounds(b) {
  var sw = new google.maps.LatLng(b[1],b[0]);
  var ne = new google.maps.LatLng(b[3],b[2]);
  var bounds = new google.maps.LatLngBounds(sw,ne);
  map.fitBounds(bounds);
}
