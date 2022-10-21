## ENCODE/IGVF metadata submitter

https://docs.google.com/spreadsheets/d/1Pm1f-CPmWwK1xTYNTFlzLtYvtHlvSAPkPUUWXlmtQJM/edit?usp=sharing

This spreadsheet with built-in Google Apps Script converts metadata between TSV (rows on sheet) and JSON (portal's data format) and communicates with ENCODE and IGVF portals.


## Configuration

Go to menu `ENCODE/IGVF` -> `Settings & auth`.


### Authorization

Authenticate yourself for a platform of interest (ENCODE or IGVF). Create/get a key/password pair from `Profile` menu on the portal.

Credentials information is stored in your account's `Properties` object so that it's not shared with others who co-work on your spreadsheet or who make a copy of your spreadsheet.


### Set endpoints for READs and WRITEs

Set endpoints for READ (GET) and WRITE (POST/PATCH/PUT) actions. ENCODE and IGVF production/test endpoints are supported.


### Set a profile name

Set a profile name. No plural (s) is allowed. Use Capitalized CamelCase or snake_case for a profile name.


## Functions


Create a new sheet first.

Functions are implemented as REST-ful requests. There are two classes (`USER` and `ADMIN`) for such REST-ful actions. `ADMIN` functions are for DACC administors only. Use functions marked with `USER` and then you will be safe.



### Special commented header

Basically, all commented headers and data under them will be ignored when communicating with the portal. That means you can have any commented header properties for your own purpose except for the following special ones.

- `#skip`: If set as `1` such row will be skipped for any READ/WRITE REST actions.
- `#response`: This shows response from the portal which will be very helpful for debugging validation problems.


### Make a new template

This will make a new template with all editable headers defined and colored. A new empty (or filled with default values) data row will also be added to the sheet. 


### GET (USER/ADMIN)

This action uses endpoint for READ. Define any identifying property (e.g. `accession`, `uuid` or `name`) in the header (first) row and write values under it. For each row, retrieve metadata for the corresponding ID from the portal.


### PATCH (USER/ADMIN)

This action uses endpoint for WRITE. This requires at least one identifying property defined in the header and its value data row. For each row, replace properties, which are defined on the sheet only, on the portal with those on the sheet. So this function will not delete any properties from the portal.


### POST (USER/ADMIN)

This action uses endpoint for WRITE. It's recommended to use `Make a new template` or `GET metadata` from the portal and start from there. Make sure that all required properties (red) are defined on the header and data rows. For each row, post s new submission to the portal. You will see `201` in the `#response` if it's successful.


### PUT (ADMIN)

This action uses endpoint for WRITE. This requires at least one identifying property defined in the header and its value data row. For each row, replace ALL properties on the portal with those on the sheet. So this function will remove any missing properties from the portal. Use it at your own risk.


### Search

Go to any data cell under SEARCHABLE property (Italic+Bold properties in header) and click on the menu `Search`.
