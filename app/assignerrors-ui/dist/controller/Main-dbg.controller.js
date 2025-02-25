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

        },

        onAddItem: function(oEvent){  
            var oModel = this.getView().getModel("errorModel");
            var oData = oModel.getData();   
            var item = this.getEmptyLine();
            oData.push(item);
            oModel.setData(oData);
            oModel.refresh();
        },

        getEmptyLine: function(){
            return {
                "errorCode": "",
                "description": "",
                "departmentId": "",
                "emailId": ""
            }
        }        
    });
});