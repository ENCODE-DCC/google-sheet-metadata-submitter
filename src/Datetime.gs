function getCurrentLocalTimeString(sep="-") {
  // returns current time string with all special characters
  // replaced with `sep`
  var d = new Date();
  d = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return d.toISOString().replace(/T/g,sep).replace(/\:/g,sep).replace(/Z/g,'') .replace(/\..*/g,'');
}

