sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    'sap/m/SearchField',
    'sap/ui/model/type/String',
    'sap/ui/table/Column',
    'sap/m/Table'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Filter, FilterOperator, SearchField, TypeString, UIColumn, mTable) {
        "use strict";

        return Controller.extend("cpccomparativeanalysis.controller.cpcView", {
            onInit: function () {
                // this.getOwnerComponent().getModel().read("/RFQEventCompDetailsProj", {
                //     success: function (resp) {
                //         this.showComparativeTable(resp.results);
                //     }.bind(this)
                // });

                $.get({
                    url: "./comparative-analysis/RFQEventCompDetailsProj",
                    success: function (resp) {
                        this.showComparativeTable(resp.value);
                    }.bind(this),
                    error: function (error) {
                        console.log(error);
                    }
                });

                this.addSalesSummary();
            },

            addSalesSummary: function () {
                var salesData = {
                    "SalesSummary": [{
                        "saleSummary": "Sales Plan (2021-2022)",
                        "Quantity": 245
                    },
                    {
                        "saleSummary": "Stock as on 01.04.2021",
                        "Quantity": 5
                    }]
                };

                var salesModel = new JSONModel(salesData);
                var oSalesTable = this.getView().byId("salesTable");
                oSalesTable.setModel(salesModel);
                //oSalesTable.bindItems("/SalesSummary");

                //Purchase Summary
                var purData = {
                    "PurchaseSummary": [{
                        "saleSummary": "Stock price on 01.02.22",
                        "Quantity": 188
                    },
                    {
                        "saleSummary": "Purchase Price 22-23",
                        "Quantity": 241
                    }]
                };

                var purModel = new JSONModel(purData);
                var oSalesTable = this.getView().byId("purchaseTable");
                oSalesTable.setModel(purModel);
            },

            showComparativeTable: function (rfqItems) {
                //Get Unique Vendors from the comparative Table
                var lookup = {};
                var items = rfqItems;//data.ComparativeAnalysis;
                var vendorList = [{ vendorName: "itemTitle", vendorEmailId: "" }];

                for (var item, i = 0; item = items[i++];) {
                    var name = item.vendorName + item.eventID;
                    //var eventID = item.eventID;

                    if (!(name in lookup)) {
                        lookup[name] = 1;
                        vendorList.push(items[i]);
                    }
                }

                // Function to sort the vendors
                function compare(curr, prev) {
                    if (curr.eventID < prev.eventID) {
                        return -1;
                    }
                    if (curr.eventID > prev.eventID) {
                        return 1;
                    }
                    return 0;
                }

                vendorList.sort(compare);

                //Get model unique Products
                lookup = {};
                var uniqueProducts = [];
                for (var item, i = 0; item = items[i++];) {
                    var name = item.itemTitle;

                    if (!(name in lookup)) {
                        lookup[name] = 1;
                        uniqueProducts.push(name);
                    }
                }


                var finalData = { "ComparativeAnalysis": [] };
                var skuPackingData = [];
                var productData = {};
                var productSKUData = {};
                for (var i = 0; i < uniqueProducts.length; i++) {
                    var filteredData = rfqItems.filter(function (ca) {
                        return ca.itemTitle == uniqueProducts[i];
                    });
                    productData = {};
                    productData.itemTitle = uniqueProducts[i];
                    // For sku packing data - start
                    productSKUData = {};
                    productSKUData.PLAN = 1990;
                    productSKUData.itemTitle = uniqueProducts[i];
                    for (var filData of filteredData) {
                        productData[filData.vendorName + filData.eventID] = filData.finalFGPrice;
                        productSKUData[filData.vendorName + filData.eventID] = filData.finalFGPrice * productSKUData.PLAN

                    }
                    finalData.ComparativeAnalysis.push(productData);
                    skuPackingData.push(productSKUData);
                }

                // Logic for the SKU clause fields
                var productClause = [{ id: "shelfLife", name: "Shelf Life" },
                { id: "gstInput", name: "GST Input" },
                { id: "creditDays", name: "Credit Days" }];
                var productClauseObj;
                for (var j in productClause) {
                    productClauseObj = {};
                    productClauseObj.itemTitle = productClause[j].name;
                    for (var k in vendorList) {
                        if (vendorList[k].vendorName !== "itemTitle") {
                            productClauseObj[vendorList[k].vendorName + vendorList[k].eventID] = vendorList[k][productClause[j].id];
                        }
                    }
                    finalData.ComparativeAnalysis.push(productClauseObj);
                    // productClausevendorList.itemTitle = productClause[j];

                }

                // Different Prices with Highes SKU quantity
                var costFields = [
                    { id: "bulkCost", name: "Bulk Cost" },
                    { id: "pmCost", name: "PM Cost" },
                    { id: "tollCharges", name: "Toll Charges" },
                    { id: "freightIns", name: "Freight & Ins." },
                    { id: "otherExpenses", name: "Misc." },
                    { id: "cashDiscount", name: "Cash Discount in %" }
                ];
                var productCostObj;
                for (var j in costFields) {
                    productCostObj = {};
                    productCostObj.itemTitle = costFields[j].name;
                    for (var k in vendorList) {
                        if (vendorList[k].vendorName !== "itemTitle") {
                            //productClauseObj[vendorList[k].vendorName] = vendorList[k][productClause[j].id];
                            var filteredCostData = rfqItems.filter(function (ca) {
                                return ca.vendorMailId == vendorList[k].vendorMailId;
                            });
                            //Math.max(...filteredCostData.map(item => item.quantity))
                            //var recordswithMaxQuan = Math.max.apply(Math, filteredCostData.map(function(item) { return item.quantity; }));
                            var recordswithMaxQuan = filteredCostData.reduce((p, c) => p.quantity > c.quantity ? p : c);

                            productCostObj[vendorList[k].vendorName + vendorList[k].eventID] = recordswithMaxQuan[costFields[j].id]

                        }

                    }
                    finalData.ComparativeAnalysis.push(productCostObj);
                    // productClausevendorList.itemTitle = productClause[j];

                }

                var oTable = this.getView().byId("comparativeTable");
                var columnName;
                for (var j = 0; j < vendorList.length; j++) {
                    if (j == 0) {
                        columnName = "Particulars";
                    } else {
                        columnName = vendorList[j].vendorName + "(" + vendorList[j].eventID + ")";
                    }
                    var oColumn = new sap.m.Column("col" + j, {

                        header: new sap.m.Label({
                            text: columnName,
                            wrapping: true
                        })
                    });
                    oTable.addColumn(oColumn);
                };

                var oCell = [];
                var text;
                for (i = 0; i < vendorList.length; i++) {
                    if (i) {
                        text = vendorList[i].vendorName + vendorList[i].eventID;
                    } else {
                        text = vendorList[i].vendorName;
                    }
                    var cell1 = new sap.m.Text({
                        text: "{" + text + "}"
                    });
                    oCell.push(cell1);
                }
                var aColList = new sap.m.ColumnListItem("aColList", {
                    cells: oCell
                });
                var jsonModel = new JSONModel(finalData);
                // console.log(data);
                oTable.setModel(jsonModel);
                oTable.bindItems("/ComparativeAnalysis", aColList);

                // Code for the packaging
                this.showPackingTable(skuPackingData, vendorList);
            },

            showPackingTable: function (skuPackingData, vendorList) {
                // add plan here
                vendorList.splice(1, 0, { "vendorName": 'PLAN' });
                var oTable = this.getView().byId("packagingTable");
                var columnName;
                for (var j = 0; j < vendorList.length; j++) {
                    if (j == 0) {
                        columnName = "Particulars";
                    } else {
                        if (j == 1) {
                            columnName = vendorList[j].vendorName;
                        } else {
                            columnName = vendorList[j].vendorName + "(" + vendorList[j].eventID + ")";
                        }
                    }
                    var oColumn = new sap.m.Column({

                        header: new sap.m.Label({
                            text: columnName,
                            wrapping: true
                        })
                    });
                    oTable.addColumn(oColumn);
                };

                var oCell = [];
                var text;
                for (var i = 0; i < vendorList.length; i++) {
                    if (i && i != 1) {
                        text = vendorList[i].vendorName + vendorList[i].eventID;
                    } else {
                        text = vendorList[i].vendorName;
                    }
                    var cell1 = new sap.m.Text({
                        text: "{" + text + "}"
                    });
                    oCell.push(cell1);
                }
                var aColList = new sap.m.ColumnListItem({
                    cells: oCell
                });
                var packingModel = new JSONModel(skuPackingData);
                // console.log(data);
                oTable.setModel(packingModel);
                oTable.bindItems("/", aColList);
            },

            // #region Value Help Dialog standard use case with filter bar without filter suggestions
            onValueHelpRequested: function () {
                this._oBasicSearchField = new SearchField();
                if (!this.pDialog) {
                    this.pDialog = this.loadFragment({
                        name: "cpccomparativeanalysis.view.RFQValueHelp"
                    });
                }
                this.pDialog.then(function (oDialog) {
                    var oFilterBar = oDialog.getFilterBar();
                    this._oVHD = oDialog;
                    // Initialise the dialog with model only the first time. Then only open it
                    if (this._bDialogInitialized) {
                        // Re-set the tokens from the input and update the table
                        oDialog.setTokens([]);
                        //oDialog.setTokens(this._oMultiInput.getTokens());
                        oDialog.update();

                        oDialog.open();
                        return;
                    }
                    this.getView().addDependent(oDialog);

                    // Set key fields for filtering in the Define Conditions Tab
                    oDialog.setRangeKeyFields([{
                        label: "Internal ID",
                        key: "internalId",
                        type: "string",
                        typeInstance: new TypeString({}, {
                            maxLength: 7
                        })
                    }]);

                    // Set Basic Search for FilterBar
                    oFilterBar.setFilterBarExpanded(false);
                    oFilterBar.setBasicSearch(this._oBasicSearchField);

                    // Trigger filter bar search when the basic search is fired
                    this._oBasicSearchField.attachSearch(function () {
                        oFilterBar.search();
                    });

                    oDialog.getTableAsync().then(function (oTable) {

                        //oTable.setModel(this.oProductsModel);

                        // For Desktop and tabled the default table is sap.ui.table.Table
                        if (oTable.bindRows) {
                            // Bind rows to the ODataModel and add columns
                            oTable.bindAggregation("rows", {
                                path: "/RFQEvents",
                                events: {
                                    dataReceived: function () {
                                        oDialog.update();
                                    }
                                }
                            });
                            oTable.addColumn(new UIColumn({ label: "RFQ", template: "Ebeln_Ebeln" }));
                            oTable.addColumn(new UIColumn({ label: "Internal Id", template: "internalId" }));
                            oTable.addColumn(new UIColumn({ label: "Title", template: "title" }));

                        }

                        // For Mobile the default table is sap.m.Table
                        if (oTable.bindItems) {
                            // Bind items to the ODataModel and add columns
                            oTable.bindAggregation("items", {
                                path: "/RFQEvents",
                                template: new ColumnListItem({
                                    cells: [new Label({ text: "{Ebeln_Ebeln}" }), new Label({ text: "{internalId}" }), new Label({ text: "{title}" })]
                                }),
                                events: {
                                    dataReceived: function () {
                                        oDialog.update();
                                    }
                                }
                            });
                            oTable.addColumn(new MColumn({ header: new Label({ text: "RFQ" }) }));
                            oTable.addColumn(new MColumn({ header: new Label({ text: "Internal ID" }) }));
                            oTable.addColumn(new MColumn({ header: new Label({ text: "Title" }) }));
                        }
                        oDialog.update();
                    }.bind(this));

                    //oDialog.setTokens(this._oMultiInput.getTokens());

                    // set flag that the dialog is initialized
                    this._bDialogInitialized = true;
                    oDialog.open();
                }.bind(this));
            },

            onRFQSelection: function () {
                this.getView().byId("RFQEventFilter").setVisible(true);
            },

            onValueHelpOkPress: function (oEvent) {
                var aTokens = oEvent.getParameter("tokens");
                this.getView().byId("RFQEventFilterValueHelp").setTokens(aTokens);
                this._oVHD.close();
            },

            onValueHelpCancelPress: function () {
                this._oVHD.close();
            }

        });
    });
