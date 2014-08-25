var hivePlayerInitialized = false;
var hiveInstalled = false;
var failed_check_browser = "";
$(document).ready( function() {
    $.getScript("//cdnjs.cloudflare.com/ajax/libs/jquery-ajaxtransport-xdomainrequest/1.0.1/jquery.xdomainrequest.min.js", function() {
	$.getScript("//hivewebassets.blob.core.windows.net/player/swfobject_2.2.js", function() {
	    $.getScript("//hivewebassets.blob.core.windows.net/player/Silverlight.js", function() {
		$.getScript("//hivewebassets.blob.core.windows.net/player/hds.js", function() {
		    $('head').append('<link rel="stylesheet" href="//hivewebassets.blob.core.windows.net/player/hive.css" type="text/css" />');
		    $('head').append('<link rel="stylesheet" href="//hivewebassets.blob.core.windows.net/font/hive_font.css" type="text/css" />');
		});
	    });
	});
    });
});

// Check Hive Streaming and Silverlight
function checkHiveInstalled(callback) {
    // Check if we have Hive installed and pass control over to init2
    detectHiveClient(function(state) {
		log("Hive Client State: " + state);
		if (state !== "")
			hiveInstalled = true;
		hivePlayerInitialized = (state === "ready");
		log("Hive installed: " + hiveInstalled + ", hive initialized: " + hivePlayerInitialized);
		if (callback != null)
			callback(state);
	});
}

// Creates a Silverlight player object and starts playing the requested content.
function playSmooth(manifest, elem, index, minVersion) {
    $("#now_playing").html(manifest);
    var ht = Silverlight.createObject(
	window.location.protocol + "//hivewebassets.blob.core.windows.net/player/SmoothStreamingPlayer.xap", // source
	elem.id,
	"slPlugin" + index, // id for generated element
	{
	    width: elem.width() + "px", // Use the width of the parent object
	    height: elem.height() + "px",  // Use the height of the parent object
	    backgroundImage: elem.css("backgroundImage"),
	    autoupgrade: "true",
	    minRuntimeVersion: "5.0.61118.0",
	    enableGPUAcceleration: "true"
	},
	{
	    onError: onSilverlightError,
	    onLoad: silverlightPluginLoaded
	},
	"deliverymethod=adaptivestreaming,autoplay=true,mediaurl=" + manifest,
	"context"
    );
    elem.html(ht);
}

// Hive is not installed - launch installer
function launchHiveInstall(url) {
    window.open(url);
}

// Add a Hive Install button and return the new button element
function addHiveInstallButton(elem, butName) {
    var failed_check_msg = "";
    if(hiveInstalled) {
	elem.append("<div class=\"PlayButton\"><button id=\"" + butName + "\" class=\"PlayButton btn btn-success\"><i class=\"icon-hive-logo\"></i> Install Hive</button></div>");
    } else {
	if(failed_check_browser != "") {
	    failed_check_msg = "<p class='alert alert-warning'>" + failed_check_browser + " cannot detect the Hive Client in SSL mode</p>"
	    elem.append("<div class=\"error\">"+ failed_check_msg +"<button id=\"" + butName + "\" class=\"PlayButton btn btn-success\"><i class=\"icon-hive-logo\"></i> Install Hive</button></div>");
	} else {
	    elem.append("<div class=\"PlayButton\"><button id=\"" + butName + "\" class=\"PlayButton btn btn-success\"><i class=\"icon-hive-logo\"></i> Install Hive</button></div>");
	}
    }
    return $("#" + butName);
}

// Add a custom Play button and return the new button element
function addPlayButton(elem, butName) {
    var pt = elem.attr("data-playlabel");
    elem.append("<div class=\"PlayButton\"><button id=\"" + butName + "\" class=\"PlayButton btn btn-success\"><i class=\"icon-play icon-white\"></i> " + ((pt == undefined) ? "Play" : pt) + " </button></div>");
    return $("#" + butName);
}

