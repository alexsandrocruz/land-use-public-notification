/*global define,Modernizr,require,dojo,alert,console */
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
//============================================================================================================================//
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "widgets/mapSettings/mapSettings",
    "widgets/splashScreen/splashScreen",
    "widgets/appHeader/appHeader",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dojo/DeferredList",
    "esri/request",
    "esri/arcgis/utils",
    "dojo/promise/all",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/domReady!"
], function (declare, _WidgetBase, Map, SplashScreen, AppHeader, array, lang, Deferred, DeferredList, esriRequest, esriUtils, all, sharedNls) {

    //========================================================================================================================//

    return declare([_WidgetBase], {
        sharedNls: sharedNls,

        /**
        * load widgets specified in Header Widget Settings of configuration file
        *
        * @class
        * @name coreLibrary/widgetLoader
        */
        startup: function () {
            var widgets = {}, splashScreen, basemapDeferred,
                deferredArray = [], mapInstance;
            if (dojo.configData.SplashScreen.IsVisible) {
                splashScreen = new SplashScreen();
                splashScreen._showSplashScreenDialog();
            }
            basemapDeferred = new Deferred();
            this._fetchBasemapCollection(basemapDeferred);
            basemapDeferred.then(lang.hitch(this, function (baseMapLayers) {
                dojo.configData.BaseMapLayers = baseMapLayers;
                mapInstance = this._initializeMap();
                /**
                * create an object with widgets specified in Header Widget Settings of configuration file
                * @param {array} dojo.configData.AppHeaderWidgets Widgets specified in configuration file
                */
                array.forEach(dojo.configData.AppHeaderWidgets, function (widgetConfig, index) {
                    var deferred = new Deferred();
                    widgets[widgetConfig.WidgetPath] = null;
                    require([widgetConfig.WidgetPath], function (Widget) {
                        widgets[widgetConfig.WidgetPath] = new Widget({ map: widgetConfig.MapInstanceRequired ? mapInstance : undefined, title: widgetConfig.Title });

                        deferred.resolve(widgetConfig.WidgetPath);
                    });
                    deferredArray.push(deferred.promise);
                });
                all(deferredArray).then(lang.hitch(this, function () {
                    try {
                        /**
                        * create application header
                        */
                        this._createApplicationHeader(widgets);

                    } catch (ex) {
                        alert(sharedNls.errorMessages.widgetNotLoaded);
                    }
                }));
            }));
        },

        /**
        * create map object
        * @return {object} Current map instance
        * @memberOf coreLibrary/widgetLoader
        */
        _initializeMap: function () {
            var map = new Map(),
                mapInstance = map.getMapInstance();
            return mapInstance;
        },

        /**
        * create application header
        * @param {object} widgets Contain widgets to be displayed in header panel
        * @memberOf coreLibrary/widgetLoader
        */
        _createApplicationHeader: function (widgets) {
            var applicationHeader = new AppHeader();
            applicationHeader.loadHeaderWidgets(widgets);
        },

        _fetchBasemapCollection: function (basemapDeferred) {
            var dListResult, groupUrl, searchUrl, webmapRequest, groupRequest, deferred, thumbnailSrc, baseMapArray = [], deferredArray = [];
            groupUrl = dojo.configData.GroupURL + "community/groups?q=title:\"" + dojo.configData.BasemapGroupTitle + "\" AND owner:" + dojo.configData.BasemapGroupOwner + "&f=json";
            groupRequest = esriRequest({
                url: groupUrl,
                callbackParamName: "callback"
            });
            groupRequest.then(function (groupInfo) {
                searchUrl = dojo.configData.SearchURL + groupInfo.results[0].id + "&sortField=name&sortOrder=desc&num=50&f=json";
                webmapRequest = esriRequest({
                    url: searchUrl,
                    callbackParamName: "callback"
                });
                webmapRequest.then(function (groupInfo) {
                    array.forEach(groupInfo.results, lang.hitch(this, function (info, index) {
                        if (info.type === "Map Service") {
                            thumbnailSrc = (groupInfo.results[index].thumbnail === null) ? dojo.configData.webmapThumbnail : dojo.configData.GroupURL + "content/items/" + info.id + "/info/" + info.thumbnail;
                            baseMapArray.push({
                                ThumbnailSource: thumbnailSrc,
                                Name: info.title,
                                MapURL: info.url
                            });
                        } else if (info.type === "Web Map") {
                            var mapDeferred = esriUtils.getItem(info.id);
                            mapDeferred.then(lang.hitch(this, function () {
                                deferred = new Deferred();
                                deferred.resolve();
                            }));
                            deferredArray.push(mapDeferred);
                        }
                    }));
                    dListResult = new DeferredList(deferredArray);
                    dListResult.then(function (res) {
                        if (res[1].length === 0) {
                            basemapDeferred.resolve(baseMapArray);
                            return;
                        }
                        array.forEach(res, function (data, innerIdx) {
                            if (innerIdx === 0) {
                                array.forEach(data[1].itemData.baseMap.baseMapLayers, function (baseMapLayer, idx) {
                                    if (baseMapLayer.url) {
                                        thumbnailSrc = (data[1].item.thumbnail === null) ? dojo.configData.WebmapThumbnail : dojo.configData.GroupURL + "content/items/" + data[1].item.id + "/info/" + data[1].item.thumbnail;
                                        baseMapArray.push({
                                            ThumbnailSource: thumbnailSrc,
                                            Name: data[1].itemData.baseMap.title,
                                            MapURL: baseMapLayer.url
                                        });
                                    }
                                });
                            } else {
                                array.some(baseMapArray, function (arrayBasemap) {
                                    array.forEach(data[1].itemData.baseMap.baseMapLayers, function (baseMapLayer, idx) {
                                        if (baseMapLayer.url && arrayBasemap.MapURL !== baseMapLayer.url) {
                                            thumbnailSrc = (data[1].item.thumbnail === null) ? dojo.configData.WebmapThumbnail : data[1].item.thumbnail;
                                            baseMapArray.push({
                                                ThumbnailSource: thumbnailSrc,
                                                Name: data[1].itemData.baseMap.title,
                                                MapURL: baseMapLayer.url
                                            });
                                        }
                                    });
                                });
                            }
                        });
                        basemapDeferred.resolve(baseMapArray);
                    });
                }, function (err) {
                    console.log(err);
                });
            }, function (err) {
                console.log(err);
            });
        }
    });
});
