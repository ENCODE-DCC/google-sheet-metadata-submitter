/*
ALL_PROFILES from https://www.encodeproject.org/profiles/?format=json
Schema version 36 (snapshotted at 09/21/2022)
*/

const ALL_PROFILES = [
  "award",
  "document",
  "lab",
  "library",
  "organism",
  "platform",
  "publication",
  "software",
  "software_version",
  "source",
  "treatment",
  "access_key_admin",
  "analysis",
  "quality_standard",
  "antibody_lot",
  "biosample",
  "biosample_type",
  "cart",
  "antibody_characterization",
  "biosample_characterization",
  "donor_characterization",
  "genetic_modification_characterization",
  "aggregate_series",
  "annotation",
  "collection_series",
  "computational_model",
  "differential_accessibility_series",
  "differentiation_series",
  "disease_series",
  "experiment_series",
  "functional_characterization_series",
  "gene_silencing_series",
  "matched_set",
  "multiomics_series",
  "organism_development_series",
  "project",
  "publication_data",
  "pulse_chase_time_series",
  "reference",
  "reference_epigenome",
  "replication_timing_series",
  "single_cell_rna_series",
  "single_cell_unit",
  "treatment_concentration_series",
  "treatment_time_series",
  "ucsc_browser_composite",
  "fly_donor",
  "human_donor",
  "manatee_donor",
  "mouse_donor",
  "worm_donor",
  "experiment",
  "replicate",
  "file",
  "functional_characterization_experiment",
  "gene",
  "genetic_modification",
  "image",
  "page",
  "analysis_step",
  "analysis_step_run",
  "analysis_step_version",
  "pipeline",
  "atac_alignment_enrichment_quality_metric",
  "atac_alignment_quality_metric",
  "atac_library_complexity_quality_metric",
  "atac_peak_enrichment_quality_metric",
  "atac_replication_quality_metric",
  "bismark_quality_metric",
  "bpnet_quality_metric",
  "bru_library_quality_metric",
  "chia_pet_alignment_quality_metric",
  "chia_pet_chr_interactions_quality_metric",
  "chia_pet_peak_enrichment_quality_metric",
  "chip_alignment_enrichment_quality_metric",
  "chip_alignment_samstat_quality_metric",
  "chip_library_quality_metric",
  "chip_peak_enrichment_quality_metric",
  "chip_replication_quality_metric",
  "chipseq_filter_quality_metric",
  "complexity_xcorr_quality_metric",
  "correlation_quality_metric",
  "cpg_correlation_quality_metric",
  "dnase_alignment_quality_metric",
  "dnase_footprinting_quality_metric",
  "duplicates_quality_metric",
  "edwbamstats_quality_metric",
  "filtering_quality_metric",
  "gembs_alignment_quality_metric",
  "gencode_category_quality_metric",
  "gene_quantification_quality_metric",
  "gene_type_quantification_quality_metric",
  "generic_quality_metric",
  "hic_quality_metric",
  "histone_chipseq_quality_metric",
  "hotspot_quality_metric",
  "idr_quality_metric",
  "idr_summary_quality_metric",
  "long_read_rna_mapping_quality_metric",
  "long_read_rna_quantification_quality_metric",
  "mad_quality_metric",
  "micro_rna_mapping_quality_metric",
  "micro_rna_quantification_quality_metric",
  "samtools_flagstats_quality_metric",
  "samtools_stats_quality_metric",
  "sc_atac_alignment_quality_metric",
  "sc_atac_analysis_quality_metric",
  "sc_atac_counts_summary_quality_metric",
  "sc_atac_library_complexity_quality_metric",
  "sc_atac_multiplet_quality_metric",
  "sc_atac_read_quality_metric",
  "scrna_seq_counts_summary_quality_metric",
  "segway_quality_metric",
  "star_quality_metric",
  "star_solo_quality_metric",
  "trimming_quality_metric",
  "rna_expression",
  "target",
  "transgenic_enhancer_experiment",
  "user"
];
const COLOR_PROP_DEFAULT = "black";
const COLOR_PROP_REQUIRED = "red";
const COLOR_PROP_INDENTIFYING = "blue";
const COLOR_PROP_READONLY = "gray";
const COLOR_PROP_NON_SUBMITTABLE = "gray";
const FORMAT_SEARCHABLE_PROP = "bold,italic,underline";
const SELECTED_PROP_KEYS_FOR_TOOLTIP = ["title", "description", "comment", "type", "enum"];
const DEFAULT_BASE_TEMPLATE = {
  [HEADER_PROP_SKIP]: null,
  [HEADER_PROP_METHOD]: null,
  [HEADER_PROP_ERROR]: null,
  [HEADER_PROP_HELP_TEXT]: null,
  [HEADER_PROP_GET_URL]: null
};

