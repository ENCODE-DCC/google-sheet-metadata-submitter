const ENDPOINT_PRODUCTION = "https://www.encodeproject.org";
const ENDPOINT_TEST = "https://test.encodedcc.org";
const ALL_ENDPOINTS = [ENDPOINT_PRODUCTION, ENDPOINT_TEST];
const DEFAULT_ENDPOINT_READ = ENDPOINT_PRODUCTION;
const DEFAULT_ENDPOINT_WRITE = ENDPOINT_TEST;
const KEY_ENDPOINT_READ = "endpointRead";
const KEY_ENDPOINT_WRITE = "endpointWrite";
const KEY_PROFILE_NAME = "profileName";


function onOpen() {
  // create custom menu
  var menu = SpreadsheetApp.getUi().createMenu("ENCODE");
  menu.addItem("Search", "search");
  menu.addSeparator();
  menu.addItem("Show sheet info", "showSheetInfo");
  menu.addItem("Show legends for header", "showLegendsForHeader");
  menu.addSeparator();
  menu.addItem("Apply profile to sheet", "applyProfileToSheet");
  menu.addItem("Make new template", "makeTemplate");
  menu.addSeparator();
  menu.addItem("GET metadata for all rows", "getMetadataForAll");
  menu.addSeparator();
  menu.addItem("PUT all rows to the portal", "putAll");
  menu.addItem("POST all rows to the portal", "postAll");
  menu.addSeparator();
  menu.addItem("Export to JSON (Google Drive)", "exportToJson");
  menu.addSeparator();
  menu.addItem("Authorize", "authorize");
  menu.addItem("Set endpoint for READ actions", "setEndpointRead");
  menu.addItem("Set endpoint for WRITE actions", "setEndpointWrite");
  menu.addItem("Set profile name", "setProfileName");
  menu.addItem("Open profile page", "openProfilePage");
  menu.addToUi();
}

function checkProfile() {
  if (getProfileName()) {
    return true;
  }
  alertBox(
    "No profile name found.\n" + 
    "Go to the menu 'ENCODE' -> 'Set a profile name' to specify it."
  );
}

function search() {
  if (!checkProfile()) {
    return;
  }

  var sheet = getCurrentSheet();
  var profile = getProfile(getProfileName(), getEndpointRead());

  var url = makeSearchUrl(sheet, profile, getEndpointRead());

  if (url) {
    openUrl(url);
  } else {
    alertBox("Couldn't find Search URL for the selected column's property.");
  }  
}

function openProfilePage() {
  if (!checkProfile()) {
    return;
  }
  
  openUrl(
    makeProfileUrl(getProfileName(), getEndpointRead(), format="page")
  );
}

function showSheetInfo() {
  alertBox(
    "* Sheet information\n\n" +
    `- Endpoint READ (GET, profile): ${getEndpointRead()}\n` +
    `- Endpoint WRITE (PUT, POST): ${getEndpointWrite()}\n` +
    `- Profile name: ${getProfileName()}`
  );
}

function showLegendsForHeader() {
  alertBox(
    "* Color legends for header properties\n\n" +
    `- red: required property\n` +
    `- blue: indentifying property\n` +
    `- black: other editable property\n` +
    `- grey: readonly/non-submittable property\n\n` +
    "* Style legend for header properties\n\n" +
    "- Italic+Bold+Underline: Search is available. Select a cell and go to the menu 'ENCODE' -> 'Search'."
  );
}

function applyProfileToSheet() {
  if (!checkProfile()) {
    return;
  }

  var sheet = getCurrentSheet();
  var profile = getProfile(getProfileName(), getEndpointRead());

  // clear tooltip and dropdown menus
  clearFontColorInSheet(sheet);
  clearNoteInSheet(sheet);
  clearFormatInSheet(sheet);
  clearDataValidationsInSheet(sheet);

  // align all text to TOP to make more readable
  setRangeAlignTop(sheet);

  highlightHeaderAndDataCell(sheet, profile);
}

function makeTemplate() {
  if (!checkProfile()) {
    return;
  }

  var sheet = getCurrentSheet();
  var profile = getProfile(getProfileName(), getEndpointRead());

  addTemplateMetadataToSheet(sheet, profile);

  applyProfileToSheet();
}

function getMetadataForAll() {
  if (!checkProfile()) {
    return;
  }

  var sheet = getCurrentSheet();

  var accessionCol = findColumnByHeaderValue(sheet, HEADER_PROP_ACCESSION);
  if (!accessionCol) {
    alertBox(
      `${HEADER_PROP_ACCESSION} column does not exist in header row ${HEADER_ROW}\n` +
      `Add ${HEADER_PROP_ACCESSION} to the header row and define ${HEADER_PROP_ACCESSION}s below it.`
    );
    return;
  }

  var numUpdated = updateSheetWithMetadataFromPortal(
    sheet, getProfileName(), getEndpointRead(), getEndpointRead()
  );
  alertBox(`Updated ${numUpdated} rows.`);

  applyProfileToSheet();
}

