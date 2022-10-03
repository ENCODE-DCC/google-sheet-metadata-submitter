const HELP_TEXT_INDENT = 2;
const EXPORTED_JSON_INDENT = 2;
const HEADER_COMMENTED_PROP_SKIP = "#skip";
const HEADER_COMMENTED_PROP_ERROR = "#error";
const HEADER_PROP_ACCESSION = "accession";
const HEADER_PROP_UUID = "uuid";
const DEFAULT_PROP_PRIORITY = [
  HEADER_COMMENTED_PROP_SKIP, HEADER_COMMENTED_PROP_ERROR,
  HEADER_PROP_ACCESSION, HEADER_PROP_UUID, "aliases", "award", "lab",
];
const PRIORITY_INDENTIFYING_PROP = [HEADER_PROP_ACCESSION, HEADER_PROP_UUID];
const DEFAULT_EXPORTED_JSON_FILE_PREFIX = "encode-metadata-submitter.exported";
const TOOLTIP_FOR_PROP_SKIP = "Dry-run any REST actions (GET/PUT/POST)\n\nIf recent REST action is successful (200 or 201) then it is automatically set as 1 to prevent duplicate submission/retrieval.";
const TOOLTIP_FOR_PROP_ERROR = "Recent REST action + HTTP error code + JSON response\n\n-200: Successful.\n-201: Successfully POSTed.\n-409: Found a conflict when POSTing\n";


function getTooltipForCommentedProp(prop) {
  if (prop === HEADER_COMMENTED_PROP_SKIP) {
    return TOOLTIP_FOR_PROP_SKIP;
  }
  else if(prop === HEADER_COMMENTED_PROP_ERROR) {
    return TOOLTIP_FOR_PROP_ERROR;
  }
}

function getNumMetadataInSheet(sheet) {
  return getLastRow(sheet) - HEADER_ROW;
}

function makeMetadataUrl(method, profileName, endpoint, identifyingVal) {
  switch(method) {
    case "GET":
      return `${endpoint}/${profileName}/${identifyingVal}/?format=json&frame=object`;
    case "PUT":
      return `${endpoint}/${profileName}/${identifyingVal}`;
    case "POST":
      return `${endpoint}/${profileName}`;
    default:
      Logger.log("makeMetadataUrl: Not supported method " + method);      
  }
}

function getMetadataFromPortal(identifyingVal, identifyingProp, profileName, endpoint) {
  var url = makeMetadataUrl("GET", profileName, endpoint, identifyingVal);
  var response = restGet(url);
  var error = response.getResponseCode();

  var object = {
    [HEADER_COMMENTED_PROP_ERROR]: "GET" + "," + error,
    // [HEADER_PROP_GET_URL]: url,
    [HEADER_COMMENTED_PROP_SKIP]: 0,
    [identifyingProp]: identifyingVal
  };

  var responseJson = JSON.parse(response.getContentText());
  if (error === 200) {
    // automatically set #skip as 1 to prevent duplicate GET
    object[HEADER_COMMENTED_PROP_SKIP] = 1;

    // filter out
    // - "nonSubmittable" properties
    // - properties that are not present in the profile
    var profile = getProfile(profileName, endpoint);
    var filteredResponseJson = Object.keys(responseJson)
      .filter((prop) => profile["properties"].hasOwnProperty(prop))
      .filter((prop) => !isNonSubmittableProp(profile, prop))
      .reduce((cur, prop) => { return Object.assign(cur, { [prop]: responseJson[prop] })}, {});

    // then merge it with commented properties
    object = {...object, ...filteredResponseJson};
  }
  else {
    // if error, write helpText to provide debugging information
    object[HEADER_COMMENTED_PROP_ERROR] += "\n" + JSON.stringify(responseJson, null, HELP_TEXT_INDENT);
  }
  return object;
}