// Scan document for hive-player tags and replace contents as appropriate.
function processPlayer() {
    // Process all Hive player elements
    $(".hive-player").each( function(index) {
		var elem = $(this);
		var json = jQuery.parseJSON( elem.attr("data-stream") );

		// Get format and player
		var streamType = (json.streams[0].streamType == undefined) ? "smooth" : json.streams[0].streamType;
		var playerType = (json.streams[0].player == undefined) ? "hds" : json.streams[0].player;

		// Get manifest url and other settings
		var mf = json.streams[0].manifest;
		var useHive = json.streams[0].useHive;
		var minVer = json.streams[0].silverlightMinVersion;
		
		// Create the player
		createPlayerInternal(elem, streamType, playerType, useHive, mf, minVer, index);
    });
}


function createPlayer(elem, streamType, playerType, useHive, mf, minVer, index) {
    if(hivePlayerInitialized) {
		createPlayerInternal(elem, streamType, playerType, useHive, mf, minVer, index);
    } else {
	setTimeout(function() {
	    createPlayerInternal(elem, streamType, playerType, useHive, mf, minVer, index);
	}, 600);
    }
}

function createPlayerInternal(elem, streamType, playerType, useHive, mf, minVer, index0) {
    var index = (index0 !== undefined ? index0 : Math.floor((Math.random()*1000000)+1) );
    var ok = true;
    
    // Set the player background
    var bg = elem.attr("data-background");
    if (bg !== undefined)
      	elem.css({'background-image' : 'url(' + bg + ')',
	          'background-repeat' : 'no-repeat',
	          'background-position' : 'center',
	          'background-size' : 'cover'});
    else
    	elem.css({'background-color': '#000000'});
    
    if (minVer == undefined)
	minVer = "5.0.61118.0";
    
    // Define Hive installation path.
    var installPath = (elem.attr("data-installer")!==undefined) ? elem.attr("data-installer") : "http://install.hivestreaming.com/?show-test-info=1&directory=test";
    
    
    switch (useHive) {
    case false:
        // Direct - use the URL as is
        break;
    default:
        // Play using Hive
        if (hiveInstalled) {
	    if ((mf.search("api-test") >= 0) || (mf.search("customer-callbacks") >= 0) ||
		(mf.search("/v1/") >= 0))
		// Callback URL
		switch (streamType) {
		case "hds":
		    mf = "https://127.0.0.1:8999/hds/manifest.f4m?callback=" + mf;
		    break;
		default:
		    // Smooth is the default
		    mf = "https://127.0.0.1:8999/smoothstream?callback=" + mf;
		    break;
		}
	    else
		// Simple URL
		switch (streamType) {
		case "hds":
		    mf = "https://127.0.0.1:8999/hds/manifest.f4m?url=" + mf;
		    break;
		default:
		    // Smooth is the default
		    mf = "https://127.0.0.1:8999/smoothstream?url=" + mf;
		    break;
		}
        } else {
	    // Hive is not installed.
	    var hBut = addHiveInstallButton(elem, "InstallHive" + index);
	    hBut.click( function() {
                launchHiveInstall(installPath);
	    });
	    ok = false;
        }
        break;
    }
    
    log("Stream=" + mf);
    
    // Add a custom Play button
    if (ok) {
	var but = addPlayButton(elem, "playButton" + index);
	switch(streamType) {
        case "smooth":
	    but.click( function() {
		if (playerType == "silverlight")
		    playSmooth(mf, elem, index, minVer);
		else {
		    log("Calling setUpSwfPlayer for a smooth stream...");
		    setUpSwfPlayer(mf, elem, index, useHive);
		}
	    });
	    break;
        case "hds":
	    but.click( function() {
          	log("Calling setUpSwfPlayer for an hds stream...");
		setUpSwfPlayer(mf, elem, index, useHive);
	    });
	    break;
        default:
	    // Unsupported stream type
	    but.text("Unsupported stream: " + streamType)
	}
    }
}


