/**
 * Created by uthornbl on 2013-11-08.
 */

var player = null;
var currentTime = 0;
var totalBufferingTime = 0;
var lastBufferingStart = 0;
var proxyClientUrl = "http://127.0.0.1:8999/";
var callNo = 0;

function onCurrentTimeChange(time, playerId) {
    log("onCurrentTimeChange " + time);
    currentTime = time;
}

function onInterval() {
    log("onInterval");
    document.getElementById("debug").innerHTML = player.getCurrentTime() + " " + player.getBufferLength() + " " + totalBufferingTime;
    if (player.getCurrentTime() > 0 && proxyClientUrl != undefined)
        sendToProxy(player.getCurrentTime());
}

function onBufferEvent(a, b) {
}

function onBuffering(a, b) {
    log("onBuffering " + a + "/" + b);
    if (a) {
        lastBufferingStart = (new Date().getTime());
    } else
        totalBufferingTime += (new Date().getTime()) - lastBufferingStart;
}


function onJSBridge(playerId) {
    callNo++;
    log("onJSBridge call " + callNo);
    if (player == null) {
        log("Bridge created for player " + playerId);
        player = document.getElementById(playerId);
        if (!player)
            alert("Player not found");
        player.setVolume(0);
        player.addEventListener("currentTimeChange", "onCurrentTimeChange");
        player.addEventListener("durationChange", "onDurationChange");
        player.addEventListener("bufferTimeChange", "onBufferEvent");
        player.addEventListener("bufferingChange", "onBuffering");
        setInterval(function () { onInterval() }, 4000);
    }
}

function setUpSwfPlayer(manifestUrl, divContainer, index, useHive) {
    // Remove draggable features - on some browsers they will otherwise block access to player controls.
    $("#now_playing").html(manifestUrl);
    log("Setting up HDS player...");
    if (divContainer.data('draggable')) {
        divContainer.draggable('destroy');
    }
    // Create a StrobeMediaPlayback configuration
    var jscb = (useHive) ? "onJSBridge" : "";
    var flashVars =
    {
        src: manifestUrl
      , javascriptCallbackFunction: jscb
      , controlBarAutoHide: "true"
      , autoPlay: "true"
      , plugin_AdaptiveStreamingPlugin: window.location.protocol + "//hivestreaming3.azurewebsites.net/store/MSAdaptiveStreamingPlugin-v1.0.3-osmf2.0.swf"
      , AdaptiveStreamingPlugin_retryLive: "true"
      , AdaptiveStreamingPlugin_retryInterval: "10"
    };

    var playerWidth = divContainer.css("width");
    var playerHeight = divContainer.css("height");
    var elemName = "strobeMediaPlayback" + index;
    var parameters = {
        allowscriptaccess: "always"
      , allowFullScreen: "true"
      , wmode: "direct"
      , verbose: "true"
    };

    // Generate a name for the div element within the container
    // var playerName = divContainer.attr('id') + "_player";
    var playerName = elemName;
    divContainer.html("<div id=\"" + playerName + "\"></div>")

    var attributes = { name: playerName };

    // Embed the player SWF:
    swfobject.embedSWF
    (window.location.protocol + "//hivewebassets.blob.core.windows.net/player/StrobeMediaPlayback.swf"
    , playerName
    , playerWidth
    , playerHeight
    , "10.1.0"
    , {}
    , flashVars
    , parameters
    , attributes
    );
    log("HDS player setup finished.");
}

function sendToProxy(time) {
    log("Proxy send: " + proxyClientUrl + " >>> " + time);
    var bufferCurrent = Math.floor(player.getBufferLength() * 1000);
    var timeCurrent = Math.floor(time * 1000)
    jQuery.support.cors = true;
    ajaxSend(proxyClientUrl + "stats?playing-point=" + timeCurrent + "&bufferLen=" + bufferCurrent + "&total-buffering=" + totalBufferingTime);
}

function ajaxSend(url) {
    //alert(url)
    if ($.browser.msie) {
        log("Using MSIE");
        var xmlhttp;
        if (window.XDomainRequest) { xmlhttp = new XDomainRequest(); }
        else if (window.XMLHttpRequest) { xmlhttp = new XMLHttpRequest(); }
        else { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP"); }

        xmlhttp.open("GET", url, false);
        xmlhttp.send();
        xmlhttp.onload = function () {
            document.getElementById("debug2").innerHTML = "success "
        };
        xmlhttp.onerror = function () {
            document.getElementById("debug2").innerHTML = "error "
        };
    } else {
        // your ajax request here
        document.getElementById("debug2").innerHTML = " ajax ";
        $.ajax({
            url: url,
            crossDomain: true,
            dataType: "script",
            success: function (data, textStatus) {
            },
            error: function (req, textStatus, errorThrown) {
                error("Ajax request failed! [" + url + "] " + textStatus);
            }
        });
    }
}

