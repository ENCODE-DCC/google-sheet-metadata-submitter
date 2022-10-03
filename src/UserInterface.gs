const ENDPOINT_PRODUCTION = "https://www.encodeproject.org";
const ENDPOINT_TEST = "https://test.encodedcc.org";
const ALL_ENDPOINTS = [ENDPOINT_PRODUCTION, ENDPOINT_TEST];
const DEFAULT_ENDPOINT_READ = ENDPOINT_PRODUCTION;
const DEFAULT_ENDPOINT_WRITE = ENDPOINT_TEST;
const KEY_ENDPOINT_READ = "endpointRead";
const KEY_ENDPOINT_WRITE = "endpointWrite";
const KEY_PROFILE_NAME = "profileName";
const URL_GITHUB = "https://github.com/encode-DCC/google-sheet-metadata-submitter";


function onOpen() {
  // create custom menu
  var menu = SpreadsheetApp.getUi().createMenu("ENCODE");
  menu.addItem("Search", "search");
  menu.addSeparator();
  menu.addItem("Show sheet/header info", "showSheetAndHeaderInfo");
  menu.addSeparator();
  menu.addItem("Apply profile to sheet", "applyProfileToSheet");
  menu.addItem("Make new template row", "makeTemplate");
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
  menu.addSeparator();
  menu.addItem("Open tool's github page for README", "openToolGithubPage");
  menu.addToUi();
}

function isValidEndpoint(endpoint) {
  return ALL_ENDPOINTS.includes(endpoint);
}

function checkProfile() {
  if (getProfileName()) {
    return true;
  }
  alertBox(
    "No profile name found.\n" + 
    "Go to the menu 'ENCODE' -> 'Set profile name' to define it."
  );
}

function search() {
  if (!checkProfile()) {
    return;
  }

  var sheet = getCurrentSheet();

  var currentRow = sheet.getActiveCell().getRow();
  if (currentRow <= HEADER_ROW) {
    alertBox("Select a non-header data cell and run Search.");
    return;
  }
  var currentCol = sheet.getActiveCell().getColumn();
  if (!currentCol) {
    alertBox("Cannot find a column for the selected cell.");
    return;
  }
  var currentProp = getCellValue(sheet, HEADER_ROW, currentCol);
  var profile = getProfile(getProfileName(), getEndpointRead());
  var url = makeSearchUrlForProp(profile, currentProp, getEndpointRead());

  if (url) {
    var propType = profile["properties"][currentProp]["type"];
    var selectedCellValue = SpreadsheetApp.getActiveSheet().getActiveCell().getValue();

    openSearch(
      url, currentProp, propType, getEndpointRead(), selectedCellValue, getEndpointRead()
    );
  } else {
    alertBox("Couldn't find Search URL for selected column's property.");
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

function openToolGithubPage() {
  openUrl(URL_GITHUB);
}

function showSheetAndHeaderInfo() {
  alertBox(
    "* Sheet information\n" +
    `- Endpoint READ (GET, profile): ${getEndpointRead()}\n` +
    `- Endpoint WRITE (PUT, POST): ${getEndpointWrite()}\n` +
    `- Profile name: ${getProfileName()}\n\n` +
    "* Color legends for header properties\n" +
    "- red: required property\n" +
    "- blue: indentifying property\n" +
    "- black: other editable property\n" +
    "- gray: commented (#) property for debugging\n\n" +
    "* Commented properties (filtered out for REST actions)\n" +
    "- #skip: Set it to 1 to skip any REST actions to the portal.\n" +
    "- #error: For debugging info. REST action + HTTP error code + help text.\n\n" +
    "* Searchable properties\n" +
    "- Italic+Bold+Underline: Select a data cell and go to the menu 'ENCODE' -> 'Search'."
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

  var missingProps = highlightHeaderAndDataCell(sheet, profile);
  if (missingProps.length > 0) {
    alertBox(
      "Some properties are missing in the given profile.\n" +
      "- Possible mismatch between profile and accession?\n\n" +
      "* Current profile: " + getProfileName() + "\n\n" +
      "* Missing properties:\n" + missingProps.join(", ")
    );
  }
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
  var profile = getProfile(getProfileName(), getEndpointRead());
  var identifyingProp = getIdentifyingPropForProfile(profile);

  if (!findColumnByHeaderValue(sheet, identifyingProp)) {
    alertBox(
      `Column for identifying property "${identifyingProp}" does not exist in header row ${HEADER_ROW}\n\n` +
      `Add "${identifyingProp}" to the header row and define it for each data row to retrieve from the portal.\n` +
      `You can also add "${HEADER_COMMENTED_PROP_SKIP}" column and set it to 1 for any row to skip all REST actions for that specific row.`
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
    `You can add ${HEADER_COMMENTED_PROP_SKIP} column and set it to 1 for a row that you want to skip REST actions.\n\n` +
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
    `You can add ${HEADER_COMMENTED_PROP_SKIP} column and set it to 1 for a row that you want to skip REST actions.\n\n` +
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
  
  var username = Browser.inputBox("Enter your username:");
  if (!username || username === "cancel") {
    alertBox("Failed to update username.");
    return;
  }
  setUsername(username);

  var password = Browser.inputBox("Enter your password:");
  if (!password || password === "cancel") {
    alertBox("Failed to update password.");
    return;
  }
  setPassword(password);
}

function setEndpointRead() {
  var endpoint = Browser.inputBox(
    `Current endpoint for READ actions (GET) and profile schema: ${getEndpointRead()}\\n\\n` +
    `Choices:${ALL_ENDPOINTS.join(", ")}\\n\\n` +
    "Enter a new endpoint:"
  );
  if (endpoint) {
    endpoint = trimTrailingSlash(endpoint);
  }
  if (!isValidEndpoint(endpoint)) {
    if (endpoint !== "cancel") {
      alertBox("Wrong endpoint: " + endpoint);
    }
    return;
  }
  setCurrentSheetMetadata(KEY_ENDPOINT_READ, endpoint);
}

function setEndpointWrite() {
  var endpoint = Browser.inputBox(
    `Current endpoint for Write actions (GET) and profile schema:\\n${getEndpointWrite()}\\n\\n` +
    `Choices:${ALL_ENDPOINTS.join(", ")}\\n\\n` +
    'Enter a new endpoint:'
  );
  if (endpoint) {
    endpoint = trimTrailingSlash(endpoint);
  }
  if (!isValidEndpoint(endpoint)) {
    if (endpoint !== "cancel") {
      alertBox("Wrong endpoint: " + endpoint);
    }
    return;
  }
  setCurrentSheetMetadata(KEY_ENDPOINT_WRITE, endpoint);
}

function setProfileName() {
  var profileName = Browser.inputBox(
    `* Current profile name: ${getProfileName()}\\n\\n` +
    "Snakecase (with _) or capitalized CamelCase are allowed for a profile name\\n" +
    "(e.g. Experiment, BiosampleType, biosample_type, ):\\n\\n" +
    "Enter a new profile name:"
  );
  if (!isValidProfileName(profileName)) {
    if (profileName !== "cancel") {
      alertBox("Wrong profile: " + profileName);
    }
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
