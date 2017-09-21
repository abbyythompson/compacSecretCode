
$( document ).ready(function() {


  // AWS Lambda call
  AWS.config.region = 'ap-southeast-2'; // Region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'ap-southeast-2:4d0f8a86-6998-44d5-b05b-953269d29426',
  });

  // Create Lambda object
  var lambda = new AWS.Lambda({region: 'ap-southeast-2', apiVersion: '2015-03-31'});

  // create JSON object for parameters for invoking Lambda function
  var pullParams = {
    FunctionName : 'dynamodb-write',
    InvocationType : 'RequestResponse',
    LogType : 'None'
  };

  // Create variable to hold data returned by the Lambda function
  var currentData;
  var packhouses = [];
  var commodities = [];
  var defects = [];

  var packhouse1_Data = [];
  var packhouse2_Data = [];
  var packhouse3_Data = [];
  var packhouse1_Name;
  var packhouse2_Name;
  var packhouse3_Name;
  var caret_down = "\t▼";
  var fruitDate;

  var selectedFruitVariety;

  var isPercentageData = true;
  var yAxisLabel = "Percentage of Fruit of each grade";

  var isFirstGraph = true;


  lambda.invoke(pullParams, function(error, data) {
    if (error) {
      prompt(error);
    } else {
      currentData = JSON.parse(data.Payload);
      getPackhouses_getClasses();
      setUp();
      fillinDropdowns();
      // reload the graph with results from the dynamoDB lambda function call
      sortData();
    }
  });

  function getPackhouses_getClasses(){
    for (var i = 0; i < currentData.Items.length; i++) {
      var currentItem = currentData.Items[i];

      var packhouse = currentItem.payload.Data.PackRun.Packhouse;
      if (packhouses.indexOf(packhouse) == -1){
        if (packhouse != null) {
         packhouses.push(packhouse);
       }
      }

      var fruitVariety = currentItem.payload.Data.PackRun.FruitVariety;
      if (commodities.indexOf(fruitVariety) == -1){
         commodities.push(fruitVariety);
      }
    }
  }

  function setUpDefects() {
    defects = [];

    for (var i = 0; i < currentData.Items.length; i++) {
      var currentItem = currentData.Items[i];

      var currentfruitVariety = currentItem.payload.Data.PackRun.FruitVariety;

      if (currentfruitVariety == selectedFruitVariety) {

        var currentDefects = currentItem.payload.Data.Defects;

        for (var j = 0; j < currentDefects.length; j++) {
          if (defects.indexOf(currentDefects[j]) == -1){
            defects.push(currentDefects[j]);
          }
        }
      }
    }
  }

  function setUp(){
    monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December" ];

    // set the end date of the date picker to be the current date
    var today = new Date();
    var dd = today.getDate();
    if (dd < 10){
        dd = "0" + dd;
    }
    var mm =  monthNames[today.getMonth()];
    var yyyy = today.getFullYear();
    var end = dd+' '+mm+' '+yyyy;
    $('#endDate').val(end);

    // set the start date of the date picker to be a week ago by default
    var oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate()-7);
    var dd = oneWeekAgo.getDate();
    var mm = monthNames[oneWeekAgo.getMonth()];
    var yyyy = oneWeekAgo.getFullYear();
    var start = dd+' '+mm+' '+yyyy;
    $('#startDate').val(start);

    startDateArray = $('#startDate').val().split(" ");
    endDateArray = $('#endDate').val().split(" ");



    selectedFruitVariety = commodities[0];
    $(".title-row h2").html("Defects in " + selectedFruitVariety);


    packhouse1_Name = packhouses[0];
    packhouse2_Name = packhouses[1];
    packhouse3_Name = packhouses[2];

    // put in function
    $(".btn-packhouse1:first-child").text(packhouse1_Name + caret_down);
    $(".btn-packhouse1:first-child").val(packhouse1_Name + caret_down);

    $(".btn-packhouse2:first-child").text(packhouse2_Name + caret_down);
    $(".btn-packhouse2:first-child").val(packhouse2_Name + caret_down);

    $(".btn-packhouse3:first-child").text(packhouse3_Name + caret_down);
    $(".btn-packhouse3:first-child").val(packhouse3_Name + caret_down);

    $(".btn-commodity-filter:first-child").text(selectedFruitVariety);
    $(".btn-commodity-filter:first-child").val(selectedFruitVariety);
  }

  function sortData(){
    setUpDefects();

    //initialise the packhouse data arrays
    packhouse1_Data = new Array(defects.length+1).join('0').split('').map(parseFloat);
    packhouse2_Data = new Array(defects.length+1).join('0').split('').map(parseFloat);
    packhouse3_Data = new Array(defects.length+1).join('0').split('').map(parseFloat);

    for (var i = 0; i < currentData.Items.length; i++) {
      var currentItem = currentData.Items[i];

      var fruitVariety = currentItem.payload.Data.PackRun.FruitVariety;
      var packhouse = currentItem.payload.Data.PackRun.Packhouse;
      var defect = currentItem.payload.Data.Defects[0];
      var fruitDate = currentItem.payload.Data.PackRun.StartTime;



      dateStr = fruitDate.split("T");
      dateArr = dateStr[0].split("-");
      yy = parseInt(dateArr[0]);
      mm = parseInt(dateArr[1]);
      dd = parseInt(dateArr[2]);


      if (withinDate(dd, mm, dd) && (selectedFruitVariety == fruitVariety)){

        if (packhouse == packhouse1_Name) {
          currTally = packhouse1_Data;
        } else if (packhouse == packhouse2_Name) {
          currTally = packhouse2_Data;
        } else if (packhouse == packhouse3_Name) {
          currTally = packhouse3_Data;
        } else {
          currTally = null;
        }

        if ((currTally != null) && (defects.length != 0)) {
          for (var j = 0; j < defects.length; j++) {
            if(defects[j] == defect){
              currTally[j] = currTally[j] + 1;
            }
          }
        }
      }
     }

     if (isPercentageData){
       makePercentage([packhouse1_Data, packhouse2_Data, packhouse3_Data]);
     }

     drawGraph();
  }

  function makePercentage(packhouses){
    for (var z = 0; z < packhouses.length; z++) {
      var currTally = packhouses[z];
      sum = 0;

      for (var y = 0; y < currTally.length; y++) {
        sum = currTally[y] + sum;
      }

      for (var x = 0; x < currTally.length; x++) {
        currTally[x] = (currTally[x] / sum) * 100 ;
      }
    }
  }

  // Toggling the percentaged data toggle, when flipping the toggle.
  $('#percentageToggle').change(function(){
    isPercentageData = !isPercentageData;
    if (isPercentageData) {
      yAxisLabel = "Percentage of Fruit with Defect";
    } else {
      yAxisLabel = "Tally of Fruit with each Defect";
    }
    sortData();
  });


  function drawGraph(){
    // Bar chart
    if (!isFirstGraph){
      myChart.destroy();
    }
    isFirstGraph = false;
    myChart = new Chart($(".myChart"), {
        maintainAspectRatio: true,
        responsive: true,
        type: 'bar',
        data: {
          labels: defects,
          datasets: [
            {
                label: packhouse1_Name,
                data: packhouse1_Data,
                backgroundColor: 'rgba(120, 181, 67, 0.8)',
                pointColor: 'rgba(68, 83, 91, 1)',
                highlightFill: '#fff',
            },
            {
                label: packhouse2_Name,
                data: packhouse2_Data,
                backgroundColor: 'rgba(68, 83, 91, 1)',
                pointColor: 'rgba(68, 83, 91, 1)',
                highlightFill: '#fff',
            },
            {
                label: packhouse3_Name,
                data: packhouse3_Data,
                backgroundColor: 'rgba(28, 160, 255, 0.8)',
                pointColor: 'rgba(68, 83, 91, 1)',
                highlightFill: '#fff',
            }
           ]
        },
        options: {
          legend: { display: false },
          title: {
            display: true,
            fontSize: 25,
          },
          scales : {
              xAxes : [ {
                  gridLines : {
                      display : false
                  },
                  scaleLabel : {
                      fontSize: 25,
                      display : true,
                      labelString : 'The types of defect for the fruit'
                  },
                  ticks: {
                    fontSize: 15
                  }
              } ],
              yAxes : [ {
                  scaleLabel : {
                      fontSize: 25,
                      display : true,
                      labelString : yAxisLabel
                  },
                  ticks: {
                    fontSize: 15
                  }
              } ]
          }
        }
    });
  }

  function fillinDropdowns(){
    $('#packhouse1Filter').empty();
    $('#packhouse2Filter').empty();
    $('#packhouse3Filter').empty();
    $('#gradeCommodity').empty();


    var packhouse1Filter = document.getElementById("packhouse1Filter");
          for (var iP1 = 0; iP1 < packhouses.length; iP1++){
              var currentPackhouse = packhouses[iP1];

              if (currentPackhouse != packhouse1_Name) {
                if (currentPackhouse != packhouse2_Name) {
                  if (currentPackhouse != packhouse3_Name) {
                    var li = document.createElement("li");
                    var link = document.createElement("a");
                    var text = document.createTextNode(currentPackhouse);
                    link.appendChild(text);
                    link.href = "#";
                    li.appendChild(link);
                    packhouse1Filter.appendChild(li);
                  }
                }
              }
          }

    var packhouse2Filter = document.getElementById("packhouse2Filter");
          for (var iP2 = 0; iP2 < packhouses.length; iP2++){

              var currentPackhouse = packhouses[iP2];

              if (currentPackhouse != packhouse1_Name) {
                if (currentPackhouse != packhouse2_Name) {
                  if (currentPackhouse != packhouse3_Name) {
                    var li = document.createElement("li");
                    var link = document.createElement("a");
                    var text = document.createTextNode(currentPackhouse);
                    link.appendChild(text);
                    link.href = "#";
                    li.appendChild(link);
                    packhouse2Filter.appendChild(li);
                  }
                }
              }

          }

      var packhouse3Filter = document.getElementById("packhouse3Filter");
            for (var iP3 = 0; iP3 < packhouses.length; iP3++){

                var currentPackhouse = packhouses[iP3];

                if (currentPackhouse != packhouse1_Name) {
                  if (currentPackhouse != packhouse2_Name) {
                    if (currentPackhouse != packhouse3_Name) {
                      var li = document.createElement("li");
                      var link = document.createElement("a");
                      var text = document.createTextNode(currentPackhouse);
                      link.appendChild(text);
                      link.href = "#";
                      li.appendChild(link);
                      packhouse3Filter.appendChild(li);
                    }
                  }
                }
            }

      var gradeCommodity = document.getElementById("gradeCommodity");
            for (var iC = 0; iC < commodities.length; iC++){

                var currentCommodity = commodities[iC];

                if (currentCommodity != selectedFruitVariety) {
                    var li = document.createElement("li");
                    var link = document.createElement("a");
                    var text = document.createTextNode(currentCommodity);
                    link.appendChild(text);
                    link.href = "#";
                    li.appendChild(link);
                    gradeCommodity.appendChild(li);
                }
            }
  }

  // Dropdown on click functions
  $("#packhouse1Filter").on('click', 'li a', function(){
    $(".btn-packhouse1:first-child").text($(this).text()  + caret_down);
    $(".btn-packhouse1:first-child").val($(this).text()  + caret_down);
    packhouse1_Name = $(this).text();
    fillinDropdowns();
    sortData();
  });

  $("#packhouse2Filter").on('click', 'li a', function(){
    $(".btn-packhouse2:first-child").text($(this).text() + caret_down);
    $(".btn-packhouse2:first-child").val($(this).text() + caret_down);
    packhouse2_Name = $(this).text();
    fillinDropdowns();
    sortData();
  });

  $("#packhouse3Filter").on('click', 'li a', function(){
    $(".btn-packhouse3:first-child").text($(this).text() + caret_down);
    $(".btn-packhouse3:first-child").val($(this).text() + caret_down);
    packhouse3_Name = $(this).text();
    fillinDropdowns();
    sortData();
  });

  $("#gradeCommodity").on('click', 'li a', function(){
    $(".btn-commodity-filter:first-child").text($(this).text());
    $(".btn-commodity-filter:first-child").val($(this).text());
    $(".title-row h2").html("Defects in " + $(this).text());
    selectedFruitVariety = $(this).text();
    fillinDropdowns();
    sortData();
  });

  $('.input-daterange').datepicker({
      format: 'dd MM yyyy'
  }).on("change", function (e) {
      sortData();
  });

  function withinDate(d, m, y) {

      startDateArray = $('#startDate').val().split(" ");
      endDateArray = $('#endDate').val().split(" ");

      var startDay = parseInt(startDateArray[0]);
      var startMonth2 = monthNames.indexOf(startDateArray[1]) + 1;
      if (startMonth2 < 10){
          startMonth2 = "0" + startMonth2;
      }
      var startMonth = parseInt(startMonth2);
      var startYear = parseInt(startDateArray[2]);

      var endDay = parseInt(endDateArray[0]);
      var endMonth2 = monthNames.indexOf(endDateArray[1]) + 1;
      if (endMonth2 < 10){
          endMonth2 = "0" + endMonth2;
      }
      var endMonth = parseInt(endMonth2);
      var endYear = parseInt(endDateArray[2]);

      var d1 = [startMonth, startDay, startYear];
      var d2 = [endMonth, endDay, endYear];
      var c = [m, d, y];

      var from = new Date(d1);  // -1 because months are from 0 to 11
      var to   = new Date(d2);
      var check = new Date(c);

      return(check >= from && check <= to);
  }

});
