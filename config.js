/*global dojo */
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
        ApplicationIcon: "/themes/images/publicnotification.png",

        // Set application Favicon path
        ApplicationFavicon: "/themes/images/favicon.png",

        // Set URL of help page/portal
        HelpURL: "help.htm",

        // Set splash window content - Message that appears when the application starts
        SplashScreen: {
            // splash screen Message is set in locale file in nls dirctory
            IsVisible: true
        },

        //------------------------------------------------------------------------------------------------------------------------
        // Header Widget Settings
        //------------------------------------------------------------------------------------------------------------------------
        // Set widgets settings such as widget title, widgetPath, mapInstanceRequired to be displayed in header panel
        // Title: Name of the widget, will displayed as title of widget in header panel
        // WidgetPath: path of the widget respective to the widgets package.
        // MapInstanceRequired: true if widget is dependent on the map instance.

        AppHeaderWidgets: [
           {
               Title: "Search",
               WidgetPath: "widgets/locator/locator",
               MapInstanceRequired: true
           }, {
               Title: "Locate",
               WidgetPath: "widgets/geoLocation/geoLocation",
               MapInstanceRequired: true
           }, {
               Title: "Print",
               WidgetPath: "widgets/print/print",
               MapInstanceRequired: true
           }, {
               Title: "Share",
               WidgetPath: "widgets/share/share",
               MapInstanceRequired: true
           }, {
               Title: "Help",
               WidgetPath: "widgets/help/help",
               MapInstanceRequired: false
           }
        ],
           // Set size of the info-Popup - select maximum height and width in pixels (not applicable for tabbed info-Popup)
           //minimum height should be 310 for the info-popup in pixels
           InfoPopupHeight: 300,

           // Minimum width should be 330 for the info-popup in pixels
           InfoPopupWidth: 350,

           // Set string value to be shown for null or blank values
           ShowNullValueAs: "N/A",

        // ------------------------------------------------------------------------------------------------------------------------
        // BASEMAP SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set baseMap layers
        BaseMapLayers: [{
            Key: "parcelMap",
            ThumbnailSource: "themes/images/parcelmap.png",
            Name: "Parcel Map",
            MapURL: "http://tryitlive.arcgis.com/arcgis/rest/services/ParcelPublicAccessMI/MapServer"

        }, {
            Key: "taxMap",
            ThumbnailSource: "themes/images/taxmap.png",
            Name: "Tax Map",
            MapURL: "http://tryitlive.arcgis.com/arcgis/rest/services/TaxParcelMI/MapServer"
        }, {
            Key: "imagery",
            ThumbnailSource: "themes/images/imagery.png",
            Name: "Imagery",
            MapURL: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
        }],


        // Initial map extent. Use comma (,) to separate values and dont delete the last comma
        DefaultExtent: "-9273520, 5249870, -9270620, 5251510",


        //Overlayer settings refers to the other operational layers configured apart from the standard layers.
        // ------------------------------------------------------------------------------------------------------------------------
        OverlayLayerSettings: [{
            OverlayHighlightColor: "#1C86EE",
            Title: "SchoolBoundaries",
            LayerUrl: "http://203.199.47.84/ArcGIS/rest/services/SchoolLocator/SchoolBoundaries/MapServer/3",
            SearchDisplayFields: "DISTRCTNAME,NAME",
            SearchExpression: "UPPER(DISTRCTNAME) LIKE '%${0}%' OR UPPER(NAME) LIKE '%${0}%'"
        }],
        // ------------------------------------------------------------------------------------------------------------------------
        // OPERATIONAL DATA SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------

        // Configure operational layers:

        // Configure operational layers below.
        // ServiceURL: URL of the layer.
        // LoadAsServiceType: Field to specify if the operational layers should be added as dynamic map service layer or feature layer.
        //                    Supported service types are 'dynamic' or 'feature'.


        // ------------------------------------------------------------------------------------------------------------------------
        // Renderer settings
        // ------------------------------------------------------------------------------------------------------------------------
        // ------------------------------------------------------------------------------------------------------------------------
        // Query fields
        // ------------------------------------------------------------------------------------------------------------------------
        //Fields to be displayed on info window.
        QueryOutFields: "PARCELID,LOWPARCELID,OWNERNME1,OWNERNME2,SITEADDRESS,PSTLADDRESS,PSTLCITY,PSTLSTATE,PSTLZIP5,PSTLZIP4,BUILDING,UNIT,USEDSCRP,CNVYNAME,CVTTXDSCRP,SCHLDSCRP",

        // Following zoom level will be set for the map upon searching an address
        ZoomLevel: 12,

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
                    FieldName: "${ROADCLASS}",
                    AliasField: "Road Class"
                }, {
                    DisplayText: "From Left:",
                    FieldName: "${FROMLEFT}",
                    AliasField: "Left From Address"
                }, {
                    DisplayText: "To Left:",
                    FieldName: "${TOLEFT}",
                    AliasField: "Left To Address"
                }, {
                    DisplayText: "From Right:",
                    FieldName: "${FROMRIGHT}",
                    AliasField: "Right From Address"
                }, {
                    DisplayText: "Zip Left:",
                    FieldName: "${ZIPLEFT}",
                    AliasField: "Zip on Left"
                }, {
                    DisplayText: "Zip Right:",
                    FieldName: "${ZIPRIGHT}",
                    AliasField: "Zip on Right"
                }]
            }]
        },
        // ------------------------------------------------------------------------------------------------------------------------
        // ADDRESS SEARCH SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set locator settings such as locator symbol, size, display fields, match score
        // LocatorParameters: Parameters(text, outFields, maxLocations, bbox, outSR) used for address and location search.
        // AddressSearch: Candidates based on which the address search will be performed.
        // PlaceNameSearch: Attributes based on which the layers will be queried when a location search is performed.
        // AddressMatchScore: Setting the minimum score for filtering the candidate results.
        //        // MaxResults: Maximum number of locations to display in the results menu.

        SearchSettings: { //earlier key LocatorSettings
            DefaultLocatorSymbol:"/themes/images/redpushpin.png",
            MarkupSymbolSize: [{
                width: 35,
                height: 35
            }],
            DefaultValue: "na",
            HintText: "Enter address/road/school district name",
            MultipleResults: "PARCELID,SITEADDRESS" //earlier key - AddressSearchFields
        },
        AveryLabelSettings: [{

            //Fields information for parcels
            ParcelInformation: {
                LowParcelIdentification: "LOWPARCELID",
                ParcelIdentification: "PARCELID",
                AliasParcelField: "Parcel Identification Number",
                SiteAddress: "SITEADDRESS"
            }
        }
         ],

        // ------------------------------------------------------------------------------------------------------------------------
        // GEOMETRY SERVICE SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------

        // Set geometry service URL
        GeometryService: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",

        // ------------------------------------------------------------------------------------------------------------------------
        // SETTINGS FOR MAP SHARING
        // ------------------------------------------------------------------------------------------------------------------------

        // Set URL for TinyURL service, and URLs for social media
        MapSharingOptions: {
            TinyURLServiceURL: "http://api.bit.ly/v3/shorten?login=esri&apiKey=R_65fd9891cd882e2a96b99d4bda1be00e&uri=${0}&format=json",
            TinyURLResponseAttribute: "data.url",
            FacebookShareURL: "http://www.facebook.com/sharer.php?u=${0}&t=esri%Template",
            TwitterShareURL: "http://mobile.twitter.com/compose/tweet?status=esri%Template ${0}",
            ShareByMailLink: "mailto:%20?subject=Check%20out%20this%20map!&body=${0}"
        }
    }
});