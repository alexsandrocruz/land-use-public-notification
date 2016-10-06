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
        // 8.  Specify settings for overlay                  - [ Tag(s) to look for: OperationalLayers]
        //     operational layers
        // 9.  Customize zoom level for address search       - [ Tag(s) to look for: ZoomLevel ]
        // 10.  Specify settings for parcel                  - [ Tag(s) to look for: OperationalLayers]
        //     layer
        // 11. Specify settings for roadLine                 - [ Tag(s) to look for: OperationalLayers]
        //     layer
        //      Settings for create point layer graphics     - [ Tag(s) to look for: PointSymbology]
        //     Avery Label Settings                          - [ Tag(s) to look for: AveryLabelSettings]
        // 12. Customize address search settings             - [ Tag(s) to look for: SearchSettings]
        // 13. Set URL for geometry service                  - [ Tag(s) to look for: GeometryService ]
        // 14. Specify URLs for map sharing                  - [ Tag(s) to look for: MapSharingOptions,TinyURLServiceURL, TinyURLResponseAttribute, FacebookShareURL, TwitterShareURL, ShareByMailLink ]

        // ------------------------------------------------------------------------------------------------------------------------
        // GENERAL SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set application title
        ApplicationName: "Public Notification",

        // Set application icon path
        ApplicationIcon: "/js/library/themes/images/publicnotification.png",

        // Set application Favicon path
        ApplicationFavicon: "/js/library/themes/images/favicon.ico",

        // Set URL of help page/portal
        HelpURL: "help.htm",

        //Set splash window content - Message that appears when the application starts
        SplashScreen: {
            SplashScreenContent: "<b>Public Notification</b> <br/> <hr/> <br/>The <b>Public Notification</b> application allows local government staff to identify properties within a given distance (buffer) of a subject property or roadway; or identify properties with a given administrative area (ex. school district).  Once a given set of properties have been identified, mailing labels and/or a structured text file can be generated for owners and occupants and used in public notification workflows.",
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
        },{
            Title: "PolygonTool",
            WidgetPath: "widgets/polygonTool/polygonTool",
            MapInstanceRequired: true,
            WidgetRequired: true
        },
		//{
        //Title: "Locate",
        //WidgetPath: "widgets/geoLocation/geoLocation",
        //MapInstanceRequired: true
        //}, 
		{
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

        // ------------------------------------------------------------------------------------------------------------------------
        // BASEMAP SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set baseMap layers
        BaseMapLayers: [{
            Key: "streetMap",
            ThumbnailSource: "js/library/themes/images/parcelmap.png",
            Name: "Streets",
            MapURL: "http://tiles.arcgis.com/tiles/Pu6Fai10JE2L2xUd/arcgis/rest/services/GeneralPurposeBasemap/MapServer"
        },{
            Key: "imagery",
            ThumbnailSource: "js/library/themes/images/imagery.png",
            Name: "Imagery",
            MapURL: "http://tiles.arcgis.com/tiles/Pu6Fai10JE2L2xUd/arcgis/rest/services/ImageryHybridBasemap/MapServer"
        }, {
            Key: "topoMap",
            ThumbnailSource: "js/library/themes/images/Topographic.jpg",
            Name: "Topographic",
            MapURL: "http://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer"
    }],

        // Set string value to be shown for null or blank values
        ShowNullValueAs: "N/A",

        // Initial map extent. Use comma (,) to separate values and dont delete the last comma
        DefaultExtent: "-9817210,5127895,-9814287,5127905",


        //Overlay layer settings refers to the other operational layers configured apart from the standard layers.
        // ------------------------------------------------------------------------------------------------------------------------
        OverlayLayerSettings: [
            {
                OverlayHighlightColor: "#1C86EE",
                DisplayTitle: "School Name",
                LayerUrl: "http://services6.arcgis.com/Pu6Fai10JE2L2xUd/arcgis/rest/services/AdministrativeAreas/FeatureServer/0",
                SearchDisplayFields: "NAME",
                SearchExpression: "UPPER(NAME) LIKE '%${0}%' OR UPPER(NAME) LIKE '%${0}%'",
                InfoWindowSettings: [{
                    InfoWindowTitleFields: "NAME",
                    InfoWindowData: [{
                        DisplayText: "School District:",
                        FieldName: "NAME",
                        AliasField: "School District Name"
                    }, {
                        DisplayText: "District Area (sq mi):",
                        FieldName: "DISTAREA",
                        AliasField: "Area in Square Miles"
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
            ParcelHighlightColor: "#1C86EE",
            ParcelHighlightAlpha: 0.5,
            LayerUrl: "http://services6.arcgis.com/Pu6Fai10JE2L2xUd/arcgis/rest/services/TaxParcelQuery/FeatureServer/0",
            SearchDisplayFields: "PARCELID,SITEADDRESS",
            SearchExpression: "UPPER(PARCELID) LIKE '%${0}%' OR UPPER(SITEADDRESS) LIKE '%${0}%'",
            InfoWindowSettings: [{
                InfoWindowTitleFields: "Site Address,SITEADDRESS",
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
            LayerUrl: "http://services6.arcgis.com/Pu6Fai10JE2L2xUd/arcgis/rest/services/RoadCenterlineQuery/FeatureServer/0",
            SearchDisplayFields: "FULLNAME",
            SearchExpression: "UPPER(FULLNAME) LIKE '${0}%'",
            RoadHighlightColor: "#FF0000",
            InfoWindowSettings: [{
                InfoWindowTitleFields: "FULLNAME",
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

        SearchSettings: {
            DefaultLocatorSymbol: "/js/library/themes/images/redpushpin.png",
            MarkupSymbolSize: [{
                width: 35,
                height: 35
            }],
            HintText: "Search Address/Road/School",
            MultipleResults: "PARCELID,SITEADDRESS"
        },


        PointSymbology: {
            PointFillSymbolColor: "#FFFFFF",
            PointSymbolBorder: "#1C86EE",
            PointSymbolBorderWidth: "2",
            LineSymbolColor: "#1C86EE"
        },

        AveryLabelSettings: [{
            // Geoprocessing services for PDF creation
            PDFServiceTask: "http://52.26.253.224:6080/arcgis/rest/services/PublicNotification/GPServer/GenerateAveryLabels",

            // Geoprocessing service for CSV file creation
            CSVServiceTask: "http://52.26.253.224:6080/arcgis/rest/services/PublicNotification/GPServer/GenerateCSVMailingList",

            //Label to be displayed for Occupant
            OccupantLabel: "Occupant",

            //Fields of the occupant
            OccupantFields: "PARCELID,SITEADDRESS,PSTLCITY,PSTLSTATE,PSTLZIP5",

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
        },

        // This text is displayed in search results as the title to group Parcel layer results
        ParcelDisplayText: "ParcelID/Address",

        // This text is displayed in search results as the title to group RoadLine layer results
        RoadDisplayText: "Road Centerline",

        // Label for adding adjacent parcel when infowindow is open
        AdjacentParcels: "Add adjacent parcel",

        // Label for adding adjacent road when infowindow is open
        AdjacentRoad: "Add adjacent road",

        // To go from unique parcel result to multiple overlapping parcel result when infowindow is open.
        BackBtn: "Back",

        // Shows number of parcels found when there are overlapping parcels present at one place
        ParcelsCount: "Parcels found at this location",

        // Alert message comes when we try to add adjacent road and there is no road present at that position
        NoAdjacentParcel: "There are no parcels adjacent to the road within",

        // Caption is used in alert message to display buffer distance in feet.
        FeetCaption: "feet",

        // Detail tool tip text for particular parcel/road/school
        Details: "Details",

        // Notify tool tip text to display the notification infowindow page.
        Notify: "notify",

        // label for helping user to find out the way to add adjacent parcel
        ParcelCursorToolTip: "Press Ctrl + Map click to select parcel<br>Click on a selected parcel when done",

        // label for helping user to find out the way to add adjacent parcel
        RoadCursorToolTip: "Press Ctrl + Map click to select road<br>Click on a selected road when done"
    };
});