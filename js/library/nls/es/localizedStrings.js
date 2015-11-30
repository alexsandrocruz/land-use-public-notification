/*global define */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
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
    okButtonText: "OK",
    webpageDispalyText: "Copy/paste HTML into your web page",
    bufferDistance: "Enter buffer distance (feet)",
    findNotify: "Who do you want to Notify?",
    propertyOwners: "Property Owners",
    propertyOccupants: "Property Occupants",
    occupantLabel: "Occupant Label",
    averyLabelsFormat: "Avery labels in PDF format ",
    csvFormat: "Download in CSV format",
    downloadNotification: "Download",
    clickToLocate: "Click To Locate",
    unableToLoadPDF: "Internet Explorer may fail to load the pdf document sometimes, please try a different browser if the pdf fails to load.",
    errorMessages: {
        invalidSearch: "No results found",
        falseConfigParams: "Required configuration key values are either null or not exactly matching with layer attributes, This message may appear multiple times.",
        invalidLocation: "Current Location not found.",
        invalidExtent: "Selected feature is out of basemap extent",
        invalidProjection: "Unable to plot current location on the map.",
        widgetNotLoaded: "Fail to load widgets.",
        shareLoadingFailed: "Unable to shorten URL, Bit.ly failed to load.",
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
        noDataAvailable: "Data not available for this particular location.",
        bufferRange: "Valid buffer range is between 0 to ${0} feet."
    },
    buttons: {
        embedding: "Embedding", //Shown next to icon for sharing the map embedding in website
        email: "Email",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
        facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
        twitter: "Twitter"  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
    },
    tooltips: {
        locate: "Locate",
        share: "Share",
        help: "Help",
        clear: "Clear",
        search: "Search",
        exit: "Exit",
        locateAddress: "LocateAddress"
    }
});
