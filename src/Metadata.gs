const HELP_TEXT_INDENT = 2;
const EXPORTED_JSON_INDENT = 2;
const HEADER_PROP_SKIP = "#skip";
const HEADER_PROP_METHOD = "#method";
const HEADER_PROP_ERROR = "#error";
const HEADER_PROP_HELP_TEXT = "#helpText";
const HEADER_PROP_GET_URL = "#getUrl";
const HEADER_PROP_ACCESSION = "accession";
const DEFAULT_PROP_PRIORITY = [
  HEADER_PROP_SKIP, HEADER_PROP_METHOD, HEADER_PROP_ERROR, HEADER_PROP_HELP_TEXT,
  HEADER_PROP_GET_URL, HEADER_PROP_ACCESSION, "aliases", "uuid", "award", "lab"
];
const DEFAULT_EXPORTED_JSON_FILE_PREFIX = "encode-metadata-submitter.exported";
const TOOLTIP_FOR_PROP_SKIP = "Skip (Dry-run) all actions (GET/PUT/POST) communicating with portal if set as 1.\n\nIf recent REST action is successful (200 or 201) then it is automatically set as 1 to prevent duplicate submission/retrieval.";
const TOOLTIP_FOR_PROP_METHOD = "Recent REST action.\n\n-GET: retrieve data from the portal.\n-PUT: replace portal's metadata with sheet.\n-POST: submit new metadata to the portal.";
const TOOLTIP_FOR_PROP_ERROR = "HTTP response error code\n\n-200: Successful.\n-201: Successfully POSTed.\n-409: Found a conflict when POSTing\n";
const TOOLTIP_FOR_PROP_HELP_TEXT = "JSON response from the portal.";
const TOOLTIP_FOR_PROP_GET_URL = "URL to get the metadata.";


function getTooltipForCommentedProp(prop) {
  if (prop === HEADER_PROP_SKIP) {
    return TOOLTIP_FOR_PROP_SKIP;
  }
  if (prop === HEADER_PROP_METHOD) {
    return TOOLTIP_FOR_PROP_METHOD;
  }
  else if(prop === HEADER_PROP_ERROR) {
    return TOOLTIP_FOR_PROP_ERROR;
  }
  else if(prop === HEADER_PROP_HELP_TEXT) {
    return TOOLTIP_FOR_PROP_HELP_TEXT;
  }
  else if(prop === HEADER_PROP_GET_URL) {
    return TOOLTIP_FOR_PROP_GET_URL;
  }  
}

function getNumMetadataInSheet(sheet) {
  return getLastRow(sheet) - HEADER_ROW;
}

function makeMetadataUrl(method, profileName, endpoint, accession) {
  switch(method) {
    case "GET":
      return `${endpoint}/${profileName}/${accession}/?format=json&frame=edit`;
    case "PUT":
      return `${endpoint}/${profileName}/${accession}`;
    case "POST":
      return `${endpoint}/${profileName}`;
    default:
      Logger.log("makeMetadataUrl: Not supported method " + method);      
  }
}

function getMetadataFromPortal(accession, profileName, endpoint) {
  var url = makeMetadataUrl("GET", profileName, endpoint, accession);
  var response = restGet(url);
  var error = response.getResponseCode();

  var object = {
    [HEADER_PROP_METHOD]: "GET",
    [HEADER_PROP_ERROR]: error,
    [HEADER_PROP_GET_URL]: url,
    [HEADER_PROP_SKIP]: 1
  };

  var responseJson = JSON.parse(response.getContentText());
  if (error === 200) {
    // if no error, merge parsed JSON to row object
    object[HEADER_PROP_HELP_TEXT] = "Successful";
    object = {...object, ...responseJson};
  }
  else {
    // if error, write helpText to provide debugging information
    object[HEADER_PROP_HELP_TEXT] = JSON.stringify(responseJson, null, HELP_TEXT_INDENT);
  }
  return object;
}

function sortMetadataObject(obj, profile, propPriority=DEFAULT_PROP_PRIORITY) {
  // sort metadata objects by given profile and propPriority
  // - props in propPriority come first if exists
  // - and then props under required key in profile come next
  // - all the other commented (#) props come last
  var props = Object.keys(obj);
  var sortedObj = {};

  // priority props first
  for (var prop of propPriority.concat(profile["required"])) {
    if (props.includes(prop)) {
      sortedObj[prop] = obj[prop];
    }
  }
  // non-commented props
  for (var prop of props) {
    if (prop.startsWith("#")) {
      continue;
    }
    if (!Object.keys(sortedObj).includes(prop)) {
      sortedObj[prop] = obj[prop];
    }
  }
  // commented props
  for (var prop of props) {
    if (!prop.startsWith("#")) {
      continue;
    }
    sortedObj[prop] = obj[prop];
  }
  return sortedObj;
}

function parseAccessionFromPostResponse(responseJson) {
  return responseJson["@graph"][0][HEADER_PROP_ACCESSION];
}