function makeProfileUrl(profileName, endpoint, format="json") {
  switch(format) {
    case "json":
      return `${endpoint}/profiles/${profileName}?format=json`;
    default:
      return `${endpoint}/profiles/${profileName}`;
  }  
}

function isSearchableProp(profile, prop) {
  var propInProfile = profile["properties"][prop];
  // if linkTo (single object) or items.linkTo (array) exists
  // then it's searchable
  return propInProfile.hasOwnProperty("linkTo") ||
    propInProfile.hasOwnProperty("items") && propInProfile["items"].hasOwnProperty("linkTo");
}

function makeSearchUrlForProp(profile, prop, endpoint) {
  if (!isSearchableProp(profile, prop)) {
    return;
  }

  var propInProfile = profile["properties"][prop];
  var linkTo = propInProfile.hasOwnProperty("linkTo") ?
    propInProfile["linkTo"] : propInProfile["items"]["linkTo"];

  return `${endpoint}/search/?type=${linkTo}`
}

function makeSearchUrl(sheet, profile, endpoint) {
  // make search URL from the current column of the current sheet
  // find current cell and its header value  
  var currentCol = SpreadsheetApp.getActiveSheet().getActiveCell().getColumn();
  if (!currentCol) {
    Logger.log("Cannot find column for a selected cell.");
    return;
  }
  var currentColHeaderValue = getCellValue(sheet, HEADER_ROW, currentCol);
  return makeSearchUrlForProp(profile, currentColHeaderValue, endpoint);
}

function isRequiredProp(profile, prop) {
  return profile["required"].includes(prop);
}

function isIdentifyingProp(profile, prop) {
  return profile["identifyingProperties"].includes(prop);
}

function isReadonlyProp(profile, prop) {
  var propInProfile = profile["properties"][prop];
  return propInProfile.hasOwnProperty("readonly") && propInProfile["readonly"];
}

function isNonSubmittableProp(profile, prop) {
  var propInProfile = profile["properties"][prop];
  return propInProfile.hasOwnProperty("notSubmittable") && propInProfile["notSubmittable"];
}

function isNonEditableProp(profile, prop) {
  return isReadonlyProp(profile, prop) || isNonSubmittableProp(profile, prop);
}

function hasDoNotSubmitInPropComment(profile, prop) {
  var propInProfile = profile["properties"][prop];
  return propInProfile.hasOwnProperty("comment") &&
    propInProfile["comment"].toLowerCase().startsWith("do not submit.");
}

function getColorForProp(profile, prop) {
  if (isRequiredProp(profile, prop)) {
    return COLOR_PROP_REQUIRED;
  }
  if (isIdentifyingProp(profile, prop)) {
    return COLOR_PROP_INDENTIFYING;
  }
  if (isReadonlyProp(profile, prop)) {
    return COLOR_PROP_READONLY;
  }
  if (isNonSubmittableProp(profile, prop)) {
    return COLOR_PROP_NON_SUBMITTABLE;
  }
  return COLOR_PROP_DEFAULT;
}

function getDefaultForProp(profile, prop) {
  var propInProfile = profile["properties"][prop];
  if (propInProfile && propInProfile.hasOwnProperty("default")) {
    return propInProfile["default"];
  }
  // returns null if default does not exist
  return null;
}

function getProfile(profileName, endpoint) {
  var url = makeProfileUrl(profileName, endpoint);
  var response = restGet(url);
  return JSON.parse(response.getContentText());
}

