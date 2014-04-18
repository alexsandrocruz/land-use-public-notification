/*global define */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true */
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
define([], function () {
    return {

        // This file contains various configuration settings for esri template
        //
        // Use this file to perform the following:
        //
        // 1.  Specify application Name                      - [ Tag(s) to look for: ApplicationName ]
        // 2.  Set path for application icon                 - [ Tag(s) to look for: ApplicationIcon ]
        // 3.  Set path for application favicon              - [ Tag(s) to look for: ApplicationFavicon ]
        // 4.  Set URL for help page                         - [ Tag(s) to look for: HelpURL ]
        // 5.  Specify header widget settings                - [ Tag(s) to look for: AppHeaderWidgets ]
        // 6.  Specify URLs for base maps                    - [ Tag(s) to look for: BaseMapLayers ]
        // 7.  Set initial map extent                        - [ Tag(s) to look for: DefaultExtent ]
        // 8.  Specify URLs for operational layers           - [ Tag(s) to look for: OperationalLayers]
        // 9.  Customize zoom level for address search       - [ Tag(s) to look for: ZoomLevel ]
        // 10.  Customize address search settings            - [ Tag(s) to look for: LocatorSettings]
        // 11.  Set URL for geometry service                 - [ Tag(s) to look for: GeometryService ]
        // 12. Specify URLs for map sharing                  - [ Tag(s) to look for: MapSharingOptions,TinyURLServiceURL, TinyURLResponseAttribute, FacebookShareURL, TwitterShareURL, ShareByMailLink ]

        // ------------------------------------------------------------------------------------------------------------------------
        // GENERAL SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set application title
        ApplicationName: "Land Use Public Notification",

        // Set application icon path
        ApplicationIcon: "/js/library/themes/images/publicnotification.png",

        // Set application Favicon path
        ApplicationFavicon: "/js/library/themes/images/favicon.ico",

        // Set URL of help page/portal
        HelpURL: "help.htm",

        ParcelDisplayText: "ParcelID/Address",

        RoadDisplayText: "Road Centerline",

        OverLayDisplayText: "OverLay Layers",

        AdjacentParcels: "Add adjacent parcel",

        AdjacentRoad: "Add adjacent road",

        BackBtn: "Back",

        ParcelsCount: "Parcels found at this location",

        NoAdjacentParcel: "There are no parcels adjacent to the road within",

        FeetCaption: "feet",

        Details: "Details",

        Notify: "notify",

        ToolTipContents: {
            Parcel: "Press Ctrl + Map click to select parcel<br>Click on a selected parcel when done",
            Road: "Press Ctrl + Map click to select road<br>Click on a selected road when done"
        },

        //Set splash window content - Message that appears when the application starts
        SplashScreen: {
            SplashScreenContent: "Lorem ipsum dolor sit er elit lamet, consectetaur cillium adipisicing pecu, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Nam liber te conscient to factor tum poen legum odioque civiuda.",
            IsVisible: true
        },

        //------------------------------------------------------------------------------------------------------------------------
        // Header Widget Settings
        //------------------------------------------------------------------------------------------------------------------------
        // Set widgets settings such as widget title, widgetPath, mapInstanceRequired to be displayed in header panel
        // Title: Name of the widget, will displayed as title of widget in header panel
        // WidgetPath: path of the widget respective to the widgets package.
        // MapInstanceRequired: true if widget is dependent on the map instance.

        AppHeaderWidgets: [{
            Title: "Search",
            WidgetPath: "widgets/locator/locator",
            MapInstanceRequired: true
        }, {
            Title: "Locate",
            WidgetPath: "widgets/geoLocation/geoLocation",
            MapInstanceRequired: true
        }, {
            Title: "Print",
            WidgetPath: "widgets/print/printMap",
            MapInstanceRequired: true
        }, {
            Title: "Share",
            WidgetPath: "widgets/share/share",
            MapInstanceRequired: true
        }, {
            Title: "Help",
            WidgetPath: "widgets/help/help",
            MapInstanceRequired: false
        }],

        // Set size of the info-Popup - select maximum height and width in pixels (not applicable for tabbed info-Popup)
        //minimum height should be 310 for the info-popup in pixels
        InfoPopupHeight: 300,

        // Minimum width should be 330 for the info-popup in pixels
        InfoPopupWidth: 350,

        // Set string value to be shown for null or blank values
        ShowNullValueAs: "N/A",

        GroupURL: "http://www.arcgis.com/sharing/rest/",

        SearchURL: "http://www.arcgis.com/sharing/rest/search?q=group:",

        BasemapGroupTitle: "Land Use Public Notification", //CyberTech Systems and Software Limited

        BasemapGroupOwner: "sagarnair_cssl", //cybertechagol

        WebmapThumbnail: "js/library/themes/images/not-available.png",

        // Initial map extent. Use comma (,) to separate values and dont delete the last comma
        DefaultExtent: "-9273520, 5249870, -9270620, 5251510",


        //Overlay layer settings refers to the other operational layers configured apart from the standard layers.
        // ------------------------------------------------------------------------------------------------------------------------
        OverlayLayerSettings: [{
            OverlayHighlightColor: "#1C86EE",
            Title: "SchoolBoundaries",
            index: "0",
            LayerUrl: "http://ec2-54-214-169-132.us-west-2.compute.amazonaws.com:6080/arcgis/rest/services/SchoolDistrictQuery/MapServer/0",
            SearchDisplayFields: "DISTRCTNAME,NAME",
            SearchExpression: "UPPER(DISTRCTNAME) LIKE '%${0}%' OR UPPER(NAME) LIKE '%${0}%'",
            InfoWindowSettings: [{
                InfoWindowTitleFields: "NAME", //earlier key - InfoWindowTitle
                InfoWindowData: [{
                    DisplayText: "District Name:",
                    FieldName: "DISTRCTNAME ",
                    AliasField: "School District Name"
                }, {
                    DisplayText: "Name:",
                    FieldName: "NAME",
                    AliasField: "School Name"
                }]
            }]
        }],

        // ------------------------------------------------------------------------------------------------------------------------
        // Query fields
        // ------------------------------------------------------------------------------------------------------------------------
        //Fields to be queried
        QueryOutFields: "PARCELID,LOWPARCELID,OWNERNME1,OWNERNME2,SITEADDRESS,PSTLADDRESS,PSTLCITY,PSTLSTATE,PSTLZIP5,PSTLZIP4,BUILDING,UNIT,USEDSCRP,CNVYNAME,CVTTXDSCRP,SCHLDSCRP",

        // Following zoom level will be set for the map upon searching an address
        ZoomLevel: 12,
        // ------------------------------------------------------------------------------------------------------------------------
        // Buffer distances
        // ------------------------------------------------------------------------------------------------------------------------
        //Maximum Buffer Distance
        MaxBufferDistance: 2000,

        //Buffer Distance
        DefaultBufferDistance: 100,

        // ------------------------------------------------------------------------------------------------------------------------
        // OPERATIONAL DATA SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Configure operational layers:

        // Configure operational layers below.
        // LayerUrl: URL of the layer.

        ParcelLayerSettings: {
            ParcelHighlightColor: "#1C86EE", //earlier key - RendererColor
            ParcelHighlightAlpha: 0.5,
            LayerUrl: "http://tryitlive.arcgis.com/arcgis/rest/services/TaxParcelQuery/MapServer/0",
            SearchDisplayFields: "PARCELID,SITEADDRESS",
            SearchExpression: "UPPER(PARCELID) LIKE '%${0}%' OR UPPER(SITEADDRESS) LIKE '%${0}%'", //earlier key -  AddressSearchFields
            InfoWindowSettings: [{
                InfoWindowTitleFields: "Site Address,SITEADDRESS", //earlier key - InfoWindowTitle
                InfoWindowData: [{
                    DisplayText: "Parcel ID:",
                    FieldName: "PARCELID",
                    AliasField: "Parcel Identification Number"
                }, {
                    DisplayText: "Sub or Condo Name:",
                    FieldName: "CNVYNAME",
                    AliasField: "Conveyance Name"
                }, {
                    DisplayText: "Building:Unit:",
                    FieldName: "BUILDING,UNIT",
                    AliasField: "Building,Unit"
                }, {
                    DisplayText: "Owner Name:",
                    FieldName: "OWNERNME1",
                    AliasField: "Owner Name"
                }, {
                    DisplayText: "Second Owner:",
                    FieldName: "OWNERNME2",
                    AliasField: "Second Owner Name"
                }, {
                    DisplayText: "Use Description:",
                    FieldName: "USEDSCRP",
                    AliasField: "Use Description"
                }, {
                    DisplayText: "Tax District:",
                    FieldName: "CVTTXDSCRP",
                    AliasField: "Tax District Name"
                }, {
                    DisplayText: "School District:",
                    FieldName: "SCHLDSCRP",
                    AliasField: "School District Name"
                }]
            }]
        },

        RoadCenterLayerSettings: {
            LayerUrl: "http://tryitlive.arcgis.com/arcgis/rest/services/RoadCenterlineQuery/MapServer/0",
            SearchDisplayFields: "FULLNAME",
            SearchExpression: "UPPER(FULLNAME) LIKE '${0}%'",
            RoadHighlightColor: "#FF0000", //earlier key - RoadLineColor
            InfoWindowSettings: [{
                InfoWindowTitleFields: "FULLNAME", //earlier key - InfoWindowTitle
                InfoWindowData: [{
                    DisplayText: "Road Class:",
                    FieldName: "ROADCLASS",
                    AliasField: "Road Class"
                }, {
                    DisplayText: "From Left:",
                    FieldName: "FROMLEFT",
                    AliasField: "Left From Address"
                }, {
                    DisplayText: "To Left:",
                    FieldName: "TOLEFT",
                    AliasField: "Left To Address"
                }, {
                    DisplayText: "From Right:",
                    FieldName: "FROMRIGHT",
                    AliasField: "Right From Address"
                }, {
                    DisplayText: "Zip Left:",
                    FieldName: "ZIPLEFT",
                    AliasField: "Zip on Left"
                }, {
                    DisplayText: "Zip Right:",
                    FieldName: "ZIPRIGHT",
                    AliasField: "Zip on Right"
                }]
            }]
        },

        SearchSettings: { //earlier key LocatorSettings
            DefaultLocatorSymbol: "/js/library/themes/redpushpin.png",
            MarkupSymbolSize: [{
                width: 35,
                height: 35
            }],
            HintText: "Enter address/road/school district name",
            MultipleResults: "PARCELID,SITEADDRESS" //earlier key - AddressSearchFields
        },

        AveryLabelSettings: [{
            // Geoprocessing services for PDF creation
            PDFServiceTask: "http://ec2-54-214-169-132.us-west-2.compute.amazonaws.com:6080/arcgis/rest/services/PublicNotification/GPServer/GenerateAveryLabels",

            // Geoprocessing service for CSV file creation
            CSVServiceTask: "http://ec2-54-214-169-132.us-west-2.compute.amazonaws.com:6080/arcgis/rest/services/PublicNotification/GPServer/GenerateCSVMailingList",

            //Label to be displayed for Occupant
            OccupantLabel: "Occupant", // earlier key-OccupantName

            //Fields of the occupant
            OccupantFields: "PARCELID,SITEADDRESS",

            //Fields for Avery labels
            AveryFieldsCollection: ["PARCELID", "OWNERNME1", "OWNERNME2", "PSTLADDRESS", "PSTLCITY,PSTLSTATE,PSTLZIP5"],

            //Fields for CSV files
            CsvFieldsCollection: ["PARCELID", "OWNERNME1", "OWNERNME2", "PSTLADDRESS", "PSTLCITY", "PSTLSTATE", "PSTLZIP5"],

            //Fields information for parcels
            ParcelInformation: {
                LowParcelIdentification: "LOWPARCELID",
                ParcelIdentification: "PARCELID",
                AliasParcelField: "Parcel Identification Number",
                SiteAddress: "SITEADDRESS"
            },

            AveryLabelTemplates: [{
                name: "5160",
                value: "avery5160"
            }, {
                name: "5193",
                value: "avery5193"
            }]
        }],

        // ------------------------------------------------------------------------------------------------------------------------
        // Offset distance
        // ------------------------------------------------------------------------------------------------------------------------
        //Maximum offset
        MaxAllowableOffset: 1,

        // ------------------------------------------------------------------------------------------------------------------------
        // GEOMETRY SERVICE SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set geometry service URL
        GeometryService: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",

        // Set proxy url
        ProxyUrl: "/proxy/proxy.ashx",

        // ------------------------------------------------------------------------------------------------------------------------
        // SETTINGS FOR MAP SHARING
        // ------------------------------------------------------------------------------------------------------------------------

        // Set URL for TinyURL service, and URLs for social media
        MapSharingOptions: {
            TinyURLServiceURL: "https://api-ssl.bitly.com/v3/shorten?longUrl=${0}",
            TinyURLResponseAttribute: "data.url",
            FacebookShareURL: "http://www.facebook.com/sharer.php?u=${0}&t=Public%20Notification",
            TwitterShareURL: "http://mobile.twitter.com/compose/tweet?status=Public%20Notification ${0}",
            ShareByMailLink: "mailto:%20?subject=Check%20out%20this%20map!&body=${0}"
        }
    };
});
