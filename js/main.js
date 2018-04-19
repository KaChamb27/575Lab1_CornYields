/* Getting the corn yield data into map form using leaflet, ajax, etc.*/

//Step 1: Create Map from tileset.
function createMap(){
    
    //create map using variable
    var mymap = L.map('mapid').setView([39.000, -97.000], 4);
    
    // add base tilelayer from http://leaflet-extras.github.io/leaflet-providers/preview/
    // See Stamen.TonerBackground
    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	subdomains: 'abcd',
	minZoom: 0,
	maxZoom: 20,
	ext: 'png'
    }).addTo(mymap);
    
    //call getData function to get feature data. Go to Step 2.
    getData(mymap);
};

//Build an attributes array from data
function processData(mydata){
    
    //empty array to hold attributes
    var attributes = [];
    //properties of the first feature in the dataset
    var properties = mydata.features[0].properties;
    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with yield values
        if (attribute.indexOf("yr")>-1){
            attributes.push(attribute);
        };
    };
    
    return attributes;
};

//Calculate the radius of each proprotional symbol.
function calcPropRadius(attValue) {
    
    //scale factor to adjust symbol size evenly
    var scaleFactor = 30;
    //area base on attribute value and scale factor
    var area = (attValue-60) * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);
    
    return radius;
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(mymap, attribute){
    
    mymap.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //update the layer style and popup
            var props = layer.feature.properties;
            
            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);
            
            //create popup
            createPopup(props, attribute, layer, radius);
            //create panel
            //createPanel(props, attribute, layer);
        };
    });
};

//Set marker options
var markerOptions = {
    //radius: 10,
    fillColor: "#faf357",
    color: "#ecd12c",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};

//Popup content
function createPopup(properties, attribute, layer, radius){
    
    //add state to popup content string
    var popupContent = "<p><b>State:</b> " + properties.StateName + "</p>";
    
    //add formatted attribute to panel content string
    var year = attribute.split("r")[1];
    popupContent += "<p><b>Avg. Yield in " + year + ":</b>" + properties[attribute] + " bu/ac</p>";
    
    //replace the layer popup
    //layer.bindPopup(popupContent,{
        //offset: new L.Point(0,-radius)
    //});
    //bind popup to circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-markerOptions.radius),
        closeButton: false
    });
    
    //event listners to open popup on hover. Note: does not work on mobile devices that don't support hover.
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        },
    });
};

/*
//Panel content
function createPanel(properties, attribute, layer){
    var year = attribute.split("r")[1];
    //build panel content string
    var panelContent = "<p><b>Year:</b> " + year + "</p>";
    layer.on(panelContent);
}; */
        
//Function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    
    //Step 4: Select attribute to visualize.
    var attribute = attributes[0];
    
    //Step 5: For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);
    
    //Step 6: Give each feature's circle marker a radius based on its attrbribute value
    markerOptions.radius = calcPropRadius(attValue);
    
    //create circle marker layer
    var layer = L.circleMarker(latlng, markerOptions);
    
    //var props = layer.feature.properties;
    //create popup
    createPopup(feature.properties, attribute, layer, markerOptions.radius);

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};



//Step 3: Add circle markers to point features, called in getData.
function createPropSymbols(mydata, mymap, attributes){  
    //create a leaflet geojson layer and add to map.
    L.geoJson(mydata, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes)}
    }).addTo(mymap);
}; 

//Create sequence controls
function createSequenceControls(mymap, attributes){
    
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },
        
        onAdd: function(mymap) {
            //create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');
            
            //move slider into onAdd
            $(container).append('<input class="range-slider" type="range">');
            
            //add skip buttons
            $(container).append('<button class="skip" id="reverse"title="Reverse">Back</button>'); 
            $(container).append('<button class="skip" id="forward"title="Forward">Skip</button>'); 
            
            //replace button content with images
            $('#reverse').html('<img src="img/reversearrow.png">');
            $('#forward').html('<img src="img/forwardarrow.png">');
            
            //kill any mouse event listeners on the map
            $(container).on('mousedown dblclick', function(e){
                L.DomEvent.stopPropagation(e);
            });
            
            //... initialize other dom elements, i.e. listeners.
            
            return container;
        }
    });
    
    mymap.addControl(new SequenceControl());
    
    //create range input element (slider)
    //$('#panel').append('<input class="range-slider" type="range">');
    
    //set slider attributes
    $('.range-slider').attr({
        max: 9,
        min: 0,
        value: 0,
        step: 1
    });
    
    
    
    //click listerner for buttons
    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();
        //increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            //if past the last attribute, wrap around to first attribute
            index = index > 9 ? 0 : index;
            //pass new attribute to update symbols
            updatePropSymbols(mymap, attributes[index]);
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //if past the first attribute, wrap around to last attribute
            index = index < 0 ? 9 : index;
            //pass new attribute to update symbols
            updatePropSymbols(mymap, attributes[index]);
        $('.range-slider').val(index);
        
        };
    });
};


//Menu function
function filterRank(mydata){
    //var geoObject = mydata.features;
    var markers =[];
    markers = mydata.features;
    console.log(markers);

    $('.menu-ui a').on('click', function() {
        console.log("here2");
        // For each filter link, get the 'data-filter' attribute value.
        var filter = $(this).data('filter');
        $(this).addClass('active').siblings().removeClass('active');
        
        markers.setFilter(function(f) {
        // If the data-filter attribute is set to "all", return
        // all (true). Otherwise, filter on markers that have
        // a value set to true based on the filter name.
            return (filter === 'all') ? true : f.properties[filter] === true
        });
    return false;
    });
};


//Create legend
function createLegend(mymap, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function(mymap){
            //create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');
            //Create temporal legend
            $(container).append('<div id="temporal-legend">');
            
            return container;
        }
    });
    mymap.addControl(new LegendControl());
};

//Step 2: Pull data from file.

// Function to retrieve the data and place on map.
function getData(mymap){
    //console.log("in getData, before ajax");
    var mydata;
    
    //load the data
    $.ajax("data/map5.geojson", {
        dataType: "json",
        success: function (response) {
            //create an attributes array
            var attributes = processData(response);
            //set variable for data
            mydata = response;
            //Send to Step 3: Create markers.
            createPropSymbols(mydata, mymap, attributes);
            //Send to sequence/slider controls
            createSequenceControls(mymap, attributes);
            //Filter data
            filterRank(mydata);
            //create legend
            createLegend(mymap, attributes);
        }});
    
};


$(document).ready(createMap);


