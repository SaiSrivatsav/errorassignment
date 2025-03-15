sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
    "sap/m/MessagePopover",
    "sap/ui/dom/isBehindOtherElement",
    "sap/ui/core/Element"
], (Controller, BusyIndicator, JSONModel, MessageBox, Messaging, Message, MessagePopover, isBehindOtherElement, Element)  => {
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
            //Error Logs Setup
            this._MessageManager = Messaging;
            this._MessageManager.removeAllMessages();
            this._MessageManager.registerObject(this.getView().byId("re-fin-errorTable"), true);
            this.getView().setModel(this._MessageManager.getMessageModel(),"message");
            this.errorLogs = [];
            this.errorItem = this.getView().getModel("configModel").getData().ErrorLogItem;
            var oJsonErrLogModel = new JSONModel();
            this.getView().setModel(oJsonErrLogModel, "ErrorLogs");
            // this.createErrorPopover();
            this.setDefaultData(oEvent);
        },

        createErrorPopover(){
            var that = this;
            this.oMessagePopover = new MessagePopover({
				activeTitlePress: function (oEvent) {
					var oItem = oEvent.getParameter("item"),
						oPage = that.getView().byId("re-fin-dynPage"),
						oMessage = oItem.getBindingContext("message").getObject(),
						oControl = Element.registry.get(oMessage.getControlId());

					if (oControl) {
						oPage.scrollToElement(oControl.getDomRef(), 200, [0, -100]);
						setTimeout(function(){
							var bIsBehindOtherElement = isBehindOtherElement(oControl.getDomRef());
							if (bIsBehindOtherElement) {
								this.close();
							}
							if (oControl.isFocusable()) {
								oControl.focus();
							}
						}.bind(this), 300);
					}
				},
				items: {
					path:"ErrorLogs>/",
					template: new MessageItem(
						{
							title: "{ErrorLogs>message}",
							subtitle: "{ErrorLogs>additionalText}",
							groupName: {parts: [{path: 'message>controlIds'}], formatter: this.getGroupName},
							activeTitle: {parts: [{path: 'message>controlIds'}], formatter: this.isPositionable},
							type: "{message>type}",
							description: "{message>message}"
						})
				},
				groupItems: true
			});

			this.getView().byId("messagePopoverBtn").addDependent(this.oMessagePopover);
        },

        getGroupName(sControlId){
            var oControl = Element.registry.get(sControlId);
            return "Error code";
        },

        isPositionable(sControlId){
            return sControlId ? true : true;
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
                    this.errorLogs.push(oErrorItem);
                    this.getView().getModel("ErrorLogs").setData(this.errorLogs);
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
                },
                groupItems: true
            });

            oErrorLog.addDependent(this.oMessagePopover);
            oErrorLog.firePress();
        },

        showErrorLogs(oEvent){
            this.byId("re-fin-errorLog").addEventDelegate({
                "onAfterRendering": function () {
                this.oMessagePopover.openBy(this.byId("re-fin-errorLog"));
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
            if (exists && oErrorCode.saved) {
                var that = this;
                MessageBox.confirm("Are you sure? This entry will be permanently deleted from the database.", {
                    actions: ["Yes", MessageBox.Action.CLOSE],
                    emphasizedAction: "CLOSE",
                    onClose: async function (sAction) {
                        if (sAction === 'Yes') {
                            const delResp = await that.removeEntry(oErrorCode, oEvent);
                            // if (delResp.ok) {
                            //     oEvent.getSource().getModel("errorModel").getData().splice(sDeleteIndex, 1);
                            //     oEvent.getSource().getModel("errorModel").refresh();                
                            // }
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
                        var checkExist = this.existingData.some(item => item.errorcode === element.errorCode);
                        if (checkExist) {
                            MessageBox.error(`Error code ${element.errorCode}  already exists.`);
                            executeCheck = false;
                            BusyIndicator.hide();
                            break;
                        }else {
                            oPayload = {
                                "errorcode": element.errorCode,
                                "description": element.description,
                                "department": element.departmentId,
                                "emailId": element.emailId
                            };
                            aPromises.push(this.getSavePromise(oPayload));
                        }
                    }else{
                        oUpdatePayload = {
                            "errorcode": element.errorCode,
                            "description": element.description,
                            "department": element.departmentId,
                            "emailId": element.emailId
                        };
                        const ID = this.existingData.find(item => item.errorcode === element.errorCode).ID;
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
                "errorCode": "",
                "description": "",
                "departmentId": "",
                "emailId": "",
                "saved": false
            }
        }
    });
});