function updateSheetWithMetadataFromPortal(sheet, profileName, endpointForGet, endpointForProfile) {
  // returns number of metadata updated

  var accessionCol = findColumnByHeaderValue(sheet, HEADER_PROP_ACCESSION);
  if (!accessionCol) {
    Logger.log(`Could't find ${HEADER_PROP_ACCESSION} in header row ${HEADER_ROW}.`);
    return 0;
  }
  // also check #skip column exists. if so skip row with #skip===1
  var skipCol = findColumnByHeaderValue(sheet, HEADER_PROP_SKIP);

  var profile = getProfile(profileName, endpointForProfile);
  if (!profile) {
    Logger.log(`Couldn't find a profile schema ${profile} for profile name ${profileName}.`)
    return 0;
  }

  // update each row if has accession value
  var numUpdated = 0;
  for (var row = HEADER_ROW + 1; row <= getLastRow(sheet); row++) {
    var accession = getCellValue(sheet, row, accessionCol);
    if (skipCol && toBoolean(getCellValue(sheet, row, skipCol))) {
      continue;
    }
    if (accession) {
      var metadataObj = getMetadataFromPortal(accession, profileName, endpointForGet);
      var sortedmetadataObj = sortMetadataObject(metadataObj, profile);
      writeJsonToRow(sheet, sortedmetadataObj, row);
      numUpdated++;
    }
  }
  return numUpdated;
}

function exportSheetToJsonFile(sheet, profileName, endpointForProfile, keepCommentedProps, jsonFilePath) {
  var profile = getProfile(profileName, endpointForProfile);

  var result = [];
  for (var row = HEADER_ROW + 1; row <= getLastRow(sheet); row++) {
    var jsonBeforeTypeCast = rowToJson(
      sheet, row, keepCommentedProps=false, bypassGoogleAutoParsing=true
    );
    var json = typeCastJsonValuesByProfile(profile, jsonBeforeTypeCast);
    result.push(json);
  }
  DriveApp.createFile(jsonFilePath, JSON.stringify(result, null, EXPORTED_JSON_INDENT));
}

function putSheetToPortal(sheet, profileName, endpointForPut, endpointForProfile, method="PUT") {
  // returns actual number of submitted rows
  var profile = getProfile(profileName, endpointForProfile);

  const numData = getNumMetadataInSheet(sheet);
  var numSubmitted = 0;

  for (var row = HEADER_ROW + 1; row <= numData + HEADER_ROW; row++) {
    var jsonBeforeTypeCast = rowToJson(
      sheet, row, keepCommentedProps=true, bypassGoogleAutoParsing=true
    );

    // if has #skip and it is 1 then skip
    if (jsonBeforeTypeCast.hasOwnProperty(HEADER_PROP_SKIP)) {
      if (toBoolean(jsonBeforeTypeCast[HEADER_PROP_SKIP])) {
        continue;
      }
    }

    var json = typeCastJsonValuesByProfile(
      profile, jsonBeforeTypeCast, keepCommentedProps=false
    );

    switch(method) {
      case "PUT":
        var url = makeMetadataUrl(method, profileName, endpointForPut, json[HEADER_PROP_ACCESSION]);
        var response = restPut(url, payloadJson=json);
        break;

      case "POST":
        var url = makeMetadataUrl(method, profileName, endpointForPut);
        var response = restPost(url, payloadJson=json);
        break;

      default:
        Logger.log("putSheetToPortal: Wrong REST method " + method);
        continue;
    }

    var error = response.getResponseCode();
    var responseJson = JSON.parse(response.getContentText());

    json[HEADER_PROP_METHOD] = method;
    json[HEADER_PROP_ERROR] = error;

    switch(error) {
      case 200:
        json[HEADER_PROP_GET_URL] = makeMetadataUrl("GET", profileName, endpointForPut, json[HEADER_PROP_ACCESSION]);
        json[HEADER_PROP_HELP_TEXT] = "Successful";
        json[HEADER_PROP_SKIP] = 1;
        break;

      case 201:
        var accession = parseAccessionFromPostResponse(responseJson);
        json[HEADER_PROP_ACCESSION] = accession;
        json[HEADER_PROP_GET_URL] = makeMetadataUrl("GET", profileName, endpointForPut, accession);
        json[HEADER_PROP_HELP_TEXT] = JSON.stringify(responseJson, null, HELP_TEXT_INDENT);
        json[HEADER_PROP_SKIP] = 1;
        break;

      default:
        json[HEADER_PROP_HELP_TEXT] = JSON.stringify(responseJson, null, HELP_TEXT_INDENT);
        json[HEADER_PROP_SKIP] = 0;
    }

    // rewrite data, with commented headers such as error and text, on the sheet
    writeJsonToRow(sheet, json, row);
    numSubmitted++;
  }
  return numSubmitted;
}

function postSheetToPortal(sheet, profileName, endpointForPost, endpointForProfile) {
  // returns actual number of submitted rows
  return putSheetToPortal(sheet, profileName, endpointForPost, endpointForProfile, method="POST");
}

function addTemplateMetadataToSheet(sheet, profile) {
  var metadataObj = makeTemplateMetadataObjectFromProfile(profile);
  var sortedObj = sortMetadataObject(metadataObj, profile);
  addJsonToSheet(sheet, sortedObj);
}

