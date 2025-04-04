sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
    "sap/m/MessagePopover",
    "sap/ui/dom/isBehindOtherElement",
    "sap/ui/core/Element",
    "sap/ui/core/Fragment"
], (Controller, BusyIndicator, JSONModel, MessageBox, Messaging, Message, MessagePopover, isBehindOtherElement, Element, Fragment) => {
    "use strict";

    return Controller.extend("ui.configmasterdata.controller.Main", {
        onInit() {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("RouteMain").attachPatternMatched(this.onRouteMatched, this);
        },

        onRouteMatched(oEvent){
            this.getPlantData();
            this.existingData = [];
            this.changeIds = [];
            this.setDefaultData(oEvent);
        },

        async setDefaultData(oEvent) {
            BusyIndicator.show();
            this.existingData = await this._getSavedErrors();
            var oModel = this.getView().getModel("masterModel");
            var aData = [];
            if (this.existingData) {
                for (let index = 0; index < this.existingData.length; index++) {
                    const element = this.existingData[index];
                    var oPayload = this.getEmptyLine();
                    oPayload.ID = element.ID;
                    oPayload.plant = element.plant;
                    oPayload.departmentId = element.department;
                    oPayload.email = element.email;
                    oPayload.saved = true;
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
                const response = await fetch(sUri + "/MasterConfigSet", {
                    method: "GET"
                });
                if (!response.ok) {
                    const errorText = await response.text();

                    let oErrorItem = {
                        "errorCode": response.status,
                        "message": errorText,
                        "subtitle": "Initial load",
                        "target": "",
                        "title": "Initial load",
                        "activeTitle": "Initial fetch",
                        "groupName": response.status
                    }
                    // this.errorLogs.push(oErrorItem);
                    // this.getView().getModel("ErrorLogs").setData(this.errorLogs);
                    // this.viewLogs();

                    BusyIndicator.hide();
                    //MessageBox.error(errorText);
                } else {
                    const result = await response.json();
                    return result.value;
                }
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error while trying to fetch existing records");
            }
        },

        async onSave(oEvent) {
            BusyIndicator.show();
            var aPromises = [];
            var aUpdatePromises=[];
            var executeCheck = true;
            var oData = this.getView().getModel("masterModel").getData();
            var oPayload = {};
            var oUpdatePayload={};
            let mandatoryCheck = true;
            mandatoryCheck = this.getMandatoryCheck();
            if (mandatoryCheck) {
                for (let index = 0; index < oData.length; index++) {
                    var element = oData[index];
                    if (!element.saved) {
                        var checkExist = this.existingData.some(item => item.plant === element.plant && item.department === element.departmentId);
                        if (checkExist) {
                            MessageBox.error(`Plant: ${element.plant} and Department: ${element.departmentId} combination already exists.`);
                            executeCheck = false;
                            BusyIndicator.hide();
                            break;
                        }else {
                            oPayload = {
                                "plant": element.plant,
                                "department": element.departmentId,
                                "email": element.email
                            };
                            aPromises.push(this.getSavePromise(oPayload));
                        }
                    }else{
                        oUpdatePayload = {
                            "plant": element.plant,
                            "department": element.departmentId,
                            "email": element.email
                        };
                        aPromises.push(this.getUpdatePromise(oUpdatePayload, element.ID));
                    }
                };
                var resultingList = [];
                var that = this;
                if (aPromises.length > 0 && executeCheck) {
                    await Promise.all(aPromises).then(async function (oResp, oError) {
                        // resultingList.push(oResp);
                        await that.setDefaultData(oEvent);
                        BusyIndicator.hide();
                        MessageBox.success("Data saved and updated successfully");
                    }).catch(function (oErr) {
                        BusyIndicator.hide();
                        var errorResp = JSON.parse(oErr.responseText).error;
                        // MessageBox.error(errorResp.message + ": " + errorResp.target);
                        MessageBox.error(errorResp);
                    });                
                }else{
                    BusyIndicator.hide();
                }                
            }else{
                BusyIndicator.hide();
            }
        },

        onChangeofDepartment(oEvent){
            if (oEvent) {
                
            }
        },

        onChangePlant(oEvent){

        },

        onChangeEmail(oEvent){

        },

        getMandatoryCheck(){
            var mandatoryFail = 0;
            const oModelData = this.getView().getModel("masterModel").getData();
            var oTable = this.getView().byId("re-fin-errorTable");
            var oItems = oTable.getItems();
            for (let index = 0; index < oItems.length; index++) {
                const element = oItems[index];
                for (let j = 0; j < element.getCells().length; j++) {
                    var cell = element.getCells()[j];
                    if (cell.getValue() === "") {
                        cell.setValueState("Error");
                        cell.setValueStateText("Value is required");
                        mandatoryFail++;
                    }else{
                        cell.setValueState("None");
                        cell.setValueStateText("");
                    }
                }  
            }
            if (mandatoryFail > 0) {
                return false;
            }else{
                return true;
            }
        },

        getSavePromise(oPayload) {
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            return new Promise(function (resolve, reject) {
                $.ajax(sUri + "/MasterConfigSet", {
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

        getUpdatePromise(oPayload, ID){
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            return new Promise(function (resolve, reject) {
                $.ajax(sUri + "/MasterConfigSet/" + ID, {
                    type: "PUT",
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

        async getPlantData(oEvent){
            BusyIndicator.show();
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.ZBTP_API_COST_ESTIMATE_SRV.uri);
            try {
                const response = await fetch(sUri + "/zplant_vh_set?$format=json");
                if (!response.ok) {
                    let errorText = await response.text();
                }else{
                    const responseData = await response.json();
                    if (responseData) {
                        const plantData = responseData.d.results;
                        let oPlantModel = new JSONModel(plantData);
                        this.getView().setModel(oPlantModel,"PlantHelp");
                    }
                }
                BusyIndicator.hide();
            } catch (error) {
                MessageBox.error("Error while fetching plant data from S/4");
                BusyIndicator.hide();
            }
        },

        onPlantReq(oEvent){
            this.plantInput = oEvent.getSource();
            var oView = this.getView();
                if (!this.oPlantPopup) {
                    this.oPlantPopup = Fragment.load({
                        controller: this,
                        name: "ui.configmasterdata.view.fragments.PlantHelp"
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    })
                }
                this.oPlantPopup.then(function (oDialog) {
                    oDialog.open();
                });
        },

        onPlantSelect(oEvent){
            let oSelectedItem = oEvent.getParameter("selectedItem").getBindingContext("PlantHelp").getObject().Werks;
            oEvent.getSource().getBinding("items").filter([]);
            if (!oSelectedItem) {
                return;
            }
            this.plantInput.setValue(oSelectedItem);
        },

        onAddItem(oEvent) {
            var oModel = this.getView().getModel("masterModel");
            var oData = oModel.getData();
            var item = this.getEmptyLine();
            oData.unshift(item);
            oModel.setData(oData);
            oModel.refresh();
            this.getView().byId("re-fin-errorTable").removeSelections();
            this.setTableProperties();
        },

        onTabSelection(oEvent){
            const selectedPaths = oEvent.getSource().getSelectedContexts();
            if (selectedPaths.length > 0) {
                this.getView().byId("refin-deleteBadge").setValue(selectedPaths.length);
            }else{
                this.getView().byId("refin-deleteBadge").setValue("");
            }
        },

        onDelete(oEvent){
            var that = this;
            MessageBox.confirm("Are you sure you want to delete this entry?", {
                actions: ["Yes", MessageBox.Action.CLOSE],
                emphasizedAction: "CLOSE",
                onClose: async function (sAction) {
                    if (sAction === 'Yes') {
                        await that.removeSelectedRecords(oEvent);
                    }                        
                }
            }); 
        },

        async removeSelectedRecords(oEvent){
                let selectedPaths = this.getView().byId("re-fin-errorTable").getSelectedContextPaths();
                var deletePromises=[];
                var unsavedDeletions=[];
                for (let index = 0; index < selectedPaths.length; index++) {
                    let element = selectedPaths[index];
                    let deletionIndex = parseInt(element.split("/")[1]);
                    let plant = this.getView().getModel("masterModel").getData()[deletionIndex].plant;
                    let departmentId = this.getView().getModel("masterModel").getData()[deletionIndex].departmentId;
                    let savedCheck = this.getView().getModel("masterModel").getData()[deletionIndex].saved;
                    const exists = this.existingData.some(item => item.plant === plant && item.department === departmentId);
                    if (exists && savedCheck) {
                        deletePromises.push(this.getDeletePromise(plant, departmentId));
                    }else{
                        let deletePayload = {
                            "plant": plant,
                            "department": departmentId
                        };
                        unsavedDeletions.push(deletePayload);
                    }
                }
                if (deletePromises.length > 0) {
                    var that = this;
                    BusyIndicator.show();
                    await Promise.all(deletePromises).then(async function (oResp, oError) {
                        await that.setDefaultData(oEvent);
                        MessageBox.success("Records deleted successfully");
                        BusyIndicator.hide();
                    }).catch(function (oErr) {
                        BusyIndicator.hide();
                        const errorResp = JSON.parse(oErr.responseText).error;
                        MessageBox.error("Error while deleting selected data");
                    });
                }
                if (unsavedDeletions.length > 0) {
                    let oData = this.getView().getModel("masterModel").getData();
                    for (let index = this.getView().getModel("masterModel").getData().length - 1; index >= 0; index--) {
                        const element = this.getView().getModel("masterModel").getData()[index];
                        const exists = unsavedDeletions.some(item => item.plant === element.plant && item.department === element.departmentId);
                        if (exists) {
                            this.getView().getModel("masterModel").getData().splice(index, 1);
                            this.getView().getModel("masterModel").refresh();
                        }
                    }
                }
                this.getView().byId("re-fin-errorTable").removeSelections();
                this.getView().byId("refin-deleteBadge").setValue("");
                this.setTableProperties(); 
        },

        getDeletePromise(plant, departmentId){
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            let deletionId = this.existingData.find(item => item.plant === plant && item.department === departmentId).ID;
            if (deletionId) {
                return new Promise(function (resolve, reject) {
                    $.ajax(sUri + "/MasterConfigSet" + `('${deletionId}')`, {
                        type: "DELETE",
                        success: function (response) {
                            resolve(response);
                        },
                        error: function (error) {
                            reject(error);
                        }
                    });
                });
            }
        },

        setTableProperties() {
            const oModelData = this.getView().getModel("masterModel").getData();
            const length = this.existingData.length;
            this.getView().byId("re-fin-tabTitle").setText(`Records (${length})`);
            var oTable = this.getView().byId("re-fin-errorTable");
            var oItems = oTable.getItems();
            for (let index = 0; index < oItems.length; index++) {
                const element = oItems[index];
                let plant = element.getCells()[0].getProperty("value");
                let departmentText = element.getCells()[1].getProperty("value");
                let department = this.getView().getModel("configModel").getData().Departments.find(item => item.departmentText === departmentText.toString()) || '';
                if (department) {
                    if (this.existingData.some(item => item.plant === plant && item.department === department.departmentId) && oModelData[index].saved ) {
                        element.setHighlight("Success");
                    }else{
                        element.setHighlight("Warning");
                    }                    
                }else{
                    element.setHighlight("Warning");
                }  
            }
        },

        getEmptyLine() {
            return {
                "ID": "",
                "plant": "",
                "departmentId": "",
                "email": "",
                "saved": false
            }
        }
    });
});