function typeCastValueByProfile(profile, prop, val) {
  // correct types for metadata submission according to types defined in profile
  var propInProfile = profile["properties"][prop];
  if (propInProfile && propInProfile["type"] == "string" && getType(val) == "number") {
    return val.toString();
  }
  return val;
}

function typeCastJsonValuesByProfile(profile, json, keepCommentedProps) {
  var result = {};
  for (var prop of Object.keys(json)) {
    if (prop.startsWith("#") && !keepCommentedProps) {
      Logger.log("typeCastJsonValuesByProfile: startsWith #: " + prop + " " + keepCommentedProps);
      continue;
    }
    result[prop] = typeCastValueByProfile(profile, prop, json[prop]);
  }
  return result;
}

function makeTooltipForProp(profile, prop) {
  var propInProfile = profile["properties"][prop];

  var tooltip = isSearchableProp(profile, prop) ?
    "SEARCH AVAILABLE\n\nSelect any cell in this column and then go to menu 'ENCODE' - 'Search'\n\n" : "";

  // tooltip += JSON.stringify(
  //   SELECTED_PROP_KEYS_FOR_TOOLTIP
  //   .filter(key => propInProfile.hasOwnProperty(key))
  //   .reduce((obj, key) => {
  //     return {...obj, [key]: propInProfile[key]};
  //   }, {}),
  //   null, HELP_TEXT_INDENT
  // );
  tooltip += SELECTED_PROP_KEYS_FOR_TOOLTIP
    .filter(key => propInProfile.hasOwnProperty(key))
    .map(key => {return `${key}: ${propInProfile[key]}`})
    .join('\n\n');

  return tooltip;
}

function setColorAndTooltipForHeaderProp(sheet, profile, prop, col) {
  if (prop === "") {
    return;
  }

  var tooltip = prop.startsWith("#") ? 
    getTooltipForCommentedProp(prop) : makeTooltipForProp(profile, prop);

  setCellTooltip(sheet, HEADER_ROW, col, tooltip);

  if (!prop.startsWith("#")) {
    setCellColor(sheet, HEADER_ROW, col, getColorForProp(profile, prop));
    
    if (isSearchableProp(profile, prop)) {
      setCellFormat(sheet, HEADER_ROW, col, FORMAT_SEARCHABLE_PROP);
    }
  }
}

function addDropdownMenuToDataCell(sheet, profile, prop, col) {
  if (prop === "" || prop.startsWith("#")) {
    return;
  }

  var propInProfile = profile["properties"][prop];
  if (propInProfile === undefined) {
    Logger.log(`Property ${prop} does not exist in profile ${profile["title"]}. Wrong profile?`);
    return;
  }
  
  if (!propInProfile.hasOwnProperty("enum")) {
    return;
  }

  var enums = propInProfile["enum"];
  var lastRow = getLastRow(sheet);
  var range = getRange(sheet, HEADER_ROW + 1, col, lastRow - HEADER_ROW, 1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(enums).build();  
  range.setDataValidation(rule);
}

function highlightHeaderAndDataCell(sheet, profile) {
  var currentHeaderProps = getCellValuesInRow(sheet, HEADER_ROW);

  for (var [i, prop] of currentHeaderProps.entries()) {
    var col = i + 1;
    setColorAndTooltipForHeaderProp(sheet, profile, prop, col);
    addDropdownMenuToDataCell(sheet, profile, prop, col);
  }
}

function makeTemplateMetadataObjectFromProfile(profile, template=DEFAULT_BASE_TEMPLATE) {
  // add all properties except for non-editable ones
  // if default exists for a prop then use it
  // otherwise use null for prop
  var result = template;
  for (var prop of Object.keys(profile["properties"])) {
    if (isNonEditableProp(profile, prop) || hasDoNotSubmitInPropComment(profile, prop)) {
      continue;
    }
    // null if default does not exist
    result[prop] = getDefaultForProp(profile, prop);
  }

  // add accession by default even though it's not editable
  result[HEADER_PROP_ACCESSION] = "";

  return result;
}

