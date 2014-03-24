var concentric_circle_radii = [11, 45, 69, 94, 115];
var center = [124, 121];
var spacer = 7;
var zbutton_ydistances = [7, 30, 55, 83];
var zcenter = [30, 118];

function runCommand(cmd, silent) {
  // Get some values from elements on the page:
  var $form = $( "#commandForm" );
  cmd += "\n";
  url = silent ? "/command_silent" : "/command"; // $form.attr( "action" );
  // Send the data using post
  var posting = $.post( url, cmd );
  // Put the results in a div
  if(!silent) {
    posting.done(function( data ) {
      $( "#result" ).empty();
      $.each(data.split('\n'), function(index) {
        $( "#result" ).append( this + '<br/>' );
      });
    });
  }
}

function lookupConcentric(radius){
  var length = concentric_circle_radii.length;
  for (i=0;i<=length;i++) {
    if (radius < concentric_circle_radii[i]) return(i);
  }
  return(length);
}

function getQuadrantConcentricFromPosition(x,y) {
  var rel_x = x - center[0]
  var rel_y = y - center[1]
  var radius = Math.sqrt(Math.pow(Math.abs(rel_x),2) + Math.pow(Math.abs(rel_y),2))
  if (rel_x > rel_y && rel_x > -rel_y) {
    quadrant = 0; // Right
  } else if (rel_x <= rel_y && rel_x > -rel_y) {
    quadrant = 3; // Down
  } else if (rel_x > rel_y && rel_x < -rel_y) {
    quadrant = 1; // Up
  } else {
    quadrant = 2; // Left
  }
  var idx = lookupConcentric(radius);
  return [quadrant, idx]
}

function clickXY(event){
  var pos_x = event.offsetX?(event.offsetX):event.pageX-document.getElementById("control_xy").offsetLeft;
  var pos_y = event.offsetY?(event.offsetY):event.pageY-document.getElementById("control_xy").offsetTop;
  var codes = getQuadrantConcentricFromPosition(pos_x,pos_y);
  var quadrant = codes[0], concentric = codes[1];
  if (concentric < 5) { // movement button pressed
    var xdir = [1, 0, -1, 0, 0, 0][quadrant];
    var ydir = [0, 1, 0, -1, 0, 0][quadrant];
    var magnitude = Math.pow(10, concentric - 2);
    if (xdir != 0) {
      command = "G0 X" + (magnitude * xdir) + " F" + document.getElementById("xy_velocity").value;
    } else {
      command = "G0 Y" + (magnitude * ydir) + " F" + document.getElementById("xy_velocity").value;
    }
    runCommand("G91 " + command + " G90", true);

  } else { // home button pressed
    if (pos_x < 49 && pos_y < 49) { // home x button
      command = "G28 X0";
    } else if (pos_x > 200 && pos_y < 49) { //home y button
      command = "G28 Y0";
    } else if (pos_x < 49 && pos_y > 200) { // home all button
      command = "G28";
    } else { // home z button
      command = "G28 Z0";
    }
    runCommand(command, true);
  }
}

function lookupRange(ydist) {
  var length = zbutton_ydistances.length;
  for (i=0;i<length;i++) {
    if (ydist < zbutton_ydistances[i]) return i;
  }
}

function clickZ(event){
  //var pos_x = event.offsetX?(event.offsetX):event.pageX-document.getElementById("control_z").offsetLeft;
  var pos_y = event.offsetY?(event.offsetY):event.pageY-document.getElementById("control_z").offsetTop;
  var ydelta = zcenter[1] - pos_y;
  var range = lookupRange(Math.abs(ydelta));
  var direction = (ydelta > 0)?1:-1;
  if (range < 4) {
    runCommand("G91 G0 Z" + (Math.pow(10,range-2) * direction) + " F" + document.getElementById("z_velocity").value + " G90", true);
  }
}

function extrude(event,a,b) {
  var length = document.getElementById("extrude_length").value;
  var velocity = document.getElementById("extrude_velocity").value;
  var direction = (event.currentTarget.id=='extrude')?1:-1;
  runCommand("G91 G0 E" + (length * direction) + " F" + velocity + " G90", true);
}

function motorsOff(event) {
  runCommand("M18", true);
}

function heatSet(event) {
  var type = (event.currentTarget.id=='heat_set')?104:140;
  var temperature = (type==104)?document.getElementById("heat_value").value:document.getElementById("bed_value").value;
  runCommand("M" + type + " S" + temperature, true);
}

function heatOff(event) {
  var type = (event.currentTarget.id=='heat_off')?104:140;
  runCommand("M" + type + " S0", true);
}
function getTemperature () {
  runCommand("M105", false);
}

function handleFileSelect(evt) {
    var files = evt.target.files; // handleFileSelectist object

    // files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
        output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
            f.size, ' bytes, last modified: ',
            f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
            '</li>');
    }
    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

function upload() {
    $( "#progress" ).empty();
    $( "#uploadresult" ).empty();

    // take the file from the input
    var file = document.getElementById('files').files[0];
    var reader = new FileReader();
    reader.readAsBinaryString(file); // alternatively you can use readAsDataURL
    reader.onloadend  = function(evt)
    {
        // create XHR instance
        xhr = new XMLHttpRequest();

        // send the file through POST
        xhr.open("POST", 'upload', true);
        xhr.setRequestHeader('X-Filename', file.name);

        // make sure we have the sendAsBinary method on all browsers
        XMLHttpRequest.prototype.mySendAsBinary = function(text){
            var data = new ArrayBuffer(text.length);
            var ui8a = new Uint8Array(data, 0);
            for (var i = 0; i < text.length; i++) ui8a[i] = (text.charCodeAt(i) & 0xff);

            if(typeof window.Blob == "function")
            {
                 var blob = new Blob([data]);
            }else{
                 var bb = new (window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder)();
                 bb.append(data);
                 var blob = bb.getBlob();
            }

            this.send(blob);
        }

        // let's track upload progress
        var eventSource = xhr.upload || xhr;
        eventSource.addEventListener("progress", function(e) {
            // get percentage of how much of the current file has been sent
            var position = e.position || e.loaded;
            var total = e.totalSize || e.total;
            var percentage = Math.round((position/total)*100);

            // here you should write your own code how you wish to proces this
            $( "#progress" ).empty().append('uploaded ' + percentage + '%');
        });

        // state change observer - we need to know when and if the file was successfully uploaded
        xhr.onreadystatechange = function()
        {
            if(xhr.readyState == 4)
            {
                if(xhr.status == 200)
                {
                    // process success
                    $( "#uploadresult" ).empty().append( 'Uploaded Ok');
                }else{
                    // process error
                    $( "#uploadresult" ).empty().append( 'Uploaded Failed');
                }
            }
        };

        // start sending
        xhr.mySendAsBinary(evt.target.result);
    };
}
