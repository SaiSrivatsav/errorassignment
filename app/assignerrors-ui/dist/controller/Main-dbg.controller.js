sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageBox"
], (Controller, BusyIndicator, MessageBox) => {
    "use strict";

    return Controller.extend("ladera.fin.assignerrorsui.controller.Main", {
        onInit() {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("RouteMain").attachPatternMatched(this.onRouteMatched, this);
        },

        onRouteMatched(oEvent) {
            this.getView().getModel("errorModel").setData([]);
            this.existingData = [];
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
                    BusyIndicator.hide();
                    MessageBox.error(errorText);
                } else {
                    const result = await response.json();
                    return result.value;
                }
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error while trying to fetch existing errors");
            }
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
            var deleteFlag = false;
            var sDeleteIndex = oEvent.getSource().getParent().getBindingContext("errorModel").sPath.split("/")[1];
            const oErrorCode = oEvent.getSource().getModel("errorModel").getData()[sDeleteIndex];
            const exists = this.existingData.some(item => item.errorcode === oErrorCode);
            if (exists) {
                MessageBox.confirm("Are you sure? This entry will be permanently deleted from the database.", {
                    actions: ["Yes", MessageBox.Action.CLOSE],
                    emphasizedAction: "CLOSE",
                    onClose: function (sAction) {
                        deleteFlag = true;
                    }
                });
                if (deleteFlag) {
                    await this.removeEntry(oErrorCode);
                }
            } else {
                oEvent.getSource().getModel("errorModel").getData().splice(sDeleteIndex, 1);
                oEvent.getSource().getModel("errorModel").refresh();
            }

        },

        async removeEntry(oErrorCode) {
            const deletionEntry = this.existingData.find(item => item.errorcode === oErrorCode);
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
                }).catch(function (oErr) {
                    BusyIndicator.hide();
                    MessageBox.error(JSON.parse(oErr.responseText).error.message);
                });
                await this.setDefaultData(oEvent);
                BusyIndicator.hide();
                MessageBox.success("Data saved successfully");
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
                var element = oItems[index];
                var oCells = element.getAggregation("cells");
                var errCode = oCells[0].getValue();
                for (let j = 0; j < oCells.length - 2; j++) {
                    if (this.existingData.some(itm => itm.errorcode === errCode)) {
                        oCells[j].setEditable(false);
                    }else{
                        oCells[j].setEditable(true);
                    }
                    
                }
                
            }
            // var oCells = oTable.getItems()[0].getAggregation("cells");
            // oCells[4].firePress();
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