// Returns either a version number or an empty string if a recent (2013/Q3+) client cannot be found.
function detectHiveClient(callback) {
	log("Detecting if Hive client is installed...");
	if(typeof peertv_state === 'undefined') {
		peertv_state = ""; // to avoid using an undefined var causing expections
	}
	$.support.cors = true;
    $.getJSON('http://127.0.0.1:8899/version.json')
	.done( function(data) {
		log("Received client version: " + data.version + " in state " + data.state);
	    if (callback)
			callback(data.state); // Return the client version
		else error("No callback specified, can't return client JSON data...");
	})

	.fail( function(jqxhr_1, textStatus_1, err_1) {
		log("failed to get client version via json: " + err_1 + ". Using version.js instead");
		if (callback)
  		    callback(peertv_state); // Return back peertv_state parameter, if Hive is not running it will be empty and interpreted correctly by the callback
/*		
    	if(window.location.protocol.indexOf("https") > -1) {
			// try to get over SSL
			var err = textStatus_1 + ", " + err_1;
			error( "1- Request to 'http://127.0.0.1:8899/version.json' is Failed: " + err );
	    	$.getJSON('https://localhost.hivestreaming.com:8900/version.json')
		    .done( function(data) {
		      	if (callback)
		            callback(data.version); // Return the client version
		    })
		    .fail( function(jqxhr_2, textStatus_2, err_2) {
			var err = textStatus_2 + ", " + err_2;
			error( "2- Request to 'https://localhost.hivestreaming.com:8900/version.json' is Failed: " + err );
		    	if (callback) {
			    if(navigator.userAgent.toLowerCase().indexOf("msie") != -1) {
				failed_check_browser = "IE";
			    }else if(navigator.userAgent.toLowerCase().indexOf("chrome") != -1) {
				failed_check_browser = "Chrome";
			    }else if(navigator.userAgent.toLowerCase().indexOf("firefox") != -1) {
				failed_check_browser = "Firefox";
			    }else if(navigator.userAgent.toLowerCase().indexOf("safari") != -1) {
				failed_check_browser = "Safari";
			    }else if(navigator.userAgent.toLowerCase().indexOf("opera") != -1) {
				failed_check_browser = "Opera";
			    }
			    callback(""); // Return an empty string
		    	}
		    });
	    } else {
      	 }*/
	});
}

function onSilverlightError(sender, args) {
    var appSource = "";
    if (sender != null && sender != 0) {
	appSource = sender.getHost().Source;
    }

    var errorType = args.ErrorType;
    var iErrorCode = args.ErrorCode;

    if (errorType == "ImageError" || errorType == "MediaError") {
	return;
    }

    var errMsg = "Unhandled Error in Silverlight Application " + appSource + "\n";

    errMsg += "Code: " + iErrorCode + "    \n";
    errMsg += "Category: " + errorType + "       \n";
    errMsg += "Message: " + args.ErrorMessage + "     \n";

    if (errorType == "ParserError") {
	errMsg += "File: " + args.xamlFile + "     \n";
	errMsg += "Line: " + args.lineNumber + "     \n";
	errMsg += "Position: " + args.charPosition + "     \n";
    }
    else if (errorType == "RuntimeError") {
	if (args.lineNumber != 0) {
	    errMsg += "Line: " + args.lineNumber + "     \n";
	    errMsg += "Position: " + args.charPosition + "     \n";
	}
	errMsg += "MethodName: " + args.methodName + "     \n";
    }
    throw new Error(errMsg);
}

// Gets called when the Silverlight plugin has been loaded
function silverlightPluginLoaded(sender, args) {
}

function log(msg) {
    if(window.console && console.log)
	console.log(msg);
}

function error(msg) {
    if(window.console && console.error)
	console.error(msg);
}
