
$( document ).ready(function() {

    // ------------------------------- Set up Leaflet API --------------------------------------------------------------

    // Instantiate the Leaflet maps API - centering around NZ
    var mymap = L.map('map-container', {
        center: [5, 190.7633],
        zoom: 2.5
    });
    mymap.options.minZoom = 1.8;


    // Get the Leaflet maps API - and set the access token
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1IjoiY2hyaXN0aW5hbG91aXNlYmVsbCIsImEiOiJjajRxaTg5NWYwdWhkMzNwbG1zbDl4dzI5In0.jRVieoturPwTTrNscrJNnQ'
    }).addTo(mymap);

    var oms = new OverlappingMarkerSpiderfier(mymap);



    // ---------------------------------Add Legend to map --------------------------------------------------------------

    var legend = L.control({position: 'bottomright'});

    legend.onAdd = function (mymap) {

        var div = L.DomUtil.create('div', 'info legend info-legend'),
        grades = ["Optimum (70-100% cupfill)", "Moderate (40-70% cupfill)", "Poor (0-40% cupfill)"],
        labels = ["icons/green_pin.png", "icons/orange_pin.png", "icons/red_pin.png"];

        div.innerHTML += '<h4 id="legend-title" >Packhouse Utilization:</h3> '

            // loop through our density intervals and generate a label with a colored square for each interval
            for (var i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    grades[i] + (" <img src="+ labels[i] +" height='30' width='20'>") +'<br>';
            }


    return div;
    };
    legend.addTo(mymap);


    // --------------------------------- Set up markers  --------------------------------------------------------------

    // Define the red, green and orange pins for representing the proportion of utilisation
    var greenIcon = L.icon({
                    iconUrl: 'icons/green_pin.png',
                    iconSize:     [25, 40], // size of the icon
                    iconAnchor:   [12, 40], // point of the icon which will correspond to marker's location
                    popupAnchor: [0,-30]
                });

    var orangeIcon = L.icon({
                    iconUrl: 'icons/orange_pin.png',
                    iconSize:     [25, 40], // size of the icon
                    iconAnchor:   [12, 40], // point of the icon which will correspond to marker's location
                    popupAnchor: [0,-30]
                });

    var redIcon = L.icon({
                    iconUrl: 'icons/red_pin.png',
                    iconSize:     [25, 40], // size of the icon
                    iconAnchor:   [12, 40], // point of the icon which will correspond to marker's location
                    popupAnchor: [0,-30]
                });

   // --------------------------------- Make Lambda call to retrieve pack houses ---------------------------------------

    // AWS Lambda call
    AWS.config.region = 'ap-southeast-2'; // Region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'ap-southeast-2:4d0f8a86-6998-44d5-b05b-953269d29426',
    });

    // Create Lambda object
    var lambda = new AWS.Lambda({region: 'ap-southeast-2', apiVersion: '2015-03-31'});

    // create JSON object for parameters for invoking Lambda function
    var pullParams = {
      FunctionName : 'readPackhouseLocations',
      InvocationType : 'RequestResponse',
      LogType : 'None'
    };

    // Create variable to hold data returned by the Lambda function
    var pullResults;

    lambda.invoke(pullParams, function(error, data) {
        if (error) {
            prompt(error);
        } else {
            pullResults = JSON.parse(data.Payload);
            updateMap(pullResults.Items);
        }
    });

    // ---------------------------------Add a pin per pack house to the map --------------------------------------------

    // Function to add pins to map
    function updateMap(packhouses){
        for (item in packhouses){
            packhouse = packhouses[item];

            // If utilisation is over 70 set the pin to be green
            // Otherwise if the utilisation is under 40 set it to be red
            // If it is between 40 - 70 set it to be orange
            var util = packhouse["Line 1 Cupfill"];
            if (util < 40){
                icon = redIcon;
            } else if (util < 70){
                icon = orangeIcon;
            } else {
                icon = greenIcon;
            }
            utilization = Math.round(util * 1000) / 10;

            var list = "<div class='popup-content'> "
                       + "<dl><dt>Customer:</dt>"
                       + "<dd class='popup-customer'>" + packhouse.Customer + "</dd>"
                       + "<dt>Packhouse:</dt>"
                       + "<dd class='popup-packhouse'>" + packhouse.Packhouse + "</dd>"
                       + "<dt>Cupfill:</dt>"
                       + "<dd>" + packhouse["Line 1 Cupfill"] + " %</dd>"
                       + "</div>"

            if (packhouse.Longitude < 0){
                packhouse.Longitude = packhouse.Longitude + 360;
            }

            // Add the marker at the pack house lat and long
            marker = L.marker([packhouse.Latitude, packhouse.Longitude], {icon: icon}).addTo(mymap);

            marker.bindPopup(list);

            // Add the popup to the location
            popup = L.popup()
                .setLatLng(L.latLng(packhouse.Latitude + 150, packhouse.Longitude + 100))
                .setContent(list)
//                .openOn(mymap);

            oms.addMarker(marker);
              popup.setContent(marker.desc);
              popup.setLatLng(L.latLng(packhouse.Latitude + 150, packhouse.Longitude + 100));
            oms.addMarker(marker);

        }
        mymap.closePopup();
        mymap.panTo(new L.LatLng(5, 190.7633));
    }

});