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
], (Controller, BusyIndicator, JSONModel, MessageBox, Messaging, Message, MessagePopover, isBehindOtherElement, Element, Fragment)  => {
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
            this.getPlantData();
            this.setDefaultData(oEvent);
        },

        async getMasterData(){
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            try {
                const response = await fetch(sUri + "/MasterConfigSet", {
                    method: "GET"
                });
                if (!response.ok) {
                    BusyIndicator.hide();
                } else {
                    const result = await response.json();
                    return result.value;
                }
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error while trying to fetch master data");
            }
        },

        async getPlantData(){
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

        onPlantSelect(oEvent){
            let oSelectedItem = oEvent.getParameter("selectedItem").getBindingContext("PlantHelp").getObject().Werks;
            oEvent.getSource().getBinding("items").filter([]);
            if (!oSelectedItem) {
                return;
            }
            this.plantInput.setValue(oSelectedItem);
        },

        onPlantReq(oEvent){
            this.plantInput = oEvent.getSource();
            var oView = this.getView();
                if (!this.oPlantPopup) {
                    this.oPlantPopup = Fragment.load({
                        controller: this,
                        name: "ladera.fin.assignerrorsui.view.fragments.PlantHelp"
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    })
                }
                this.oPlantPopup.then(function (oDialog) {
                    oDialog.open();
                });
        },

        async setDefaultData(oEvent) {
            BusyIndicator.show();
            this.masterData = await this.getMasterData();
            this.existingData = await this._getSavedErrors();
            var oModel = this.getView().getModel("errorModel");
            var aData = [];
            if (this.existingData) {
                for (let index = 0; index < this.existingData.length; index++) {
                    const element = this.existingData[index];
                    var oPayload = this.getEmptyLine();
                    oPayload.ID = element.ID;
                    oPayload.plant = element.plant;
                    oPayload.errorCode = element.errorcode;
                    oPayload.description = element.description;
                    oPayload.departmentId = element.department;
                    oPayload.emailId = element.emailId;
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
                const response = await fetch(sUri + "/ErrorRecordSet", {
                    method: "GET"
                });
                if (!response.ok) {
                    BusyIndicator.hide();
                } else {
                    const result = await response.json();
                    return result.value;
                }
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error while trying to fetch existing errors");
            }
        },

        onTabSelection(oEvent){
            const selectedPaths = oEvent.getSource().getSelectedContexts();
            if (selectedPaths.length > 0) {
                this.getView().byId("refin-deleteBadge").setValue(selectedPaths.length);
            }else{
                this.getView().byId("refin-deleteBadge").setValue("");
            }
        },

        async onDelete(oEvent) {
            var that = this;
            let selectedPaths = this.getView().byId("re-fin-errorTable").getSelectedContextPaths();
            if (selectedPaths.length > 0) {
                MessageBox.confirm("Are you sure you want to delete this entry?", {
                    actions: ["Yes", MessageBox.Action.CLOSE],
                    emphasizedAction: "CLOSE",
                    onClose: async function (sAction) {
                        if (sAction === 'Yes') {
                            await that.removeSelectedRecords(oEvent);
                        }                        
                    }
                }); 
            }
        },

        async removeSelectedRecords(oEvent){
            let selectedPaths = this.getView().byId("re-fin-errorTable").getSelectedContextPaths();
            var deletePromises=[];
            var unsavedDeletions=[];
            for (let index = 0; index < selectedPaths.length; index++) {
                let element = selectedPaths[index];
                let deletionIndex = parseInt(element.split("/")[1]);
                let ID = this.getView().getModel("errorModel").getData()[deletionIndex].ID;
                let errorCode = this.getView().getModel("errorModel").getData()[deletionIndex].errorCode;
                let plant = this.getView().getModel("errorModel").getData()[deletionIndex].plant;
                let department = this.getView().getModel("errorModel").getData()[deletionIndex].departmentId;
                let savedCheck = this.getView().getModel("errorModel").getData()[deletionIndex].saved;
                if (ID) {
                    let exists = true;
                }
                if (ID && savedCheck) {
                    deletePromises.push(this.getDeletePromise(ID));
                }else{
                    let deletePayload = {
                        "errorCode": errorCode,
                        "plant": plant,
                        "department": department
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
                let oData = this.getView().getModel("errorModel").getData();
                for (let index = this.getView().getModel("errorModel").getData().length - 1; index >= 0; index--) {
                    const element = this.getView().getModel("errorModel").getData()[index];
                    const exists = unsavedDeletions.some(item =>  item.errorCode === element.errorCode && item.plant === element.plant && item.department === element.departmentId);
                    if (exists) {
                        this.getView().getModel("errorModel").getData().splice(index, 1);
                        this.getView().getModel("errorModel").refresh();
                    }
                }
            }
            this.getView().byId("re-fin-errorTable").removeSelections();
            this.getView().byId("refin-deleteBadge").setValue("");
            this.setTableProperties(); 
    },

        getDeletePromise(ID){
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
                let deletionId = ID
                if (deletionId) {
                    return new Promise(function (resolve, reject) {
                        $.ajax(sUri + "/ErrorRecordSet" + `('${deletionId}')`, {
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
            var aUpdatePromises=[];
            var executeCheck = true;
            var oData = this.getView().getModel("errorModel").getData();
            var oPayload = {};
            var oUpdatePayload={};
            var mandatoryCheck = this.getMandatoryCheck();
            if (mandatoryCheck) {
                for (let index = 0; index < oData.length; index++) {
                    var element = oData[index];
                    if (!element.saved) {
                        var checkExist = this.existingData.some(item => item.errorcode === element.errorCode && item.plant === element.plant);
                        if (checkExist) {
                            MessageBox.error(`Error code ${element.errorCode}  already exists.`);
                            executeCheck = false;
                            BusyIndicator.hide();
                            break;
                        }else {
                            oPayload = {
                                "errorcode": element.errorCode,
                                "plant": element.plant,
                                "description": element.description,
                                "department": element.departmentId,
                                "emailId": element.emailId
                            };
                            aPromises.push(this.getSavePromise(oPayload));
                        }
                    }else{
                        oUpdatePayload = {
                            "errorcode": element.errorCode,
                            "plant": element.plant,
                            "description": element.description,
                            "department": element.departmentId,
                            "emailId": element.emailId
                        };
                        const ID = element.ID;
                        aPromises.push(this.getUpdatePromise(oUpdatePayload, ID));
                    }
                };
                var resultingList = [];
                var that = this;
                if (aPromises.length > 0 && executeCheck) {
                    await Promise.all(aPromises).then(function (oResp, oError) {
                        resultingList.push(oResp);
                        that.setDefaultData(oEvent);
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

        getMandatoryCheck(){
            var mandatoryFail = 0;
            const oModelData = this.getView().getModel("errorModel").getData();
            var oTable = this.getView().byId("re-fin-errorTable");
            var oItems = oTable.getItems();
            for (let index = 0; index < oItems.length; index++) {
                const element = oItems[index];
                for (let j = 0; j < element.getCells().length - 1; j++) {
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

        getUpdatePromise(oPayload, ID) {
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            return new Promise(function (resolve, reject) {
                $.ajax(sUri + "/ErrorRecordSet/" + ID, {
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
            const oModelData = this.getView().getModel("errorModel").getData();
            const length = this.existingData.length;
            this.getView().byId("re-fin-tabTitle").setText(`Errors Assigned (${length})`);
            var oTable = this.getView().byId("re-fin-errorTable");
            var oItems = oTable.getItems();
            for (let index = 0; index < oItems.length; index++) {
                const element = oItems[index];
                var errorCode = element.getCells()[0].getProperty("value");
                if (this.existingData.some(item => item.errorcode === errorCode) && oModelData[index].saved ) {
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
                "ID": "",
                "errorCode": "",
                "plant": "",
                "description": "",
                "departmentId": "",
                "emailId": "",
                "saved": false
            }
        }
    });
});