function getSortedProps(props, profile, propPriority=DEFAULT_PROP_PRIORITY) {
  // sort metadata's props by given profile and propPriority
  // - props in propPriority come first if exists
  // - and then props under required key in profile come next
  // - all the other commented (#) props come last
  var sortedProps = [];

  // priority props first
  for (var prop of propPriority.concat(profile["required"])) {
    if (props.includes(prop) && !sortedProps.includes(prop)) {
      sortedProps.push(prop);
    }
  }

  // non-commented props
  for (var prop of props) {
    if (!prop.startsWith("#") && !sortedProps.includes(prop)) {
      sortedProps.push(prop);
    }
  }

  // and then commented props
  for (var prop of props) {
    if (prop.startsWith("#") && !sortedProps.includes(prop)) {
      sortedProps.push(prop);
    }
  }
  return sortedProps;
}

function updateSheetWithMetadataFromPortal(sheet, profileName, endpointForGet, endpointForProfile) {
  var profile = getProfile(profileName, endpointForProfile);
  if (!profile) {
    Logger.log(`Couldn't find a profile schema ${profile} for profile name ${profileName}.`)
    return 0;
  }

  var identifyingProp = getIdentifyingPropForProfile(profile);
  if (!identifyingProp) {
    Logger.log(`Could't find identifying property ${identifyingProp} in header row ${HEADER_ROW}.`);
    return -1;
  }
  var identifyingCol = findColumnByHeaderValue(sheet, identifyingProp);

  // also check #skip column exists. if so skip row with #skip===1
  var skipCol = findColumnByHeaderValue(sheet, HEADER_COMMENTED_PROP_SKIP);

  // update each row if has accession value
  var numUpdated = 0;
  for (var row = HEADER_ROW + 1; row <= getLastRow(sheet); row++) {
    var identifyingVal = getCellValue(sheet, row, identifyingCol);
    if (skipCol && toBoolean(getCellValue(sheet, row, skipCol))) {
      continue;
    }
    if (identifyingVal) {
      var metadataObj = getMetadataFromPortal(
        identifyingVal, identifyingProp, profileName, endpointForGet
      );
      var sortedProps = getSortedProps(Object.keys(metadataObj), profile);
      writeJsonToRow(sheet, metadataObj, row, sortedProps);
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
  var identifyingProp = getIdentifyingPropForProfile(profile);

  const numData = getNumMetadataInSheet(sheet);
  var numSubmitted = 0;

  for (var row = HEADER_ROW + 1; row <= numData + HEADER_ROW; row++) {
    var jsonBeforeTypeCast = rowToJson(
      sheet, row, keepCommentedProps=true, bypassGoogleAutoParsing=true
    );

    // if has #skip and it is 1 then skip
    if (jsonBeforeTypeCast.hasOwnProperty(HEADER_COMMENTED_PROP_SKIP)) {
      if (toBoolean(jsonBeforeTypeCast[HEADER_COMMENTED_PROP_SKIP])) {
        continue;
      }
    }

    var json = typeCastJsonValuesByProfile(
      profile, jsonBeforeTypeCast, keepCommentedProps=false
    );

    switch(method) {
      case "PUT":
        var url = makeMetadataUrl(method, profileName, endpointForPut, json[identifyingProp]);
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

    json[HEADER_COMMENTED_PROP_ERROR] = method + "," + error;

    switch(error) {
      case 200:
        json[HEADER_COMMENTED_PROP_SKIP] = 1;
        break;

      case 201:
        var identifyingVal = responseJson["@graph"][0][identifyingProp];
        json[identifyingProp] = identifyingVal;
        json[HEADER_COMMENTED_PROP_ERROR] += "\n" + JSON.stringify(responseJson, null, HELP_TEXT_INDENT);
        json[HEADER_COMMENTED_PROP_SKIP] = 1;
        break;

      default:
        json[HEADER_COMMENTED_PROP_ERROR] += "\n" + JSON.stringify(responseJson, null, HELP_TEXT_INDENT);
        json[HEADER_COMMENTED_PROP_SKIP] = 0;
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
  var sortedProps = getSortedProps(Object.keys(metadataObj), profile);
  addJsonToSheet(sheet, metadataObj, sortedProps);
}
