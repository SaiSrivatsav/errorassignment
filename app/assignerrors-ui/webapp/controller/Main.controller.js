sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("ladera.fin.assignerrorsui.controller.Main", {
        onInit() {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("RouteMain").attachPatternMatched(this.onRouteMatched, this);
        },

        onRouteMatched(oEvent){
            this.getView().getModel("errorModel").setData([]);
            this.setDefaultData(oEvent);
        },

        setDefaultData(oEvent){

        },

        onEdit(oEvent){

        },

        onDelete(oEvent){
            var sDeleteIndex = oEvent.getParameter("listItem").getBindingContext("errorModel").getPath().split("/")[2];
            oEvent.getSource().getModel("errorModel").getData().splice(sDeleteIndex, 1);
            oEvent.getSource().getModel("errorModel").refresh();
        },

        async onSave(oEvent){
            var aPromises = [];
            var oData = this.getView().getModel("errorModel").getData();
            var oPayload = {};
            for (let index = 0; index < oData.length; index++) {
                const element = oData[index];
                oPayload = {
                    "username": "srivatsav@laderatechnology.com",
                    "errorcode": element.errorCode,
                    "description": element.description,
                    "department": element.departmentId,
                    "emailId": element.emailId
                };                
                aPromises.push(this.getSavePromise());
            }
        },

        getSavePromise(oPayload){
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            return new Promise(function(resolve, reject){
                fetch(sUri + "/ErrorAssignment",{
                    method: "POST",
                    body: oPayload
                }).then(function(response){
                    return response.json();
                })
            });
        },

        onAddItem(oEvent){  
            var oModel = this.getView().getModel("errorModel");
            var oData = oModel.getData();   
            var item = this.getEmptyLine();
            oData.push(item);
            oModel.setData(oData);
            oModel.refresh();
        },

        getEmptyLine(){
            return {
                "errorCode": "",
                "description": "",
                "departmentId": "",
                "emailId": ""
            }
        }        
    });
});