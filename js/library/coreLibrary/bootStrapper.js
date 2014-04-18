﻿/*global define,dojo,esri,require,dojoConfig,alert */
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

require([
    "coreLibrary/widgetLoader",
    "application/js/config",
    "dojo/domReady!",
    "esri/config"
], function (WidgetLoader, config, domReady, esriConfig) {

    //========================================================================================================================//

    try {
        dojo.configData = config;
        esriConfig.defaults.io.proxyUrl = dojoConfig.baseURL + dojo.configData.ProxyUrl;
        esriConfig.defaults.io.timeout = 180000;
        /**
        * load application configuration settings from configuration file
        * create an object of widget loader class
        */
        var applicationWidgetLoader = new WidgetLoader();
        applicationWidgetLoader.startup();

    } catch (ex) {
        alert(ex.message);
    }
});
