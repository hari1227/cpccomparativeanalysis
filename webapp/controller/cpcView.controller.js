sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    'sap/m/SearchField',
    'sap/ui/model/type/String',
    'sap/ui/table/Column',
    'sap/m/Table',
    "sap/ui/core/Fragment",
    'sap/m/MessageBox'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Filter, FilterOperator, SearchField, TypeString, UIColumn, mTable, Fragment, MessageBox) {
        "use strict";

        return Controller.extend("cpccomparativeanalysis.controller.cpcView", {
            onInit: function () {
                // this.getOwnerComponent().getModel().read("/RFQEventCompDetailsProj", {
                //     success: function (resp) {
                //         this.showComparativeTable(resp.results);
                //     }.bind(this)
                // });

                this.selectedEvents = ["Doc648087602", "Doc652480915"];
                //Filters to be passed based on the selectedEvents
                $.get({
                    url: "./comparative-analysis/RFQEventCompDetails",
                    success: function (resp) {
                        this.rfqItemsWithoutSum = resp.value;
                        // Backend call to get all the items sumed at vendor, event and sku level
                        $.get({
                            url: "./comparative-analysis/RFQEventCompDetailsProj",
                            success: function (resp) {
                                this.showComparativeTable(resp.value);
                            }.bind(this),
                            error: function (error) {
                                console.log(error);
                            }
                        });

                    }.bind(this),
                    error: function (error) {
                        console.log(error);
                    }
                });
                this.getNFAPricingTableData();
                this.addSalesSummary();

                var nfaModel = new JSONModel();
                this.getView().setModel(nfaModel, "nfaModel");
                this.nfaData = {
                };
            },

            getNFAPricingTableData: function () {
                //Get NFA relavent Data
                //Fetch Awarded scenarios

                var settings = {
                    async: true,
                    url: "./comparative-analysis/CPCAwardedScenarios",
                    method: "GET",
                    headers: {
                        "content-type": "application/json"
                    },
                    processData: false
                    //  data: JSON.stringify(data)
                };
                $.ajax(settings)
                    .done(function (response) {
                        //this.getView().getModel("nfaPricingTable").setProperty("/", response.value);
                        this.showNFAPricingTable(response.value);
                    }.bind(this)).fail(function () {
                        MessageBox.error("error:" + error.message);
                    });
            },

            showNFAPricingTable: function (nfaPricingData) {
                var filteredNFAData;
                var nfaPricingObj = {}, nfaPricingFinalData = [];
                var nfavendorList = [], lookup;
                var columnData = [];
                //Get Unique vendor list from NFA Data
                lookup = {};
                for (var item, i = 0; item = nfaPricingData[i++];) {
                    var name = item.vendorMailId;

                    if (!(name in lookup)) {
                        lookup[name] = 1;
                        nfavendorList.push(name);
                    }
                }
                for (var i = 0; i < nfavendorList.length; i++) {

                    filteredNFAData = nfaPricingData.filter(function (item) {
                        return item.vendorMailId == nfavendorList[i];
                    });
                    // nfaPricingObj.vendor = this.vendorList[i].itemTitle;
                    nfaPricingObj = {};
                    for (var nfaData of filteredNFAData) {
                        nfaPricingObj.Vendor = nfaData.vendorName;
                        nfaPricingObj[nfaData.SKUName + "-Quantity"] = nfaData.quantity;
                        nfaPricingObj[nfaData.SKUName + "-Price"] = nfaData.price;
                        columnData.push({ columnName: nfaData.SKUName + "-Quantity" }, { columnName: nfaData.SKUName + "-Price" });
                    }
                    nfaPricingFinalData.push(nfaPricingObj);

                }
                //Get unique column names
                var nfalookup = {};
                var uniqueColumnData = [];
                for (var item, i = 0; item = columnData[++i];) {
                    var name = item.columnName;

                    if (!(name in nfalookup)) {
                        nfalookup[name] = 1;
                        uniqueColumnData.push(columnData[i]);
                    }
                }
                uniqueColumnData.unshift({ columnName: "Vendor" });
                for (var i in nfaPricingFinalData) {
                    for (var columnName of uniqueColumnData) {
                        if (!nfaPricingFinalData[i][columnName.columnName]) {
                            nfaPricingFinalData[i][columnName.columnName] = "NA";
                        }
                    }
                }
                //console.log(nfaPricingFinalData);
                //this.getView().getModel("nfaPricingTable").setProperty("/", nfaPricingFinalData);
                this.generateNFAMultiVendorTable(nfaPricingFinalData, uniqueColumnData);
            },

            generateNFAMultiVendorTable: function (nfaPricingData, uniqueColumnData) {
                this.nfaMultiVendorPrice = nfaPricingData;
                // Create a Table for ComparativeAnalysis
                var oTable = this.getView().byId("nfaMultiVendorTable");
                var columnName, lookup = {};
                var ColumnList = [];

                var nfaFinalModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(nfaFinalModel, "nfaFinalModel");
                nfaFinalModel.setData({
                    rows: nfaPricingData,
                    columns: uniqueColumnData
                });

                oTable.setModel(nfaFinalModel);
                oTable.setVisibleRowCount(nfaPricingData.length);
                oTable.bindColumns("/columns", function (sId, oContext) {
                    var columnName = oContext.getObject().columnName;
                    return new sap.ui.table.Column({
                        label: new sap.m.Label({
                            text: columnName,
                            wrapping: true
                        }),
                        template: new sap.m.Label({
                            text: "{" + columnName + "}",
                            wrapping: true
                        })
                    });
                });

                oTable.bindRows("/rows");
                //oTable.bindItems("nfaPricingTable>/", aColList);
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
                //Data for NFA
                var nfaRequiredData = [];

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
                this.vendorList = vendorList;

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

                var self = this;
                var finalData = { "ComparativeAnalysis": [] };
                var skuPackingData = [];
                var productData = {};
                var productSKUData = {};
                var productSKUTotal = {};
                var productSKUAverage = {};
                productSKUAverage.itemTitle = "Average Price";
                productSKUTotal.itemTitle = "TOTAL";
                for (var i = 0; i < uniqueProducts.length; i++) {
                    var filteredData = rfqItems.filter(function (ca) {
                        return ca.itemTitle == uniqueProducts[i];
                    });
                    productData = {};
                    productData.itemTitle = uniqueProducts[i];
                    // For sku packing data - start
                    productSKUData = {};
                    // PLAN = Sum of all the quantity of the unique product -> no used after discussion
                    //PLAN = Sum of all the quantity for each SKU based on the one vendor bid
                    productSKUData.PLAN = filteredData.filter(function (obj) {
                        return vendorList[1].vendorMailId == obj.vendorMailId && self.selectedEvents[0] == obj.eventID;
                    }).reduce(function (accumulator, object) {
                        // if(vendorList[1].vendorMailId == object.vendorMailId && self.selectedEvents[0] == object.eventID) {
                        return accumulator + object.quantity;
                        // }
                    }, 0);
                    productSKUTotal.PLAN = productSKUTotal.PLAN ? productSKUTotal.PLAN + productSKUData.PLAN : productSKUData.PLAN; // for packing table
                    productSKUData.itemTitle = uniqueProducts[i];
                    // For sku packing data - end
                    for (var filData of filteredData) {
                        productData[filData.vendorName + filData.eventID] = filData.finalFGPrice;
                        //Code for Packing table - start 
                        productSKUData[filData.vendorName + filData.eventID] = filData.finalFGPrice * productSKUData.PLAN
                        if (productSKUTotal[filData.vendorName + filData.eventID]) {
                            productSKUTotal[filData.vendorName + filData.eventID] = productSKUTotal[filData.vendorName + filData.eventID] + productSKUData[filData.vendorName + filData.eventID];
                        } else {
                            productSKUTotal[filData.vendorName + filData.eventID] = productSKUData[filData.vendorName + filData.eventID];
                        }
                        productSKUAverage[filData.vendorName + filData.eventID] = productSKUTotal[filData.vendorName + filData.eventID] / productSKUTotal.PLAN;
                        //Code for Packing table - end
                    }
                    finalData.ComparativeAnalysis.push(productData);
                    skuPackingData.push(productSKUData);
                }

                skuPackingData.push(productSKUTotal);
                skuPackingData.push(productSKUAverage);
                //delete productSKUTotal;
                //delete productSKUAverage;

                // Different Prices with Highes SKU quantity
                var costFields = [
                    { id: "bulkCost", name: "Bulk Cost" },
                    { id: "pmCost", name: "PM Cost" },
                    { id: "tollCharges", name: "Toll Charges" },
                    { id: "freightIns", name: "Freight & Ins." },
                    { id: "otherExpenses", name: "Misc." },
                    { id: "cashDiscount", name: "Cash Discount in %" }
                ];
                var productCostObj, productTotalCost = {}, productSKUAveragePriceCD = {}, cashDiscountData;
                productSKUAveragePriceCD.itemTitle = "Average Price with CD";
                productTotalCost.itemTitle = "TOTAL-- Rs./Lt";

                for (var j in costFields) {
                    productCostObj = {};
                    productCostObj.itemId = costFields[j].id;
                    productCostObj.itemTitle = costFields[j].name;
                    for (var k in vendorList) {
                        if (vendorList[k].vendorName !== "itemTitle") {
                            //productClauseObj[vendorList[k].vendorName] = vendorList[k][productClause[j].id];
                            var filteredCostData = this.rfqItemsWithoutSum.filter(function (ca) {
                                return ca.vendorMailId == vendorList[k].vendorMailId;
                            });
                            //Math.max(...filteredCostData.map(item => item.quantity))
                            //var recordswithMaxQuan = Math.max.apply(Math, filteredCostData.map(function(item) { return item.quantity; }));
                            var recordswithMaxQuan = filteredCostData.reduce((p, c) => p.quantity > c.quantity ? p : c);

                            productCostObj[vendorList[k].vendorName + vendorList[k].eventID] = recordswithMaxQuan[costFields[j].id]
                            if (costFields[j].id !== "cashDiscount") {

                                if (productTotalCost[vendorList[k].vendorName + vendorList[k].eventID]) {
                                    productTotalCost[vendorList[k].vendorName + vendorList[k].eventID] = productTotalCost[vendorList[k].vendorName + vendorList[k].eventID] + parseInt(recordswithMaxQuan[costFields[j].id]);
                                } else {
                                    productTotalCost[vendorList[k].vendorName + vendorList[k].eventID] = parseInt(recordswithMaxQuan[costFields[j].id]);
                                }
                            } else {
                                productSKUAveragePriceCD[vendorList[k].vendorName + vendorList[k].eventID] = productSKUAverage[vendorList[k].vendorName + vendorList[k].eventID] - (productSKUAverage[vendorList[k].vendorName + vendorList[k].eventID] / ((parseInt(productCostObj[vendorList[k].vendorName + vendorList[k].eventID])) * 100));
                            }
                        }

                    }
                    finalData.ComparativeAnalysis.push(productCostObj);
                    // productClausevendorList.itemTitle = productClause[j];
                    if (productCostObj.itemTitle == "Cash Discount in %") {
                        skuPackingData.push(productCostObj);
                        nfaRequiredData.push(productCostObj);
                        cashDiscountData = productCostObj;
                    }

                }
                skuPackingData.push(productSKUAveragePriceCD);
                //console.log(productSKUAveragePriceCD);
                finalData.ComparativeAnalysis.splice((finalData.ComparativeAnalysis.length - 1), 0, productTotalCost);

                // Logic for the SKU clause fields
                var productClause = [{ id: "shelfLife", name: "Shelf Life" },
                { id: "gstInput", name: "GST Input" },
                { id: "creditDays", name: "Credit Days" }];
                var productClauseObj;
                var productCashPrice = {};
                productCashPrice.itemTitle = "Cash Price of FG";
                for (var j in productClause) {
                    productClauseObj = {};
                    productClauseObj.itemId = productClause[j].id;
                    productClauseObj.itemTitle = productClause[j].name;
                    for (var k in vendorList) {
                        if (vendorList[k].vendorName !== "itemTitle") {
                            productClauseObj[vendorList[k].vendorName + vendorList[k].eventID] = vendorList[k][productClause[j].id];
                        }
                        // Calculate the cost price in FG
                        productCashPrice[vendorList[k].vendorName + vendorList[k].eventID] = productTotalCost[vendorList[k].vendorName + vendorList[k].eventID] - (productTotalCost[vendorList[k].vendorName + vendorList[k].eventID] * cashDiscountData[vendorList[k].vendorName + vendorList[k].eventID] / 100);
                        //productTotalCost;
                    }
                    if (productClause[j].id === "shelfLife") {
                        finalData.ComparativeAnalysis.unshift(productClauseObj);
                    } else {
                        if (productClause[j].id === "creditDays") {
                            finalData.ComparativeAnalysis.splice((finalData.ComparativeAnalysis.length - 2), 0, productClauseObj);
                        } else {
                            finalData.ComparativeAnalysis.push(productClauseObj);
                        }
                    }
                    // productClausevendorList.itemTitle = productClause[j];
                    if (productClauseObj.itemId == "gstInput" || productClauseObj.itemId == "creditDays") {
                        nfaRequiredData.push(productClauseObj);
                    }

                }
                finalData.ComparativeAnalysis.push(productCashPrice);
                this.nfaVersionForCS = finalData.ComparativeAnalysis;

                // Create a Table for ComparativeAnalysis
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

            // Function to display the packing table
            showPackingTable: function (skuPackingData, vendorList) {
                this.nfapackingTable = skuPackingData; // for NFA print
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
            },

            // Value Help Request for the RFQ List
            onRFQValueHelpRequest: function (oEvent) {
                var sInputValue = oEvent.getSource().getValue(),
                    oView = this.getView();

                if (!this._pValueHelpDialog) {
                    this._pValueHelpDialog = Fragment.load({
                        id: oView.getId(),
                        name: "cpccomparativeanalysis.view.RFQListValueHelp",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._pValueHelpDialog.then(function (oDialog) {
                    // Create a filter for the binding
                    oDialog.getBinding("items").filter([new Filter("Ebeln", FilterOperator.Contains, sInputValue)]);
                    // Open ValueHelpDialog filtered by the input's value
                    oDialog.open(sInputValue);
                });
            },
            onRFQValueHelpDialogSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter("Ebeln", FilterOperator.Contains, sValue);

                oEvent.getSource().getBinding("items").filter([oFilter]);
            },
            onRFQValueHelpDialogClose: function (oEvent) {
                var sDescription,
                    oSelectedItem = oEvent.getParameter("selectedItem");
                oEvent.getSource().getBinding("items").filter([]);

                if (!oSelectedItem) {
                    return;
                }

                sDescription = oSelectedItem.getDescription();

                this.byId("rfqInput").setSelectedKey(sDescription);
                //this.byId("selectedKeyIndicator").setText(sDescription);
                this.getView().byId("RFQEventFilter").setVisible(true);
            },

            onSuggestionItemSelected: function (oEvent) {
                var oItem = oEvent.getParameter("selectedItem");
                var oText = oItem ? oItem.getKey() : "";
                this.byId("selectedKeyIndicator").setText(oText);

            },

            // Function triggers after change of filters
            onItemsFiltered: function (oEvent) {
                this.selectedEvents = this.getView().byId("RFQEventFilterValueHelp").getTokens();
            },

            onNFAPrint: function () {
                this.nfaVersionForCS; // This is for the CS data
                this.nfapackingTable; // This is for the packing table
                this.nfaMultiVendorPrice; // This is for the Table ( Only in case of multiple vendor Split) (CPC)
            }

        });
    });
