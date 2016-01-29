﻿/*global define,Modernizr,require,dojo,alert,console */
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
            var widgets = {}, splashScreen, i,
                deferredArray = [], mapInstance;
            if (dojo.configData.SplashScreen.IsVisible) {
                splashScreen = new SplashScreen();
                splashScreen._showSplashScreenDialog();
            }
            mapInstance = this._initializeMap();
            //Loop header widgets array and filter out the widgets which are turned off from configuration file
            for (i = 0; i < dojo.configData.AppHeaderWidgets.length; i++) {
                //If widget is turned off from configuration file, remove it from the array
                if (dojo.configData.AppHeaderWidgets[i].hasOwnProperty("WidgetRequired") && !dojo.configData.AppHeaderWidgets[i].WidgetRequired) {
                    dojo.configData.AppHeaderWidgets.splice(i, 1);
                    break;
                }
            }

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
        }
    });
});
