sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, BusyIndicator, JSONModel, MessageBox) => {
    "use strict";

    var oMessagePopover;
    return Controller.extend("ladera.fin.assignerrorsui.controller.Main", {
        onInit() {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("RouteMain").attachPatternMatched(this.onRouteMatched, this);
        },

        onRouteMatched(oEvent) {
            this.getView().getModel("errorModel").setData([]);
            this.existingData = [];
            this.errorLogs = [];
            this.errorItem = this.getView().getModel("configModel").getData().ErrorLogItem;
            this.getView().setModel(this.errorLogs, "ErrorLogs");
            this.setDefaultData(oEvent);
        },

        async setDefaultData(oEvent) {
            BusyIndicator.show();
            this.existingData = await this._getSavedErrors();
            var oModel = this.getView().getModel("errorModel");
            var aData = [];
            if (this.existingData) {
                for (let index = 0; index < this.existingData.length; index++) {
                    const element = this.existingData[index];
                    var oPayload = this.getEmptyLine();
                    oPayload.errorCode = element.errorcode;
                    oPayload.description = element.description;
                    oPayload.departmentId = element.department;
                    oPayload.emailId = element.emailId;
                    aData.push(oPayload);
                }
                oModel.setData(aData);
            }
            this.setTableProperties();
            BusyIndicator.hide();
        },

        async _getSavedErrors() {
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            try {
                const response = await fetch(sUri + "/ErrorRecordSet", {
                    method: "GET"
                });
                if (!response.ok) {
                    const errorText = await response.text();

                    this.errorItem.errorCode = response.status;
                    this.errorItem.message = errorText;
                    this.errorItem.subtitle = "Initial load";
                    this.errorItem.activeTitle = "Initial load";
                    this.errorLogs.push(this.errorItem);

                    this.viewLogs();

                    BusyIndicator.hide();
                    //MessageBox.error(errorText);
                } else {
                    const result = await response.json();
                    return result.value;
                }
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error while trying to fetch existing errors");
            }
        },

        viewLogs(){
            var oErrorLog = this.getView().byId("re-fin-errorLog");
            oErrorLog.setText(this.errorLogs.length);
            oErrorLog.setVisible(true);
            // this.getView().getModel("ErrorLogs").setData(this.errorLogs);

            var oMessageTemplate = new sap.m.MessageItem({
                type: 'Error',
                title: '{ErrorLogs>message}'
            });

            this.oMessagePopover = new sap.m.MessagePopover({
                items:{
                    path: 'ErrorLogs>/',
                    template: oMessageTemplate
                }
            });

            oErrorLog.addDependent(this.oMessagePopover);
            oErrorLog.firePress();
        },

        showErrorLogs(oEvent){
            this.byId("re-fin-errorLog").addEventDelegate({
                "onAfterRendering": function () {
                oMessagePopover.openBy(this.byId("re-fin-errorLog"));
                 }
                }, this);
           this.oMessagePopover.toggle(oEvent.getSource());
        },

        onEdit(oEvent) {
            var sEditIndex = oEvent.getSource().getParent().getBindingContext("errorModel").sPath.split("/")[1];
            this.enableEdit(sEditIndex);
        },

        enableEdit(sIndex){
            const oTable = this.getView().byId("re-fin-errorTable");
            const oCells = oTable.getItems()[sIndex].getAggregation("cells");
            for (let index = 0; index < oCells.length - 2; index++) {
                const element = oCells[index];
                element.setEditable(true);
            }
        },

        async onDelete(oEvent) {
            var sDeleteIndex = oEvent.getSource().getParent().getBindingContext("errorModel").sPath.split("/")[1];
            const oErrorCode = oEvent.getSource().getModel("errorModel").getData()[sDeleteIndex];
            const exists = this.existingData.some(item => item.errorcode === oErrorCode.errorCode);
            if (exists) {
                var that = this;
                MessageBox.confirm("Are you sure? This entry will be permanently deleted from the database.", {
                    actions: ["Yes", MessageBox.Action.CLOSE],
                    emphasizedAction: "CLOSE",
                    onClose: function (sAction) {
                        if (sAction === 'Yes') {
                            that.removeEntry(oErrorCode, oEvent);
                        }                        
                    }
                });
            } else {
                oEvent.getSource().getModel("errorModel").getData().splice(sDeleteIndex, 1);
                oEvent.getSource().getModel("errorModel").refresh();
            }
            this.setTableProperties();
        },

        async removeEntry(oErrorCode, oEvent) {
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            const deletionEntry = this.existingData.find(item => item.errorcode === oErrorCode.errorCode);
            if (deletionEntry.ID) {
                $.ajax(sUri + "/ErrorRecordSet" + `('${deletionEntry.ID}')` , {
                    type: "DELETE",
                    success: function (response) {
                        MessageBox.success("Error Code: " + deletionEntry.errorcode + " has been deleted");
                        const deleteIndex = oEvent.getSource().getParent().getBindingContext("errorModel").sPath.split("/")[1];
                        oEvent.getSource().getModel("errorModel").getData().splice(deleteIndex, 1);
                        oEvent.getSource().getModel("errorModel").refresh();
                    },
                    error: function (error) {
                        MessageBox.error(JSON.parse(error.responseText).error.message);
                    }
                });
            }
        },

        async onSave(oEvent) {
            BusyIndicator.show();
            var aPromises = [];
            var oData = this.getView().getModel("errorModel").getData();
            var oPayload = {};
            for (let index = 0; index < oData.length; index++) {
                var element = oData[index];
                var checkExist = this.existingData.some(item => item.errorcode === element.errorCode);
                if (!checkExist) {
                    MessageBox
                }else {
                    oPayload = {
                        "errorcode": element.errorCode,
                        "description": element.description,
                        "department": element.departmentId,
                        "emailId": element.emailId
                    };
                    aPromises.push(this.getSavePromise(oPayload));
                }
            }
            var resultingList = [];
            if (aPromises) {
                await Promise.all(aPromises).then(function (oResp, oError) {
                    resultingList.push(oResp);
                    this.setDefaultData(oEvent);
                    BusyIndicator.hide();
                    MessageBox.success("Data saved successfully");
                }).catch(function (oErr) {
                    BusyIndicator.hide();
                    var errorResp = JSON.parse(oErr.responseText).error;
                    // MessageBox.error(errorResp.message + ": " + errorResp.target);
                    MessageBox.error(errorResp);
                });                
            }
        },

        getSavePromise(oPayload) {
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            return new Promise(function (resolve, reject) {
                $.ajax(sUri + "/ErrorRecordSet", {
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(oPayload),
                    success: function (response) {
                        resolve(response);
                    },
                    error: function (error) {
                        reject(error);
                    }
                });
            });
        },

        onAddItem(oEvent) {
            var oModel = this.getView().getModel("errorModel");
            var oData = oModel.getData();
            var item = this.getEmptyLine();
            oData.unshift(item);
            oModel.setData(oData);
            oModel.refresh();
            this.setTableProperties();
        },

        setTableProperties() {
            var oTable = this.getView().byId("re-fin-errorTable");
            var oItems = oTable.getItems();
            for (let index = 0; index < oItems.length; index++) {
                const element = oItems[index];
                var errorCode = element.getCells()[0].getProperty("value");
                if (this.existingData.some(item => item.errorcode === errorCode)) {
                    element.setHighlight("Success");
                    element.setHighlightText("Pending to save");
                }else{
                    element.setHighlight("Warning");
                    element.setHighlightText("Saved");
                }
            }
        },

        getEmptyLine() {
            return {
                "errorCode": "",
                "description": "",
                "departmentId": "",
                "emailId": ""
            }
        }
    });
});