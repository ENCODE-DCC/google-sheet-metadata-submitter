### ENCODE metadata submitter

https://docs.google.com/spreadsheets/d/1mmTsrT4tnD4fRAf7nkdduq810nZvMQxZy0ga4Z_zK74/edit?usp=sharing

This script converts metadata between TSV (rows on sheet) and JSON (portal's format) and communicates with ENCODE portal.


### Grant permission first

Grant permissions for the script to access your data on the sheet/account.


### Authorization (username/password)

Go to portal's Profile page and get credentials pair (username/password).
Go to `ENCODE` - `Authorize`. Credentials entered here will be shared for all sheets in the whole spreadsheet, but **NOT SHARED WITH OTHERS EVEN WHEN THEY MAKE A COPY OF YOUR SPREADSHEET**.


### Set endpoints

You can set endpoints for READ and WRITE actions. Go to `ENCODE` - `Set endpoint for WRITE actions`. The endpoint for WRITE actions is set as the test server (`https://test.encodedcc.org`) by default.


### Set a profile name

Go to `ENCODE` - `Set profile name` and enter a valid profile name. A profile name in snakecase or capitalized CamelCase are allowed. For example, `experiment`, `Expertiment`, `biosample_type` and `BiosampleType`. Such profile name should be set for each sheet.


### Check your current profile

Go to `ENCODE` - `Show sheet/header info`.


### Special commented headers

Data values under commented headers will be ignored and not be sent to the portal.

- `#skip`: For all REST actions (GET/PUT/POST). You can additionally make `#skip` header and set row's data cell as 1 to skip REST actions for that specific row.
- `#error`: For debugging purposese. This is filled with `HTTP ERROR CODE` + `HELP TEXT MESSAGE` for any recent REST action.


### Make a POST template based on profile

Once you set a valid profile name, go to `ENCODE` - `Make new template row`. This will make a new row with empty/default values for each property. This templatre include ALL editable properties for a given profile. Some of them are shown but not editable (e.g. `schema_version` and `accession`).


### Apply profile to sheet

You can add any new column (property) to the sheet and do `ENCODE` - `Apply profile to sheet` then the script will check if such new property exists in the given profile and add toolip to header and dropdown menu to `enum` type data cells.


### GET metadata from portal

Make a new header with a proper identifying property (`accession` or `uuid` according to the given profile). And then define accession/uuids you want to retrieve from the portal under the header. Go to `ENCODE` - `Get metadata for all raws`. 


### PUT metadata to portal

GET metadata from portal first and then edit it. Set `#skip` as `0` if it is present and then go to `ENCODE` - `PUT all rows to the portal` .


### POST metadata to portal

Starting from a template or existing metadata (retrieved from GET), set `#skip` as `0` if it is present and then go to `ENCODE` - `POST all rows to the portal` .


### How to debug?

Any REST (GET/PUT/POST) action will return `HTTP ERROR CODE` + `HELP TEXT MESSAGE` in the `#error` column. Fix your problem with the help message and resubmit.


### How to search for items on portal

Go to a data cell and hover your mouse on the header (1st row) of the column and check if it's shown as `SEARCH AVAILABLE` in its tooltop. On a data cell that you want to edit, go to `ENCODE` - `Search`. Then you will see a dialog box to edit your values.


### How to manage multiple metadata on a single sheet

- Each row is converted into a JSON format and empty value's property will be ignored. Such JSON will be finally submitted to the portal individually.
- For each row, `HTTP ERROR CODE` + `HELP TEXT` for the most recent REST action will be written back to the column `#error` for debugging.
