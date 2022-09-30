const PROPERTY_USERNAME = "username";
const PROPERTY_PASSWORD = "password";


function getUsername() {
  var userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty(PROPERTY_USERNAME);
}

function setUsername(username) {
  var userProperties = PropertiesService.getUserProperties();
  return userProperties.setProperty(PROPERTY_USERNAME, username);
}

function getPassword() {
  var userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty(PROPERTY_PASSWORD);
}

function setPassword(password) {
  var userProperties = PropertiesService.getUserProperties();
  return userProperties.setProperty(PROPERTY_PASSWORD, password);
}

function makeAuthHeaders(username, password) {
  return {"Authorization" : "Basic " + Utilities.base64Encode(username + ":" + password)};
}

function restGet(url) {
  var params = {"method" : "GET", "contentType": "application/json", "muteHttpExceptions": true};
  var username = getUsername();
  var password = getPassword();
  if (username && password) {
    params["headers"] = makeAuthHeaders(username, password);
  }
  return UrlFetchApp.fetch(url, params);
}

function restPut(url, payloadJson, method="PUT") {
  var params = {"method" : method, "contentType": "application/json", "muteHttpExceptions": true};
  var username = getUsername();
  var password = getPassword();
  if (username && password) {
    params["headers"] = makeAuthHeaders(username, password);
  }
  params["payload"] = JSON.stringify(payloadJson);
  return UrlFetchApp.fetch(url, params);
}

function restPost(url, payloadJson) {
  return restPut(url, payloadJson, method="POST");
}
