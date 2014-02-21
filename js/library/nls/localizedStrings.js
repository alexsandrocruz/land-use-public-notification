/*global define */
/** @license
| Version 10.2
| Copyright 2013 Esri
|
| Licensed under the Apache License, Version 2.0 (the "License");
| you may not use this file except in compliance with the License.
| You may obtain a copy of the License at
|
|    http://www.apache.org/licenses/LICENSE-2.0
|
| Unless required by applicable law or agreed to in writing, software
| distributed under the License is distributed on an "AS IS" BASIS,
| WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
| See the License for the specific language governing permissions and
| limitations under the License.
*/
define({
    root: {
        okButtonText: "OK",
        splashScreenContent: "Lorem ipsum dolor sit er elit lamet, consectetaur cillium adipisicing pecu, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Nam liber te conscient to factor tum poen legum odioque civiuda.",
        parcelDisplayText: "ParcelID/Address",
        roadDisplayText: "Road Centerline",
        overLayDisplayText: "OverLay Layers",
        ClickToLocate: "Click To Locate",
        spanAdjacentParcels: "Add adjacent parcel",
        backBtn: "Back",
        parcelsCount: "Parcels found at this location",
        navigation: "navigation",
        notify: "notify",
        ToolTipContents: {
            Parcel: "Press Ctrl + Map click to select parcel<br>Click on a selected parcel when done",
            Road: "Press Ctrl + Map click to select road<br>Click on a selected road when done"
        },
        errorMessages: {
            invalidSearch: "No results found",
            falseConfigParams: "Required configuration key values are either null or not exactly matching with layer attributes, This message may appear multiple times.",
            invalidLocation: "Current Location not found.",
            invalidProjection: "Unable to plot current location on the map.",
            widgetNotLoaded: "Fail to load widgets.",
            shareLoadingFailed: "Unable to load share options.",
            shareFailed: "Unable to share.",
            noParcel: "Parcel not found at current location",
            unableToPerform: "Unable to perform operation: invalid geometry.",
            enterNumeric: "Please enter numeric value.",
            createBuffer: "Geometry for buffer is null in create buffer.",
            selectProperty: "Select Property Owners or Occupants to notify.",
            enterBufferDist: "Please enter the buffer distance.",
            inValidAveryFormat: "Invalid Avery format. Please select a valid format from the dropdown list.",
            inValidOccupantLabel: "Invalid format. Please select a valid option from the dropdown list.",
            fileSelect: "Select at least one file format to download.",
            noDataAvailable: "Data not available for this particular location."

        }
    },

    es: true, fr: true, it: true
});