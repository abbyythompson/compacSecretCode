
$( document ).ready(function() {

    // ----------------------------------------------------------------------------------------------------------------

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



    // ----------------------------------------------------------------------------------------------------------------

    // Define the red, green and orange pins for representing the proportion of utilisation
    var greenIcon = L.icon({
                    iconUrl: 'icons/green_pin.png',
                    iconSize:     [25, 40], // size of the icon
                    iconAnchor:   [12, 40], // point of the icon which will correspond to marker's location
                });

    var orangeIcon = L.icon({
                    iconUrl: 'icons/orange_pin.png',
                    iconSize:     [25, 40], // size of the icon
                    iconAnchor:   [12, 40], // point of the icon which will correspond to marker's location
                });

    var redIcon = L.icon({
                    iconUrl: 'icons/red_pin.png',
                    iconSize:     [25, 40], // size of the icon
                    iconAnchor:   [12, 40], // point of the icon which will correspond to marker's location
                });

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
//            console.log(pullResults);
            updateMap(pullResults.Items);
        }
    });

    // Function to add pins to map
    function updateMap(packhouses){
        for (item in packhouses){
            packhouse = packhouses[item];

            var util = packhouse["Line 1 Cupfill"];
            if (util < 0.3){
                icon = redIcon;
            } else if (util < 0.5){
                icon = orangeIcon;
            } else {
                icon = greenIcon;
            }
            utilization = Math.round(util * 1000) / 10;

            var list = "<dl><dt>Customer:</dt>"
                       + "<dd>" + packhouse.Customer + "</dd>"
                       + "<dt>Packhouse:</dt>"
                       + "<dd>" + packhouse.Packhouse + "</dd>"
                       + "<dt>Cupfill:</dt>"
                       + "<dd>" + packhouse["Line 1 Cupfill"] + "</dd>"


            if (packhouse.Longitude < 0){
                packhouse.Longitude = packhouse.Longitude + 360;
            }

            var marker = L.marker([packhouse.Latitude, packhouse.Longitude], {icon: icon}).addTo(mymap);
            var popup = L.popup()
                .setLatLng([packhouse.Latitude, packhouse.Longitude])
                .setContent(list)
                .openOn(mymap);

            oms.addMarker(marker);
            oms.addListener('click', function(marker) {
              popup.setContent(marker.desc);
              popup.setLatLng(marker.getLatLng());
              mymap.openPopup(popup);
            });
        }
        mymap.closePopup();
        mymap.panTo(new L.LatLng(5, 190.7633));
    }


    $('#new-page-btn').click(function() {
        console.log(window.location.search );

        var name = $(this).data('username');

        if (customer != undefined && customer != null) {
            current_location = window.location.toString();
            lastIndex = current_location.lastIndexOf('/');
            relative_location = current_location.substr(0, lastIndex);
            console.log(relative_location);
            window.location = relative_location + '/DashboardPage.html?customer=' + customer;
        }
    });


});