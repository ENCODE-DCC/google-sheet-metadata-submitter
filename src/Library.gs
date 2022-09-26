const DEBUG = false;
const DEBUG_AUTO_YES = false;
// const DEBUG = true;
// const DEBUG_AUTO_YES = true;


function getType(p) {
    if (Array.isArray(p)) return "array";
    else if (typeof p == "string") return "string";
    else if (typeof p == "number") return "number";
    else if (p != null && typeof p == "object") return "object";
    else return "other";
}

function last(array) {
  return array[array.length - 1];
}

function toBoolean(val) {
  var s = String(val).toLowerCase();
  return ["1", "true", "t", "o"].includes(s);
}

function isArrayString(str) {
  var trimmed = str.trim();
  return trimmed.startsWith("[") && trimmed.endsWith("]");
}

function isJsonString(str) {
  var trimmed = str.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}

function trimTrailingDot(str) {
  return str.replace(/\.$/, "");
}

function trimTrailingSlash(str) {
  return str.replace(/\/+$/, "");
}

function alertBoxOkCancel(prompt) {
  return SpreadsheetApp.getUi().alert(
    prompt, SpreadsheetApp.getUi().ButtonSet.OK_CANCEL
  ) === SpreadsheetApp.getUi().Button.OK;
}

function alertBox(prompt) {
  SpreadsheetApp.getUi().alert(prompt);
}

// https://stackoverflow.com/a/47098533/8819536
function openUrl( url ){
  var html = HtmlService.createHtmlOutput('<html><script>'
  +'window.close = function(){window.setTimeout(function(){google.script.host.close()},9)};'
  +'var a = document.createElement("a"); a.href="'+url+'"; a.target="_blank";'
  +'if(document.createEvent){'
  +'  var event=document.createEvent("MouseEvents");'
  +'  if(navigator.userAgent.toLowerCase().indexOf("firefox")>-1){window.document.body.append(a)}'                          
  +'  event.initEvent("click",true,true); a.dispatchEvent(event);'
  +'}else{ a.click() }'
  +'close();'
  +'</script>'
  // Offer URL as clickable link in case above code fails.
  +'<body style="word-break:break-word;font-family:sans-serif;">Failed to open automatically. <a href="'+url+'" target="_blank" onclick="window.close()">Click here to proceed</a>.</body>'
  +'<script>google.script.host.setHeight(40);google.script.host.setWidth(410)</script>'
  +'</html>')
  .setWidth( 90 ).setHeight( 1 );
  SpreadsheetApp.getUi().showModalDialog( html, "Opening ..." );
}

