/*global define,dojo,esri,require,dojoConfig,alert */
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

require([
    "coreLibrary/widgetLoader",
    "application/js/config",
    "esri/config",
    "esri/urlUtils",
    "dojo/domReady!"
], function (WidgetLoader, config, esriConfig, urlUtils) {

    //========================================================================================================================//

    try {
        dojo.configData = config;

        // Use the proxy for the portal if the proxy URL is provided
        if (dojo.configData.ProxyUrl) {
            urlUtils.addProxyRule({
                urlPrefix: dojo.configData.ParcelLayerSettings.LayerUrl,
                proxyUrl: dojoConfig.baseURL + dojo.configData.ProxyUrl
            });
        }

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