function putAll() {
  if (!checkProfile()) {
    return;
  }

  var sheet = getCurrentSheet();

  var numData = getNumMetadataInSheet(sheet);
  if (numData && !alertBoxOkCancel(
    `Found ${numData} data row(s).\n\n` + 
    "PUT action will REPLACE metadata on the portal with those on the sheet, " +
    "any missing properties on the sheet will be REMOVED from portal's metadata.\n\n" +
    `Are you sure to PUT to ${getEndpointWrite()}?`)) {
    return;
  }

  var numSubmitted = putSheetToPortal(
    sheet, getProfileName(), getEndpointWrite(), getEndpointRead()
  );
  alertBox(`Submitted (PUT) ${numSubmitted} rows to ${getEndpointWrite()}.`);  
}

function postAll() {
  if (!checkProfile()) {
    return;
  }

  var sheet = getCurrentSheet();

  var numData = getNumMetadataInSheet(sheet);
  if (numData && !alertBoxOkCancel(
    `Found ${numData} data row(s).\n\n` +
    "POST action will submit new objects (rows on the sheet) to the portal.\n\n" +
    `Are you sure to POST to ${getEndpointWrite()}?`)) {
    return;
  }

  var numSubmitted = postSheetToPortal(
    sheet, getProfileName(), getEndpointWrite(), getEndpointRead()
  );
  alertBox(`Submitted (POST) ${numSubmitted} rows to ${getEndpointWrite()}.`);  

  applyProfileToSheet();
}

function exportToJson() {
  if (!checkProfile()) {
    return;
  }

  var sheet = getCurrentSheet();
  var jsonFilePath = Browser.inputBox(
    "Enter JSON file path (e.g. metadata-submitter-09-09-1999.json):"
  );

  exportSheetToJsonFile(
    sheet, getProfileName(), getEndpointRead(),
    keepCommentedProps=false,
    jsonFilePath=jsonFilePath,
  );
}

function authorize() {
  if (getUsername() && getPassword()) {
    if (!alertBoxOkCancel(
      "Username and password already exist, are you sure to proceed?")) {
      return;
    }
  }
  
  var username = Browser.inputBox('Enter your username:');
  if (!username) {
    alertBox("Failed to update username.");
    return;
  }
  setUsername(username);

  var password = Browser.inputBox('Enter your password:');
  if (!password) {
    alertBox("Failed to update password.");
    return;
  }
  setPassword(password);
}

function setEndpointRead() {
  var endpoint = Browser.inputBox(
    `Current endpoint for READ actions (GET) and profile schema: ${getEndpointRead()}\\n` +
    `Choices:${ALL_ENDPOINTS.join(", ")}\\n\\n` +
    "Enter a new endpoint:"
  );
  if (endpoint) {
    endpoint = trimTrailingSlash(endpoint);
  }
  if (!ALL_ENDPOINTS.includes(endpoint)) {
    alertBox("Wrong endpoint: " + endpoint);
    return;
  }
  setCurrentSheetMetadata(KEY_ENDPOINT_READ, endpoint);
}

function setEndpointWrite() {
  var endpoint = Browser.inputBox(
    `Current endpoint for Write actions (GET) and profile schema:\\n\\t${getEndpointWrite()}\\n` +
    `Choices:${ALL_ENDPOINTS.join(", ")}\\n\\n` +
    'Enter a new endpoint:'
  );
  if (endpoint) {
    endpoint = trimTrailingSlash(endpoint);
  }
  if (!ALL_ENDPOINTS.includes(endpoint)) {
    alertBox("Wrong endpoint: " + endpoint);
    return;
  }
  setCurrentSheetMetadata(KEY_ENDPOINT_WRITE, endpoint);
}

function setProfileName() {
  var profileName = Browser.inputBox(
    `Current profile name: ${getProfileName()}\\n\\n` +
    "Enter a new profile name. (e.g. experiment, biosample_type):"
  );
  if (!ALL_PROFILES.includes(profileName)) {
    alertBox("Wrong profile: " + profileName);
    return;
  }
  setCurrentSheetMetadata(KEY_PROFILE_NAME, profileName);
}

function getEndpointRead() {
  var endpoint = getCurrentSheetMetadata(KEY_ENDPOINT_READ);
  if (!endpoint) {
    return DEFAULT_ENDPOINT_READ;
  }
  return endpoint;
}

function getEndpointWrite() {
  var endpoint = getCurrentSheetMetadata(KEY_ENDPOINT_WRITE);
  if (!endpoint) {
    return DEFAULT_ENDPOINT_WRITE;
  }
  return endpoint;
}

function getProfileName() {
  return getCurrentSheetMetadata(KEY_PROFILE_NAME);
}

