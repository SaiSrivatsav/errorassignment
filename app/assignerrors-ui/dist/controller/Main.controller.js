sap.ui.define(["sap/ui/core/mvc/Controller"],e=>{"use strict";return e.extend("ladera.fin.assignerrorsui.controller.Main",{onInit(){this.oRouter=this.getOwnerComponent().getRouter();this.oRouter.getRoute("RouteMain").attachPatternMatched(this.onRouteMatched,this)},onRouteMatched(e){this.getView().getModel("errorModel").setData([]);this.setDefaultData(e)},setDefaultData(e){},onEdit(e){},onDelete(e){},onAddItem:function(e){var t=this.getView().getModel("errorModel");var r=t.getData();var o=this.getEmptyLine();r.push(o);t.setData(r);t.refresh()},getEmptyLine:function(){return{errorCode:"",description:"",departmentId:"",emailId:""}}})});
//# sourceMappingURL=Main.controller.js.map