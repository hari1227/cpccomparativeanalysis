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
                this.nfaEvent = this.selectedEvents.slice(-1)[0];
                let filters = "?$filter=";
                for (let i = 0; i < this.selectedEvents.length; i++) {
                    filters = i ? filters + " or eventID eq '" + this.selectedEvents[i] + "'" : filters + "eventID eq '" + this.selectedEvents[i] + "'";
                }
                var url = "./comparative-analysis/RFQEventCompDetails" + filters;

                //Filters to be passed based on the selectedEvents
                $.get({
                    url: url, //"./comparative-analysis/RFQEventCompDetails",
                    success: function (resp) {
                        this.rfqItemsWithoutSum = resp.value;
                        this.showComparativeTable(resp.value);
                        // Backend call to get all the items sumed at vendor, event and sku level
                        // $.get({
                        //     url: "./comparative-analysis/RFQEventCompDetailsProj",
                        //     success: function (resp) {
                        //         this.showComparativeTable(resp.value);
                        //     }.bind(this),
                        //     error: function (error) {
                        //         console.log(error);
                        //     }
                        // });

                    }.bind(this),
                    error: function (error) {
                        console.log(error);
                    }
                });
                //this.getNFAPricingTableData();
                this.addSalesSummary();

                var nfaModel = new JSONModel();
                this.getView().setModel(nfaModel, "nfaModel");
                // this.nfaData = {
                // };

                // this.readNFAData("7000000026", "Doc652480915");
            },

            readNFAData: function (rfqNumber, eventId) {

                var data = {
                    "rfqNumber": rfqNumber,
                    "eventId": eventId,
                }
                // var token = this.fetchToken();
                var settings = {
                    async: true,
                    url: "./comparative-analysis/getcpcNfaDetails",
                    method: "POST",
                    headers: {
                        "content-type": "application/json"
                    },
                    processData: false,
                    data: JSON.stringify(data)
                };
                // this.getView().setBusy(true);
                $.ajax(settings)
                    .done(function (response) {
                        this.getView().getModel("nfaModel").setProperty("/", response.value[0]);
                        this.showNFAPackWisePrice(response.value[0].cpcNFAPackWisePriceDetails);
                        this.showNFAPricingTable(response.value[0].cpcNFAPackWisePriceDetails);
                    }.bind(this)).fail(function () {

                    });

            },
            // Calcualtion for pack wise data in NFA
            showNFAPackWisePrice: function (cpcPackWiseData) {

                var nfaPackWisePriceColumns = [], nfaUniquSKUs = [];
                var nfaPackObj = {}, nfaPackFinalData = [];
                // nfaPackWisePriceColumns.push({columnName: "SKUName"});
                //Get Column list
                for (var item of cpcPackWiseData) {
                    if (!nfaPackWisePriceColumns.includes(item.vendorName)) {
                        nfaPackWisePriceColumns.push({ columnName: item.vendorName });
                    }
                    if (!nfaUniquSKUs.includes(item.SKUName)) {
                        nfaUniquSKUs.push(item.SKUName);
                    }
                }

                var nfalookup = {};
                var uniqueColumnData = [];
                for (var item, i = 0; item = nfaPackWisePriceColumns[++i];) {
                    var name = item.columnName;

                    if (!(name in nfalookup)) {
                        nfalookup[name] = 1;
                        uniqueColumnData.push(nfaPackWisePriceColumns[i]);
                    }
                }
                uniqueColumnData.unshift({ columnName: "SKU Name" });

                for (var i in nfaUniquSKUs) {
                    let nfaFilteredData = cpcPackWiseData.filter(function (item) {
                        return item.SKUName == nfaUniquSKUs[i];
                    });
                    nfaPackObj = {};
                    nfaPackObj["SKU Name"] = nfaUniquSKUs[i];
                    for (let obj of nfaFilteredData) {
                        nfaPackObj.Vendor = obj.vendorName;
                        nfaPackObj["Last Purchase Price"] = obj.lastPurchasePrice;
                        nfaPackObj.MRP = obj.MRP;
                        nfaPackObj[obj.vendorName] = obj.finalFGPrice ? obj.finalFGPrice : "NA";
                    }
                    nfaPackFinalData.push(nfaPackObj);
                }
                uniqueColumnData.push({ columnName: "Last Purchase Price" });
                uniqueColumnData.push({ columnName: "MRP" });
                this.generateNFAPackWiseTable(nfaPackFinalData, uniqueColumnData);
            },

            // Create and bind multi vendor table in NFA template
            generateNFAPackWiseTable: function (nfaPricingData, uniqueColumnData) {
                this.nfaPackWisePrice = nfaPricingData;
                // Create a Table for ComparativeAnalysis
                var oTable = this.getView().byId("nfaPackWiseTable");
                var template;

                var nfaPackWiseFinalModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(nfaPackWiseFinalModel, "nfaPackWiseFinalModel");
                nfaPackWiseFinalModel.setData({
                    rows: nfaPricingData,
                    columns: uniqueColumnData
                });

                oTable.setModel(nfaPackWiseFinalModel);
                oTable.setVisibleRowCount(nfaPricingData.length);
                oTable.bindColumns("/columns", function (sId, oContext) {
                    var columnName = oContext.getObject().columnName;
                    if (columnName == "MRP") {
                        template = new sap.m.Input({
                            id: "editableInput",
                            value: "{" + columnName + "}"
                        })
                    } else {
                        template = new sap.m.Label({
                            text: "{" + columnName + "}",
                            wrapping: true
                        });
                    }
                    return new sap.ui.table.Column({
                        label: new sap.m.Label({
                            text: columnName,
                            wrapping: true
                        }),
                        template: template
                    });
                });

                oTable.bindRows("/rows");
                //oTable.bindItems("nfaPricingTable>/", aColList);
            },

            // getNFAPricingTableData: function () {
            //     //Get NFA relavent Data
            //     //Fetch Awarded scenarios

            //     var settings = {
            //         async: true,
            //         url: "./comparative-analysis/CPCAwardedScenarios",
            //         method: "GET",
            //         headers: {
            //             "content-type": "application/json"
            //         },
            //         processData: false
            //         //  data: JSON.stringify(data)
            //     };
            //     $.ajax(settings)
            //         .done(function (response) {
            //             //this.getView().getModel("nfaPricingTable").setProperty("/", response.value);
            //             this.showNFAPricingTable1(response.value);
            //         }.bind(this)).fail(function () {
            //             MessageBox.error("error:" + error.message);
            //         });
            // },
            // Calculate multi vendor pricing table columns and rows 
            showNFAPricingTable: function (cpcPackWiseData) {
                var nfaPricincingColumns = [], nfaUniqueVendors = [];
                var nfaPackObj = {}, nfaPackFinalData = [];
                nfaPricincingColumns.push({ columnName: "Vendor" });
                //Get Column list
                for (var item of cpcPackWiseData) {
                    if (!nfaPricincingColumns.includes(item.SKUName + "-Quantity") && !nfaPricincingColumns.includes(item.SKUName + "-Price")) {
                        nfaPricincingColumns.push({ columnName: item.SKUName + "-Quantity" });
                        nfaPricincingColumns.push({ columnName: item.SKUName + "-Price" });
                    }
                    if (!nfaUniqueVendors.includes(item.vendorName)) {
                        nfaUniqueVendors.push(item.vendorName);
                    }
                }

                var nfalookup = {};
                var uniqueColumnData = [];
                for (var item, i = 0; item = nfaPricincingColumns[++i];) {
                    var name = item.columnName;

                    if (!(name in nfalookup)) {
                        nfalookup[name] = 1;
                        uniqueColumnData.push(nfaPricincingColumns[i]);
                    }
                }
                uniqueColumnData.unshift({ columnName: "Vendor" });
                uniqueColumnData.unshift({ columnName: "Order" });

                for (var i in nfaUniqueVendors) {
                    let nfaFilteredData = cpcPackWiseData.filter(function (item) {
                        return item.vendorName == nfaUniqueVendors[i];
                    });
                    // let orderData = this.SKUVendorOrderonAverage.filter(function(item){
                    //     return item[0].includes(nfaUniqueVendors[i]) && item[0].includes(this.nfaEvent);
                    // }.bind(this));
                    nfaPackObj = {};
                    nfaPackObj.Order = this.SKUVendorOrderonAverage[nfaUniqueVendors[i] + "(" + this.nfaEvent + ")"];
                    for (let obj of nfaFilteredData) {
                        nfaPackObj.Vendor = obj.vendorName;
                        nfaPackObj[obj.SKUName + "-Quantity"] = obj.finalQuantity ? obj.finalQuantity : "NA";
                        nfaPackObj[obj.SKUName + "-Price"] = obj.finalFGPrice ? obj.finalFGPrice : "NA";
                    }
                    nfaPackFinalData.push(nfaPackObj);
                }

                //Sort data based on the Order
                nfaPackFinalData.sort((a, b) => {
                    let fa = a.Order.toLowerCase(),
                        fb = b.Order.toLowerCase();

                    if (fa < fb) {
                        return -1;
                    }
                    if (fa > fb) {
                        return 1;
                    }
                    return 0;
                });
                this.generateNFAMultiVendorTable(nfaPackFinalData, uniqueColumnData, "nfaMultiVendorTable1");
            },

            // // Calculate multi vendor pricing table columns and rows 
            // showNFAPricingTable1: function (nfaPricingData) {
            //     var filteredNFAData;
            //     var nfaPricingObj = {}, nfaPricingFinalData = [];
            //     var nfavendorList = [], lookup;
            //     var columnData = [];

            //     //Get Unique vendor list from NFA Data
            //     lookup = {};
            //     for (var item, i = 0; item = nfaPricingData[i++];) {
            //         var name = item.vendorMailId;

            //         if (!(name in lookup)) {
            //             lookup[name] = 1;
            //             nfavendorList.push(name);
            //         }
            //     }
            //     for (var i = 0; i < nfavendorList.length; i++) {

            //         filteredNFAData = nfaPricingData.filter(function (item) {
            //             return item.vendorMailId == nfavendorList[i];
            //         });
            //         // nfaPricingObj.vendor = this.vendorList[i].itemTitle;
            //         nfaPricingObj = {};
            //         for (var nfaData of filteredNFAData) {
            //             nfaPricingObj.Vendor = nfaData.vendorName;
            //             nfaPricingObj[nfaData.SKUName + "-Quantity"] = nfaPricingObj[nfaData.SKUName + "-Quantity"] ? nfaPricingObj[nfaData.SKUName + "-Quantity"] + nfaData.quantity : nfaData.quantity;
            //             nfaPricingObj[nfaData.SKUName + "-Price"] = nfaPricingObj[nfaData.SKUName + "-Price"] ? nfaPricingObj[nfaData.SKUName + "-Price"] + nfaData.price : nfaData.price;
            //             columnData.push({ columnName: nfaData.SKUName + "-Quantity" }, { columnName: nfaData.SKUName + "-Price" });
            //         }
            //         nfaPricingFinalData.push(nfaPricingObj);

            //     }
            //     //Get unique column names
            //     var nfalookup = {};
            //     var uniqueColumnData = [];
            //     for (var item, i = 0; item = columnData[++i];) {
            //         var name = item.columnName;

            //         if (!(name in nfalookup)) {
            //             nfalookup[name] = 1;
            //             uniqueColumnData.push(columnData[i]);
            //         }
            //     }
            //     uniqueColumnData.unshift({ columnName: "Vendor" });
            //     for (var i in nfaPricingFinalData) {
            //         for (var columnName of uniqueColumnData) {
            //             if (!nfaPricingFinalData[i][columnName.columnName]) {
            //                 nfaPricingFinalData[i][columnName.columnName] = "NA";
            //             }
            //         }
            //     }
            //     //console.log(nfaPricingFinalData);
            //     //this.getView().getModel("nfaPricingTable").setProperty("/", nfaPricingFinalData);
            //     this.generateNFAMultiVendorTable(nfaPricingFinalData, uniqueColumnData, "nfaMultiVendorTable");
            // },

            // Create and bind multi vendor table in NFA template
            generateNFAMultiVendorTable: function (nfaPricingData, uniqueColumnData, tableID) {
                this.nfaMultiVendorPrice = nfaPricingData;
                // Create a Table for ComparativeAnalysis
                var oTable = this.getView().byId(tableID);
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

            // Calculate different data set for CS and bind to the CS table 
            showComparativeTable: function (rfqItems) {
                //Data for NFA
                var nfaRequiredData = [];
                this.nfaProductClauseTable = [];
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
                // productSKUAverage.itemTitle = "Average Price";
                productSKUAverage.Particulars = "Average Price";
                // productSKUTotal.itemTitle = "TOTAL";
                productSKUTotal.Particulars = "TOTAL";
                for (var i = 0; i < uniqueProducts.length; i++) {
                    var filteredData = this.rfqItemsWithoutSum.filter(function (ca) {
                        return ca.itemTitle == uniqueProducts[i];
                    });
                    productData = {};
                    //  productData.itemTitle = uniqueProducts[i];
                    productData.Particulars = uniqueProducts[i];
                    // For sku packing data - start
                    productSKUData = {};
                    // productSKUData.itemTitle = uniqueProducts[i];
                    productSKUData.Particulars = uniqueProducts[i];
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
                    // productSKUData.itemTitle = uniqueProducts[i];
                    //productSKUData.Particulars = uniqueProducts[i];
                    // For sku packing data - end
                    let tempSKUData = [];
                    for (var filData of filteredData) {

                        productData[filData.vendorName + "(" + filData.eventID + ")"] = filData.finalFGPrice;
                        //Code for Packing table - start 
                        productSKUData[filData.vendorName + "(" + filData.eventID + ")"] = filData.finalFGPrice * productSKUData.PLAN

                        if (productSKUTotal[filData.vendorName + "(" + filData.eventID + ")"]) {
                            if (!tempSKUData.includes(filData.itemTitle + filData.eventID + filData.vendorName)) {
                                productSKUTotal[filData.vendorName + "(" + filData.eventID + ")"] = productSKUTotal[filData.vendorName + "(" + filData.eventID + ")"] + productSKUData[filData.vendorName + "(" + filData.eventID + ")"];
                            }
                        } else {
                            productSKUTotal[filData.vendorName + "(" + filData.eventID + ")"] = productSKUData[filData.vendorName + "(" + filData.eventID + ")"];
                        }

                        productSKUAverage[filData.vendorName + "(" + filData.eventID + ")"] = productSKUTotal[filData.vendorName + "(" + filData.eventID + ")"] / productSKUTotal.PLAN;
                        tempSKUData.push(filData.itemTitle + filData.eventID + filData.vendorName);
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
                var productCostObj, productTotalCost = {}, productSKUAveragePriceCD = {},
                    cashDiscountData, nfaVendorCashDisc = {};
                // productSKUAveragePriceCD.itemTitle = "Average Price with CD";
                //  productTotalCost.itemTitle = "TOTAL-- Rs./Lt";
                productSKUAveragePriceCD.Particulars = "Average Price with CD";
                productTotalCost.Particulars = "TOTAL-- Rs./Lt";

                for (var j in costFields) {
                    productCostObj = {};
                    productCostObj.itemId = costFields[j].id;
                    // productCostObj.itemTitle = costFields[j].name;
                    productCostObj.Particulars = costFields[j].name;

                    for (var k in vendorList) {
                        if (vendorList[k].vendorName !== "itemTitle") {
                            //productClauseObj[vendorList[k].vendorName] = vendorList[k][productClause[j].id];
                            var filteredCostData = this.rfqItemsWithoutSum.filter(function (ca) {
                                return ca.vendorMailId == vendorList[k].vendorMailId;
                            });
                            //Math.max(...filteredCostData.map(item => item.quantity))
                            //var recordswithMaxQuan = Math.max.apply(Math, filteredCostData.map(function(item) { return item.quantity; }));
                            var recordswithMaxQuan = filteredCostData.reduce((p, c) => p.quantity > c.quantity ? p : c);

                            productCostObj[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] = recordswithMaxQuan[costFields[j].id];
                            if (costFields[j].id !== "cashDiscount") {

                                if (productTotalCost[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"]) {
                                    productTotalCost[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] = productTotalCost[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] + parseInt(recordswithMaxQuan[costFields[j].id]);
                                } else {
                                    productTotalCost[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] = parseInt(recordswithMaxQuan[costFields[j].id]);
                                }
                            } else {
                                productSKUAveragePriceCD[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] = productSKUAverage[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] - productSKUAverage[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] * parseInt(productCostObj[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"]) / 100;
                                nfaVendorCashDisc.Particulars = costFields[j].name;
                                nfaVendorCashDisc[vendorList[k].vendorName] = recordswithMaxQuan[costFields[j].id];

                            }


                        }

                    }
                    finalData.ComparativeAnalysis.push(productCostObj);
                    // productClausevendorList.itemTitle = productClause[j];
                    // if (productCostObj.itemTitle == "Cash Discount in %") {
                    if (productCostObj.Particulars == "Cash Discount in %") {
                        skuPackingData.push(productCostObj);
                        nfaRequiredData.push(productCostObj);
                        cashDiscountData = productCostObj;
                        this.nfaProductClauseTable.push(nfaVendorCashDisc);
                    }

                }
                skuPackingData.push(productSKUAveragePriceCD);

                // Calculate Vendor order based on Average Price on Cash Discount -- start
                this.SKUVendorOrderonAverage = {};
                let arrSKUVendorOrderonAverage = [];
                this.SKUVendorOrderonAverage.Particulars = "Order";

                for (let vendor in productSKUAveragePriceCD) {
                    if (vendor.includes(this.nfaEvent)) {
                        arrSKUVendorOrderonAverage.push([vendor, productSKUAveragePriceCD[vendor]]);
                    } else {
                        arrSKUVendorOrderonAverage.push([vendor, "NA"]);
                    }
                }
                arrSKUVendorOrderonAverage.sort(function (a, b) {
                    return a[1] - b[1];
                });
                let count = 0;
                arrSKUVendorOrderonAverage.forEach(function (item) {
                    if (item[1] !== "NA") {
                        count++;
                        this.SKUVendorOrderonAverage[item[0]] = "L" + count;
                        item[2] = "L" + count;
                    } else {
                        this.SKUVendorOrderonAverage[item[0]] = ""; // Order is not relavent for the previous events
                        item[2] = "NA";
                    }
                }.bind(this))
                skuPackingData.push(this.SKUVendorOrderonAverage);
                //console.log(this.SKUVendorOrderonAverage);
                // Order List --end
                finalData.ComparativeAnalysis.splice((finalData.ComparativeAnalysis.length - 1), 0, productTotalCost);

                // Logic for the SKU clause fields
                var productClause = [{ id: "shelfLife", name: "Shelf Life" },
                { id: "gstInput", name: "GST Input" },
                { id: "creditDays", name: "Credit Days" }];
                var productClauseObj;
                var productCashPrice = {};
                var nfaproductClauseObj = {};
                // productCashPrice.itemTitle = "Cash Price of FG";
                productCashPrice.Particulars = "Cash Price of FG";
                for (var j in productClause) {
                    productClauseObj = {};
                    nfaproductClauseObj = {};
                    productClauseObj.itemId = productClause[j].id;
                    //  productClauseObj.itemTitle = productClause[j].name;
                    productClauseObj.Particulars = productClause[j].name;
                    nfaproductClauseObj.Particulars = productClause[j].name;
                    for (var k in vendorList) {

                        if (vendorList[k].vendorName !== "itemTitle") {
                            productClauseObj[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] = vendorList[k][productClause[j].id];
                            nfaproductClauseObj[vendorList[k].vendorName] = vendorList[k][productClause[j].id];
                        }
                        // Calculate the cost price in FG
                        productCashPrice[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] = productTotalCost[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] - (productTotalCost[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] * cashDiscountData[vendorList[k].vendorName + "(" + vendorList[k].eventID + ")"] / 100);
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
                        this.nfaProductClauseTable.push(nfaproductClauseObj);
                    }

                }
                finalData.ComparativeAnalysis.push(productCashPrice);

                //#region - Temp fix for currency format
                const domesticFieldIdentifiers = {
                    itemId: [
                        "bulkCost",
                        "tollCharges",
                        "freightIns",
                        "pmCost",
                        "otherExpenses",
                    ],
                    itemTitle: [],
                    Particulars: [
                        "Totto 500 ML",
                        "Chlorveer Strong 1 Litre",
                        "Chlorveer Strong 500 ml",
                        "Chlorveer Strong 5 Litre",
                        "Cash Price of FG",
                        "TOTAL-- Rs./Lt"
                    ]
                }

                finalData.ComparativeAnalysis = this.currencyFormatter(finalData.ComparativeAnalysis, domesticFieldIdentifiers);
                //#endregion - Temp fix for currency format

                this.nfaVersionForCS = finalData.ComparativeAnalysis;
                //console.log(this.nfaProductClauseTable);

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
                        text = vendorList[i].vendorName + "(" + vendorList[i].eventID + ")";
                    } else {
                        text = "Particulars"; //vendorList[i].vendorName;
                    }
                    var cell1 = new sap.m.Text({
                        text: "{" + text + "}",
                        textAlign: sap.ui.core.TextAlign.Right
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

                //#region - temp fix for currency format
                const domesticFieldIdentifiers = {
                    Particulars: [
                        'TOTAL', 'Average Price',
                        'Average Price with CD',
                        "Totto 500 ML",
                        "Chlorveer Strong 1 Litre",
                        "Chlorveer Strong 500 ml",
                        "Chlorveer Strong 5 Litre",
                    ],
                }
                skuPackingData = this.currencyFormatter(skuPackingData, domesticFieldIdentifiers);
                //#endregion - temp fix for currency format

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
                        text = vendorList[i].vendorName + "(" + vendorList[i].eventID + ")";
                    } else {
                        text = vendorList[i].vendorName == "itemTitle" ? "Particulars" : vendorList[i].vendorName;
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
                        let aFilters = [];
                        aFilters.push(new Filter({
                            filters: [
                                new Filter({ path: "Ebeln_Ebeln", operator: 'EQ', value1: this.byId("idInputRFQNumber").getValue() }),
                            ],
                            and: true
                        }));
                        // For Desktop and tabled the default table is sap.ui.table.Table
                        if (oTable.bindRows) {
                            // Bind rows to the ODataModel and add columns
                            oTable.bindAggregation("rows", {
                                path: "/RFQEvents",
                                filters: aFilters,
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
                //oEvent.getSource().getBinding("items").filter([]);

                if (!oSelectedItem) {
                    return;
                }

                sDescription = oSelectedItem.getTitle();

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
                let selectedEvents = this.getView().byId("RFQEventFilterValueHelp").getTokens();
                this.selectedEvents = [];
                //let rfqNumber = this.getView().byId("rfqInput").getValue();
                let filters = "?$filter=";
                for (let i = 0; i < selectedEvents.length; i++) {
                    filters = i ? filters + " or eventID eq '" + selectedEvents[i].getKey() + "'" : filters + "eventID eq '" + selectedEvents[i].getKey() + "'";
                    this.selectedEvents.push(selectedEvents[i].getKey());
                }
                var url = "./comparative-analysis/RFQEventCompDetails" + filters;

                //Filters to be passed based on the selectedEvents
                $.get({
                    url: url, //"./comparative-analysis/RFQEventCompDetails",
                    success: function (resp) {
                        if (resp.value.length > 0) {
                            this.rfqItemsWithoutSum = resp.value;
                            this.showComparativeTable(resp.value);
                        }

                    }.bind(this),
                    error: function (error) {
                        console.log(error);
                    }
                });
                //this.getNFAPricingTableData();
                this.addSalesSummary();

                var nfaModel = new JSONModel();
                this.getView().setModel(nfaModel, "nfaModel");
                // this.nfaData = {
                // };
                this.nfaEvent = this.selectedEvents.slice(-1)[0];
                //this.readNFAData(rfqNumber, this.nfaEvent);

            },

            handleNFASave: function () {
                var sData = this.getView().getModel("nfaModel").getProperty("/");
                var finalData = JSON.parse(JSON.stringify(sData));
                // Collect SKU with MRP Data
                let packWiseTableRows = this.getView().byId("nfaPackWiseTable").getRows();
                let objSKUMRPDetails = {}, arrSKUMRPDetails = [];
                for (let item of packWiseTableRows) {
                    objSKUMRPDetails = {};
                    objSKUMRPDetails.SKUName = item.getCells()[0].getText();
                    objSKUMRPDetails.eventID = this.nfaEvent;
                    objSKUMRPDetails.Ebeln = "7000000026"; //this.rfqNumber;
                    objSKUMRPDetails.MRP = item.getCells()[5].getValue();
                    arrSKUMRPDetails.push(objSKUMRPDetails);
                }
                finalData.cpcSkuMRPDetais = arrSKUMRPDetails;

                var settings = {
                    async: false,
                    url: "/comparative-analysis/cpcNFADetails",
                    method: "POST",
                    headers: {
                        "content-type": "application/json"
                        // "X-CSRF-Token": token
                    },
                    processData: false,
                    data: JSON.stringify(finalData)
                };
                this.getView().setBusy(true);
                $.ajax(settings)
                    .done(function (response) {
                        this.getView().setBusy(false);
                        MessageBox.success("Data Saved Successfully");
                    }.bind(this)
                    )
                    .fail(function (error) {
                        this.getView().setBusy(false);
                        var errorMessage = error.responseJSON.error.message;
                        if (errorMessage.startsWith("Reference integrity is violated for association")) {
                            var associatedField = error.responseJSON.error.target.split(".")[1].toLowerCase();
                            MessageBox.error("Invalid value for field : " + associatedField);
                            throw new Error("");
                        } else if (errorMessage.startsWith("Entity already exists")) {
                            MessageBox.error("Entity already exists");
                            throw new Error("");
                        }
                        else {
                            MessageBox.error(error.responseText);
                            return;
                        }
                    }.bind(this));
            },

            // Print NFA PDF format
            onNFAPrint: function () {
                // Dynamic data from services
                const nfaVersionForCS = this.nfaVersionForCS; // This is for the CS data
                const nfapackingTable = this.nfapackingTable; // This is for the packing table
                const nfaMultiVendorPrice = this.nfaMultiVendorPrice; // This is for the Table ( Only in case of multiple vendor Split) (CPC)
                const nfaOtherData = this.getView().getModel("nfaModel").getProperty("/"); // Other details like Qunatity, Payment Plan, Justification
                const nfaProductClauseTable = this.nfaProductClauseTable; // This for the Cash Discount, gst and credit days table 
                const nfaPackWisePrice = this.nfaPackWisePrice; // Pack Wise Table. In case columns are required seperately refer function-> showNFAPackWisePrice
                
                // NFA fields
                const currentDate = new Date().toLocaleDateString("en-GB");
                const subject = "Ariba Event Subject";

                const tempData = {
                    purchaseSalesSummary: {
                        columns: [{
                            field: "summary",
                            label: "Sales Summary"
                        }, {
                            field: "fy",
                            label: "FY"
                        }, {
                            field: "qty",
                            label: "QTY in KL"
                        }, {
                            field: "purchaseSummary",
                            label: "Purchase Summary"
                        }, {
                            field: "rsLt",
                            label: "Rs./Lt"
                        }],
                        listing: [{ summary: "Sales Plan", fy: "22-23", qty: 245, purchaseSummary: "Stock Price on 01.02.22", rsLt: 188 }, { summary: " Stock as on", fy: "4/1/2022", qty: 569, purchaseSummary: "Purchase Price22-23", rsLt: 220 }, { summary: "Sales Plan", fy: "22-23", qty: 245, purchaseSummary: "Stock Price on 01.02.22", rsLt: 188 }, { summary: " Stock as on", fy: "4/1/2022", qty: 569, purchaseSummary: "Purchase Price22-23", rsLt: 220 }, { summary: "Sales Plan", fy: "22-23", qty: 245, purchaseSummary: "Stock Price on 01.02.22", rsLt: 188 }, { summary: " Stock as on", fy: "4/1/2022", qty: 569, purchaseSummary: "Purchase Price22-23", rsLt: 220 }]
                    },
                    packingQuality: "Quality of product as well as packing shall be as per specifications of BIS/IS quality is not meeting with the requirements, material will be returned to the concern supplier with all attendant costs to their account.",
                    productTesting: "Product shall be tested at NABL accredited laboratory, or any other government approved & recognized lab and the reports shall be acceptable to both of us.  In the event of product failure, we shall return the product to the Supplier with all attendant costs to their account.  Also, cost of deficiency in the active ingredients or any other component of the product for the used quantities will be recovered from the Supplier for the quantities accepted by CFCL.",
                    otherTerms: "As per our Purchase Indent to follow.",
                };

                // Util functions
                const getKeys = (data, ignoreProp) => {
                    let keys = data;
                    if (Array.isArray(data) && data.length > 0) keys = Object.keys(data[0])
                    else if (typeof data === "object") keys = Object.keys(data);

                    if (!!ignoreProp && !!keys.length) {
                        keys = keys.filter((key) => key !== ignoreProp);
                    }

                    return keys;
                }

                const getAlignment = (index) => index === 0 ? "" : "text-align: right;";

                // Variables
                const cssVariables = `--padding-buffer: 10px;`;
                const cellStyle = "padding: 10px;word-wrap:break-word;";
                const dictGridStyle = "margin: var(--padding-buffer) 0px; display: grid; grid-template-columns: 1fr 2fr;";
                const tableStyle = "border-collapse: collapse;table-layout: fixed;width: 100%;font-size: 1vw;"
                const extraMargin = "margin-top: 30px;";

                //region - company Logo source
                const companyLogo = `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACrCAYAAACE5WWRAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAhBElEQVR42u2deXhU5dXAf+fOTDaysilJgKiQgFHQakVlm+BuXdpa3D+t36fSKiSA1q21jdpWrQskqJTa1rq3YKmVugtJQFxQtIoBEpCwhCCGLSSQZWbu+f6YAAIJuUnmzkySOc/D8yThvXfee9/fnPe85z3nvEJEWpd8t5M+5kBwHoNqBkoGaCpCH5S+QB/QJJDY5isSAUfzz7sABZqAHSg7EHagbEfYgMhGTHMThmMdOxZVkI/ZnV6dROhplkfO7UVU42koJyEyEhgBmg0SFYRPr0d0FSorQT4HXUZMwmdMWrA3AlZXkxnuZBwyAVPHIowGTgacYdRDL7ACpBhhIfVNi7lzaW0ErHCUAvcJCD9AuQAYHWYgWQBNP0DlNQzjVXIXfR0BK5QyMycL0SuBK4Dh3ejJvgKdiynPM614fQSsYEjhBYmw9xrgRlS+182/Ogq8j/Isnqi/84t39kTACjhQ405GjVuAK4H4Hmg57gKeRWU2U4vKImB13nYaA9wJ/CCy0t2vx5Zi6MPkliyIgNUeyccg2T0R0XtARkRIapWwD8D4HXlFb0TAanPKc58N+nAPsJ8CKR9hGL9kyqJFEbAOX+GNwtAZKGdEOOnwiL8NjunkLlwZAWvG2AEYRj5wI4gRoaPT4gX9K2L+itwl1T0PrLkTHVRVT0X4DZAQ4SHgsg2V25ha9FzPAevxnGwc+hdgVGT8bZcSVCYF0kURfmDlu52k6N3Ar4K0ARwR/+pxL8gd5BY/haDdC6wnJgzGZ74AjIkMdMjkXXzGDUxftLkzNwkfQ7hw/FX4zC8iUIVczsFh/peCnAu7tsbKnxhFcnUhwqTImIbX3Ijogxzd/9dcPs/XtcDyuxFeATkzMo5hK0WI74r2uiVCB9bMnFGIOR8kNTJ2YS8VwCXkFX8V3jbWDPcPEXNRBKouI8cAHzDTfZHVC4IfQTnTPRlhJoiji7/sXUA1sB2oA2oR8X7HRElEcYAmgiSBDgSJ68LPm4BwB/Cf8AOrIOf3oHd3oZfpAUoR/RJTvgTKMKWCXvEVHUp0mHN2Eo2ahpoZwAn+f3oCcDwQ3Z1UXHBsLEUozHkMdFqYv48G0MWoUQLyPmb9J0z/sD4oK+M+276Pj/EYOg5lNOEZqLiEvOJx4QGWIhSOfwLkljCFaTsi8zH1NWITFoVFylX+xCiSt+WA/gjhUuDoCFiHTX/jnwxDqBpB/4nBC0TVvcek5Z6w1aH5GPQePxo1bgC9HOgVAavA/SBwVxgN09cgT+EwnmXywu1dznDZlySicjNwUs8Eq8B9F/BgmAzJRwiPsaN4frdJZS+ccC6Yd6O4ew5YBeNvAPlrGLz+T1C5l6lFb9NdZcb4MxC5F+GC7g1Wwfgc4K0Qh7ysR+Q2phT9KxAhIF1CZo4/B5HHgBPDAazAet5nuYeB/DOEUHmAh4hJyCa3aH6PgQpgasm7DOh3Mqo3A9tC3Z3AaawZ7mQMlgFDQ/Mouhhx/tzuJIGKjIxkj8ubpaLDgFRBkhRNACMeNB4kEbQWqBPVOkR2K7pbRbaCuVpFVg9fvdnehUPh2H6YzgJEr+raU6EizBr/KiqXhACo3YjkMaX42UBrqNLs9N5OD+OBHBVGiDIc6B+AW28HylRkhSjFLo+z6NiKiq2Bnx7dFyHMBtK7Jlgzc+5B9HchUFOf4+NyphevDcz3A6M8My1HRc4zlAnqL20UjI16BVaqsNAw9V1PVPI72aWlTQG585yzk2jw/hn4SdcCa4bbjcF7HKhkFyz5I4lM44bihs7eqCwzdRgYV4JeD5IRBvbJToV5YDyfVb7x/YDMKIU508B8sJP2b5DAmuFOxtAvQAYF8b3XIjqJ3JKXOzfNZUc5PTXXATcS3plAK0H+qlL/p2Fl2zpXeG1mzihE/wUMCO9VoaFPBhcq3YhpjuoMVGuGDIkuz0y/2empWQs8Tfinlx0P+qhoTGV5ZvpDpdnpvTu+ciz6GK85CvRLuzvdcbAK3FeCXB1EqFYiMpppi1d15Oqq1NS48qEDbzeNhvUKc4CBXcyhkKhwp9NDRVnmwN91GLDbFm+iwTsG9I3wA+tRd19gVhBf6sc4nOPILa7syMXlQ9Muqo2XUhV9hPCJFOgwYKD3uDysXZ2VnqcdGcM7l9YyoP8lwAvhBZaLGUDf4CgqXUSD55yObBqvzhqYWpaZ/pyKLAgHozzAy8gUUWaWZw5cvGpYevu97ZfP85FbfB3oU+EBVuGEc4Frg7M80tfY1f+C9lYLVpDVWel5oloO/A/dWnS0YbLcb39lt2/FJyi5JZNBZocWrMILolHzqSC9sffxNl1J/rx2+XO+PvbYpDVD0+eKMpPQxi4FU1x++6tmaXnmoGPbD1fRrcCzoQNLG/KA44LgyCnFF31pe8OCV2cNPNXrbPpMJSDOwK4opyrmZ+VD0y9rN1wD+v0fwqvBB6twbD/Qe4LwcipR54VMf3tH+wz09FxRXQocS8+WJBXmlQ9Nf7hdhv3l83x4G69GWRpcsNRxP5Bk80vZjsE55L23sT32VHlm+kMqFACR6jT7rFPhjvLM9FcqMjJiLF81/cN6oqN+jLApOGAVTjgOv4fa3oWO6A1MKV7dDqgc5Znpf1J/xeSIHC4/aoryvr46q6/1onU/f+dbMC8F6u0HS817sT8HsV2lo9cMGRJdlpX+jyAA39VlgmjMwjVDju5n+YrcxZ+DTrIXrIJxQ4FrbFZWH7CTe622Ls3OjjKN+gWiXBbhxpJ83zSc71VkZCRbviKv5HmQZ+wDS+RX9mor3QGuq8gv9lq1qZye3U+DnBPhpV0yoinK++922VwNTXn4C4IEGKxCdzoqV9n7vMb/tsdYL88c+BjodRFOOiTjPC7PP9RqiNOdS2sRvR70yJlNT7rj2weWyWTAZeOD/p28on9bbVyWmXZ3F0jTD2tRkUvKsgY+ad3eKlmCGo+1+v9zLo7De7hJ0jpYj5zbC9GbbHzGWnzG7dahSr8Q5HcRNALhi9BJ5UPTrBvnZsNvgPUt/l9j3Y2IJFkHy+W5HqS3jY+Xb7WA6pohaen4txwiBzAFTnPNLB+adpKlxtM/rAedftjfZ7gzUPMBMKutgyVq3zJeKCVmt6WwmyI3TtPgZYIVTdFzJAZkrmUfV17Jv4A3DprRDH3Rn5VkVFkDqyDnFPyJBLZ8WUB/brUQR2rVwPtBIpWUbdFaDBWNtR5XJ7Ez9hvrUU0L9teOdblWWdRYaqfT8VVyS5ZYabg6K3U0aMSrbi9e11vetM59s5FZ7lPx8hmQ0zz7bPJ769sCq/CCaMA+F4PB7y2qNYeo8QThVIu++2qumaXZ/Y5c6G3GuOEUuJ/H1I/5blKyynstNXe2sAI4D7Frs1nfYUrJp5ZWgVlpU0RDUqqnJ0q60xNzD3AgemXuRAdbtp2Eqht/GNLp+wzkg3nR16yBJTrRPqPdsKStSrMzjhaPNz8y3p2TPS6Db+IdNDiN/b97HX4w9joFryH4DNgZ42BHrPOO/jdkDPo2znAhDGFL9XAg9sjrcK0iru71tsEqvCAarb/Ypuf8iNyiEisNnR7vI9gfotPdpjM+SovjreN6sTw1lspEJ/XOdlkRDvbtCVsuVCAzWluEHQyW7J2Aij0Dqlhybvqzkrk6gop1eX9gHA+N6cua3kENR9tAIk+0qhwO+s3H+Ta5INezq9hiHpvjLtCIwW5BNic4uW98P0oGBzu0X01M+emRyhscorE43x7bir9YKdG49rjUgT70qggybcuy1FimnncU2+OCfwYEwl1MKy4+ojmz/6dZ447BlEwbuuHDa1iK6/E55C4i4cVtyt9GJvOHM/vgM0Kyw/U7ckseadNOPjCqcrYt06CwxMqe4KphaX0w5YYINkeW50Ym8+CYUOxu6V7EmEJukaXasgdsGZHRNnVorqWOmMaVQGwEndbln8MT+f3okGyZvo7DebJVqA6xsfSMwAcPqInpnG+x7f9E0GldSvvFkD++Hxqk2S+5wefbFe14HvQpppZ80uYFz7hj2IuTW4vrDoDlL/JhR+3QT5m6sM0SiCuHpw/Fx2kRfFqWPS6DaecdRZOj41Q5TYjzmM0/K72afzYUkhp89N3r4+g9XtJ2exm1eS/Z1Y0OQ5mdVV75iaUPqNGfY8Q9dbDGcnI6dsQ6KW9Zmwb1OpBIrFUrMvvUFDYktR7IG+1Vhm1vJGOXh8E1HgbVeDi6zktKg4/kBh8p9SYO7VB51muBZW22etIdj5cbyH1zxsFgCSPtWZY6LBXuF9vj6ruubItz8MKJSYe8LzhlSwNnVdRx8jcNnPBtIy7TlsrjVyhMFdpwFXmZATS0YGPpCBsUVj07+7S54bxy+IDB+IJQD6KLyosnJlPv8q+xUhp8XL2ihh+W1TKoJijnSvUvy0o/gbLK1isAFuRc7g+zOrhiTTNYYsNpBvqJlUoxhuk8ix5U57+9UjI4FlG45qsapn20nfimoB8FlAO0DFbBhDPB/LP/F/OTg90N+ROjbDLcP7I2DWpOBJ9WVL7LoKxPDI+8t5V7F1eHAipEaXl8ZuWMBvMtoDm0Wd8/GKyUrYOxIyFV5TOLLd0RhFpd/HDbh9u4uLw2lL0Yf1geYoH7ekx9+wBUrCBv8ZqDp0KVDFs87mq2WZl37XHpQ3yBOzWh20ms1+SGL3aFuhvJa4ekjmBt1ec8NSYFj3MGcP0hgz3vMPcGIoNt6EwDNcaathr5HLaeVNUtRMLA/Nwd6xhJgXscHv010PuwNaEpzx8OFmTY0JcKi7UYsiLohK9sj3Myf1gCfzolpQBIbNFzoDKPaUXrWwBLB9iwlWOxkIRmRXJQw0u2xTlYlNGLt4fE81FaHF6/pyOxVStQ5dGW/sOJ0NeG1f56a/a9ZEnE0xAy2RXjYG1vF1+nRLOybxTL0mJZl9KeqCX5G9MWfdYyWGpHGr1UWbQfMiPDa+9Uti3WwTfxTqrjHGyNd7K1l4P1yVGsTXF1NkhwF1GuVg+Sd2JH6rq0fcJnRUZGTBPePpHh75jURRlsSHKxIcnF+hQXlQlRbI81qO7loDrOyY5Y575pzCZXiN7cUqLqd8EKfPKEqW1WPPY6GxLsrz7ZfaTJISzK6EVxRhwfp8VSleAKYW/0KaaWzDtSCyd2hAIbsrNtV0N0vKgvQkwbUhtt8NeTUnj5hER2xjjCoUtvsbN/mzXKnEC0DUQ3tt3GlxDB5kgLG5g/LJGHR/ehJtoRLr36gKbon1jZA3aCRgV8yW8aFo4pMRMiZRlalppoB784p38I0rpal357vcurE53nkffOHivtndizT9hmTIdhOuNUzAhFh8i6lChuvmgAmxJdYdOnK0pruOvD7Q+fvGJjnaULZo07xgniI9Cqw2EFVivTZc+SNb2j+OmlaWyLC4+pL6HR5P7ib7lwbR3AHssXmsbVTqCJQBewVbPNBYGor1YlMhXuk297Obnp4tSwgSpn/R5+vXgbqbX7Jh+xFmLx+IQ08I1z+jWHBHYyNwwLYBm1EZz80ugUbr5oAFviQ+9+ObWqgdxl2xm1+dATT8zd1mYrvQ2k2gkS+BhX09emb8wwXbU+hydCFfCHM/uyqm90yD7fZSpnVezhmhU1nLa55SN0BEfbimDmWSPANxnlYSewGzgqsF2VNj3qMY2NtR5XZCr8qn80L52QGPTPjfYq399Sz9lf7+Gcijr67j2yT1HMpiODlY+B4fsjigtluRPYTuBDk9vcJkqtqtpblpley4EoxB4pD47uhxnAzDdRSGgOYY7zmET7lMRGk971XtJ3ezl2ZxMnVDeS3b7MHk9NUtou+Kb1Finu6Shn+FWg8bkT2t7X64BYOileRdaI6vd6KlRvHxfPp6nWjraJbzIZuqORQTVeBtV4GLjbQ9+9XpIaTZIaTJIafSQ22ua+WXfq8iNUuZ6Zcx7og82/bWPyog37NFaAZ0IGW/t2aRnQY8F6dmRy6zaoKmdUNjBm4x5Oq6pn+LYmHGZoYoyax6llmTXuRExzLsi+lccS8IfNfBvw+FflGIsty3oqVJsTnHx29OHaKrnBx8SVu7midDcDd4fH4sY0pOVxKnCfgKlv+Q8R2D/2r/vBshiU1045FkWQtkIIpayn5hQuyEw8rMDHxeW1/HLJNlIawmtzXpTyw/5Y6D4d5T+HLNQUh+tNAAODDTb0JYGZZx/T9jdBS3uqxlo68EDFpoRGk9lvbOHRd7eGHVT+cTJXHmxTuf8PpQg4ZPWvnzDl3apmjWVUgB0P4x0BrDtSi2GrK0vLM9O30QPPyVnd7LdKbvDx3KtVZG0Pzx0uFfY6vXHL/VpqbD9w/Anlhy2rNtlfP8sgOm59mwcddkSMtov/NxebWNzToPIYwu5oA5epzHl9S9hC1Wy4Lx16bbqPAvfPUEdpq1BBHfWelw4M/6QFe0EqbGD9DIsNi3oaWEazWTll2Q5O+qYhbPtpChSO6lNNCl8Bs4HWDywXeZk7l+53ou4rY7QCDXjFl9OZO9HB5fOOOM8aprHINHpW+IxDlfO+ruPGz3aFZf9qow3eGJLA30YmsS4lykrNfR+ij3/3D36wTP0SkR8GWIkm8s3WEcDnR2o1ZO3GVeWZ6VuAAT0Jrkff3drRYmi2yF6XQVFGHG8dF8/iwb1ocLZrN+AZphSvPhwsQ1bYs+o3zm0LLAEtV+aqkNeTwIryhRYqrwEr+sfwcVocy9JiWT4gpr0w7ZNGcD5w6B+dzZ/yIQ5bpqPzgYfb1KMO43nDNHsUWMESnyF808vBpqQoNiS5WNk3itL+MZT3jqLRGYA9SuG35L63sQWF0SyF7o0oAwO9ACLG2Y9J79W01bB8aPoKFU6IoGBdGpzCzhgH2+IcbI9zsjPGwfZYB1UJTjYmudiU6GRzoguPfQcNfEFM7fdbOqjpQGSZshS4MsAf7KLedynwnAV/yYvAgxFc/KuxzQku1qX4tcyOWAfVvRzsiHXsh2dbnIO9IQ070iZMx/9aOP1LPwC5MuCfL3q5FbAMU18wDXmAHprFujvaYOEx8RRlxPH+oDj2hHusmjK5tboNh0yFZx2P+kptIdvhTGXywjajKFZnpb8o2rOOlNuU6OLZkcn8c3hCiDVQu7TFbPKKbjmiotj/U+7ClaAbbehEFD7ftZbWkKbvt0CPcGrVOw0ePaMPF1wziOdHJHUhqFhAzO42F1oHP40Yb9vUmUlWGmWu2bIKeK27Q/XZgFguvHogT38vxU7D2o7p700kdmJrdlXrYGHtJIkOyHAKx4+1prXM++nGsTR/OTmZa3+UGuKiHh2Sf5HEj8l909LG5sFgRce/RXsSE9tH+11Wmg1dW/U58EZ3A0oFHhrdlz+c2RdfVzvdRbWQncU/OdKJqq0b7/ukwD0P+IlNRt+p5BUtb6vV2uPSh/gcrABiugtU97r7M+/4xK7W8x0oP2urZJGVqRCQebb1U7jTSrMhX1euFdVH6CZScFqfrgjVO4iM7AhULYPV5HoddK89fTUvY5Z7mJWmsfXyIG0ECnYFeS0zgdmnpnSdDgtrESaSW3I+ucWVHb3N4WD94p09CK/Y1GsDnzWtNbCyst4wzaldGaoNSS7y3f26ioZaB0xmR79scotfaTtfod1TIQB/tvEbca0/FduSIb9ARZ/pilCZAnecfVRYe9AdqozcWr/NYZqXsbNkKHnFTx6xqFq+9apELW+f5JYsocC9Chhuw/M4wfcUylgr34pee+TWvXGcAozoSmDNOz6J/x4dfmuP3vU+TtnSwLgNezirYk91kldGZJeu/8baxe6boHhOx8Hyuwf+gvCoTVprNIXu66D4WStT4pohg672OcxlosR1Bahqow0eO6O37Z9jqBLf5P9uxnlMXKZiqD9rOs5jktBkklxvMrjGwzG7mhiyo5Fjd3n2pZGaoFdllW+2BlVhznhUrwHmWBvi1mSGOxmDTUC8Tb6Rb4nyDeOW93daaV6WmX4T8KeuANbsU1OYOarjlcZjPX4YBtd4yNjlIa32wDG8/n/+lPpob6fMoPys8sr7rLV0O0nR5SA15BWP65zGmla8i4KcZ0Cn2KO1pD8e5wPAZCvNs8orny7LTDsJ5JZwhqrRKUdMnW9Jjq9u5PTN9XxvSz3Z1U0MqPPYfTjTq5nllb+13DpFpjebIks6Z2Ptt0AdMzG8t3DoeXWBk58xK+dlphQttdI4s3zzlDWZA/spOjFcwXrn2HhLZbOHbWvkslW1nLOujgF13mB28eOEOvMasZpMOmvciZh6f6BWhc1a6711iMy3c2GC6ss8fp4lg0TA9LgSrwV5L1zBmj/syFWZxm7cy0vzK/n3PzZx3Ze7gg3VSq+LC1Orqqz5KfMnRmEaz9GBku1tLx/F94AtCa0HFgkDcTY8g1qrCZ5dWtpkmNGXAf8NN6jqogyWpbW8vjh2ZxPPvFbFnxdUccqWkOQSVvkcvguzSyt3WL4ipfo+aDvxuGNgTVm8AuxymO6DSy5hlttyMsXQtWt3e12chcVzp4MlH6XFtnh+zZVf1fDq3E2cuWlviHqm601Dc45ftcV6nY7CCecCv+jwitWaoe28z1at5ddcf6DQfbrV5tmllTu8rsZzVHgnXMD6qv/BfiuHqTxQ9C33lVR3dgXXqenPMBk7fPXmcstXPO4egpr/6IxtbQ2s3IUr4fDjWQMsLpSXmTF2gHW4qut8zqSLxc6N83ZIWd+og6Ca8c5WLl+5O5RdWmYaOm7o2s3W9/weObcXDuYDyZ35YOv7DYbrHuyK1TogGRiONyi8INE6XKVNQ8s3XQXMCjVY1d85/++e97dx3td1oezO/IQ6M2f46s3WKzbOnegguvEl6PxZ3dbBmvJuFejDQXghJ0H9v3nGbXk/RMCXVV6ZC/wYqAnVSNY3J4Be9dVurl0Rsm54gfsyyyt/Ynn1t0+2VBegckkgOtG+HVJf06P2JFwcZm+52a3PtmfTEyCrvPJfpqGnAV+GYkTjPCZDdzRx99LqUEFVqWK6s8or86W94d0zx98H3BqojrQPrOkf1iPWPOWdF7mc3u4Cq26IfTJ89ebyuL2cDjxNkGPnB9V4eaAoNIa6iiwA8+RhZVVL231xgft2RH4d0NHr0FWFOXPRoHm/n2UnN5Jf3G5PYlnmoDGi5uxgpe5XJjpJ3+0NNlNVoHdnlW9+rmNj6b4T5SGLrZdY3SvsWLCQQ3OBnUF6cdeTwivtsbkOTI0b39+cVnmyClMB2y3pIEPlVaHQMGOGBwmqIGgsf6d+ihLMILyFNHh+9N2qce2RVcMyMgzTez9wFV07jV+B10F/lVW++YsO3WHuRAdbvi3swIa+ZY3VuTykAvcrwGVBfKWfYvguJHdJh63jVcMyMkS900SZhC3HFtsNlNyfVb7pkw7f5eHRCUS7/oFwQQeutnkq3D8lOiaBVgXt1Qqnosan7fHQH27cr18/rKwyzzScw0R1Nv5DqsJZGlR4yTQYmVVeeXGnoCo4exAxriUdhCpIU+GBZeo5CG9BUE+19KB6J3klMzsb9F+RkRHTGO25WFSuw18oLiymSYHlpvC8qPliVnlV5887mum+COFvHFabPRynwgNT4m+A/OC/fX0Np++nVqNQ25I1Q9LSfQ65xjA5X4UzgjxVelX4RJR3TENfatfe3pEk3+0khV+B3huAL3+QwcrHIGX8ApALQ2B6rMPkWqaVfBjIu25KT4+tjzXGIOZZCjn4IygDmR3RBKwSlSJR3yKIKxm6dm1gp2V/aaq/AqMCdMcggwXw+Hm9cTR+CpYPaAokXCYqTxPlvTtQ2qsFy9koyxo8GHxZojocZBiQjj8nIAFIAhKbtVwT/q2l3aB1zecpbxalXNRc7XEZq7ceVVmRU4w9/ok5p7hoSLgDuDfAWjcEYAE8npONQ5c2v+QQ8KXfItxObskLnbW9uqz4D096CjjZhruHCKz9xry8DoSyTk8Rpnkr0xav6jFAPTFhMD7zIeAKW8Y15GD54boJkVCnanlBnsch9zF50YZuC1Th2H6ocTtILvZX5wkxWAAF4+8FuT/0b16bgL/hcD7G5IXl3QcodzrK7aA3gQQrkTcMwPI//KMot4XHSKiJ8ioqs5haXNJlbbCZOaMQJoF5DUhUkD89TMBShFk5c1C9KcyGpwzladT3EtOWbAl7mPxZ6deA3gwSyhoWYQIW+H1cvXP+GIZwgT9pczHI3zG9C8IKskfdfXFyKXAZomeFQDuFOVj7NFdhToFt6foB66V+jsqbCMU4+Ihbi4MXtD7n4jga6s5AzXGI5ABnYl8GejcBa7994H7IarnIMBAvyn+B5Qj/BeNLPGY5txd3ft9uhjsZh56IaZwIOgKDEaieEiZaqQuCBVCYk4uaM4K8aR1IqQWtACoRtqHGdtDtCF6UBpB6IB5RFypJYDpAjgJSQdNA0giVAzmIYAV/Jz+3qJCC8ZuAF4HYLvhyE5oN6BH+daXum0g56If9/ych/R4HWCwfMBG6J/VvPcynh52s2kWlAeUmpha/EP5gAcw6JxX1vIJyRmTswnZNU4UaP2Zq0cftuSq0ds6Ud6vY0c+NWis/GJGgy0Kiok9uL1ThNekX5FwN+lQXNmy7k5YyUX5Lav/7uXyeryN3CC9r0r9D/wIwJjK4IYNqI/BT8kqKOnOX8HLAvVFRw+kZzxMnPtDRII7IQAdRRJ8jxnUJtxat7vStwvYhC9wngP4F5LTIiNsNFJtAbyW3ZEGgbhm+Tsq84q8Y0P9MkNuA2sjo2yI+VAup92QHEqrw1ljflRljB2AY+cCNXdhjH27yMcJUcottKbfZtVzBM3NGIebjIGdGuOiwVCDcQW6xrXVlu+YeQ6H77OZiFqdEOLG62NNvMeRxEihoz0mpPQssaA4idF+G8ks6WDK6hxBVBcZj+BpmM/3D+uCtB7qDFLjHAHcCP+g2z9T5kV2L8gSJzAmGhuqeYO038t0nYejPQa7Cn0Ta81Z58B/gj+QWvx3KuP7u+e1+eHQCMVFXgd4IfL8HTHfrUF7Ap3/mtsWbwkNhdncpGDcU5EpErkDJ7kZP9g3CK/j0JaaWfBRuWUc9yx4pPOt48P4Ak/MRGUtos7U7IitA/oPyb3YVfUI+Zrh2tOcauv7pcgKiY1HGAN8LM9AUdA3IYkQX4ZAibi3+pqu83sgKap/MuTiOvbWnYTASdAQqIxCyCUr4tDaBlCGyGtUvEOMTfOYyphXv6rqL0oi0LvkYJIxLw+E8BsM8FiUDkVRU+4L2QaQPSjz+8kXgL2nk8msb9kHRALoTlZ0IO4AdqG5AZBMqmxDfOnYaFR0pNx7O8v94t8LvqQGFygAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMi0wMS0yNlQxMjowMzowMSswMDowMMKQMoMAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjItMDEtMjZUMTI6MDM6MDErMDA6MDCzzYo/AAAAAElFTkSuQmCC" alt="Company Logo" style="height: 40px;width: auto;" />`;

                const documentContent = /* HTML */ `
                    <div style="display:flex;flex-direction:column;margin: auto;padding: 30px;font-size: 15px;line-height: 24px;    font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;color: #555;${cssVariables}">
                        <!-- Header content -->
                        <h1 id="main-heading"
                            style="margin-top: 0;font-size: 1.4em;display: flex;justify-content: center;align-items: center;gap: var(--padding-buffer);">
                            ${companyLogo}
                            CHAMBAL FERTILISERS AND CHEMICALS LIMITED
                        </h1>
                        <hr style="width: 100%" /> 
                        <!-- Subject & Date -->
                        <div style="display: flex; justify-content: space-between; margin: 0px var(--padding-buffer);">
                            <h4 style="flex: 1;">Subject: <span style="font-weight: 200;">${subject}</span></h4>
                            <h4>Date: <span style="font-weight: 200;">${currentDate}</span></h4>
                        </div>
                        
                        <!--Purchase summary table -->
                        <div style="display: flex;flex-direction: column; --border-size: 1px; padding: var(--padding-buffer)">
                            <h4 style="margin: 0">Purchase and Sales Summary</h4>
                            <table border="1" style="${tableStyle}">
                                <thead>
                                    <tr>
                                        ${tempData.purchaseSalesSummary.columns.reduce((acc, curr) => acc += `<th style="${cellStyle}">${curr.label}</th>`, "")}
                                    </tr>
                                </thead>
                                <tbody>
                                        ${tempData.purchaseSalesSummary.listing.reduce((acc, cellData) => acc += `<tr>${tempData.purchaseSalesSummary.columns.reduce((cellAcc, column, index) => cellAcc += `<td style="${cellStyle}${getAlignment(index)}">${cellData[column.field]}</td>`, "")}</tr>`, "")}
                                </tbody>
                            </table>
                        </div>
        
                        <!--Dynamic Text field 1-->
                        <div style="padding: var(--padding-buffer)">${nfaOtherData.Justification}</div>
        
                        <!-- Multiple vendor split table -->
                        <div style="display: flex;flex-direction: column; --border-size: 1px; padding: var(--padding-buffer)">
                            <h4 style="margin: 0">Multi Vendor Split</h4>
                            <table border="1" style="${tableStyle}">
                                <thead>
                                    <tr>
                                        ${getKeys(nfaMultiVendorPrice).reduce((acc, curr) => acc += `<th style="${cellStyle}">${curr}</th>`, "")}
                                    </tr>
                                </thead>
                                <tbody>
                                        ${nfaMultiVendorPrice.reduce((acc, cellData) => acc += `<tr>${getKeys(nfaMultiVendorPrice).reduce((cellAcc, column, index) => cellAcc += `<td style="${cellStyle}${getAlignment(index)}">${cellData[column] || "-"}</td>`, "")}</tr>`, "")}
                                </tbody>
                            </table>
                        </div>

                        <!-- Quantity -->
                        <div style="display: flex; justify-content: space-between; margin: 0px var(--padding-buffer);">
                            <h4 style="flex: 1;"><span style="text-decoration: underline;">Quantity</span>: <span style="font-weight: 200;">${nfaOtherData.quantity}</span></h4>    
                        </div>
        
                        <!-- Pack Wise Price table -->
                        <div style="display: flex;flex-direction: column; --border-size: 1px; padding: var(--padding-buffer)">
                            <h4 style="margin: 0">Pack Wise Price</h4>
                            <table border="1" style="${tableStyle}">
                                <thead>
                                    <tr>
                                        ${getKeys(nfaPackWisePrice).reduce((acc, curr) => acc += `<th style="${cellStyle}">${curr}</th>`, "")}
                                    </tr>
                                </thead>
                                <tbody>
                                        ${nfaPackWisePrice.reduce((acc, cellData) => acc += `<tr>${getKeys(nfaPackWisePrice).reduce((cellAcc, column, index) => cellAcc += `<td style="${cellStyle}${getAlignment(index)}">${cellData[column] || "-"}</td>`, "")}</tr>`, "")}
                                </tbody>
                            </table>
                        </div>
                        
                        <!--Dynamic Text field 2-->
                        <div style="padding: var(--padding-buffer)">${nfaOtherData.purchaseAnalysis}</div>

                        <!-- Credit Period & Cash Discount table -->
                        <div style="display: flex;flex-direction: column; --border-size: 1px; padding: var(--padding-buffer)">
                            <h4 style="margin: 0">Credit Period & Cash Discount</h4>
                            <table border="1" style="${tableStyle}">
                                <thead>
                                    <tr>
                                        ${getKeys(nfaProductClauseTable).reduce((acc, curr) => acc += `<th style="${cellStyle}">${curr}</th>`, "")}
                                    </tr>
                                </thead>
                                <tbody>
                                        ${nfaProductClauseTable.reduce((acc, cellData) => acc += `<tr>${getKeys(nfaProductClauseTable).reduce((cellAcc, column, index) => cellAcc += `<td style="${cellStyle}${getAlignment(index)}">${cellData[column] || "-"}</td>`, "")}</tr>`, "")}
                                </tbody>
                            </table>
                        </div>

                        <!-- Manual fields-->
                        <div style="display: flex;flex-direction: column;padding: var(--padding-buffer);">
                            <h4 style="${dictGridStyle}"><span style="text-decoration: underline;">Delivery:</span> <span style="font-weight: 200;">${nfaOtherData.deliveryPeriod}</span></h4>
        
                            <h4 style="${dictGridStyle}"><span style="text-decoration: underline;">Payment Plan:</span> <span style="font-weight: 200;">${nfaOtherData.paymentPlan}</span></h4>
        
                            <h4 style="${dictGridStyle}"><span style="text-decoration: underline;">Packing / Quality:</span> <span style="font-weight: 200;">${tempData.packingQuality}</span></h4>
        
                            <h4 style="${dictGridStyle}"><span style="text-decoration: underline;">Product Testing:</span> <span style="font-weight: 200;">${tempData.productTesting}</span></h4>
        
                            <h4 style="${dictGridStyle}"><span style="text-decoration: underline;">Other standard Terms:</span> <span style="font-weight: 200;">${tempData.otherTerms}</span></h4>
                        </div>
        
                        <!--Dynamic Text field 3-->
                        <div style="padding: var(--padding-buffer); margin-top: 2em;">${nfaOtherData.purchaseAnalysis}</div>

                        <!-- Packaging table -->
                        <div style="display: flex;flex-direction: column; --border-size: 1px; padding: var(--padding-buffer);${extraMargin}">
                            <h4 style="margin: 0">Packaging</h4>
                            <table border="1" style="${tableStyle}">
                                <thead>
                                    <tr>
                                        ${getKeys(nfapackingTable).reduce((acc, curr) => acc += `<th style="${cellStyle}">${curr}</th>`, "")}
                                    </tr>
                                </thead>
                                <tbody>
                                        ${nfapackingTable.reduce((acc, cellData) => acc += `<tr>${getKeys(nfapackingTable).reduce((cellAcc, column, index) => cellAcc += `<td style="${cellStyle}${getAlignment(index)}">${cellData[column] || "-"}</td>`, "")}</tr>`, "")}
                                </tbody>
                            </table>
                        </div>

                        <!-- Companrative Analysis table -->
                        <div style="display: flex;flex-direction: column; --border-size: 1px; padding: var(--padding-buffer);${extraMargin}">
                            <h4 style="margin: 0">Comparative Analysis</h4>
                            <table border="1" style="${tableStyle}">
                                <thead>
                                    <tr>
                                        ${getKeys(nfaVersionForCS, "itemId").reduce((acc, curr) => acc += `<th style="${cellStyle}">${curr}</th>`, "")}
                                    </tr>
                                </thead>
                                <tbody>
                                        ${nfaVersionForCS.reduce((acc, cellData) => acc += `<tr>${getKeys(nfaVersionForCS, "itemId").reduce((cellAcc, column, index) => cellAcc += `<td style="${cellStyle}${getAlignment(index)}">${cellData[column] || "-"}</td>`, "")}</tr>`, "")}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
                const win = window.open();
                const style = document.createElement('style');
                style.textContent = `@page{size: landscape;}`;
                win.document.write(documentContent);
                win.document.title = nfaOtherData.Ebeln + " NFA CPC";
                win.document.querySelector("head").appendChild(style);
                win.print();
                //win.close();
            },

            /**
             * 
             * @param {Array} sourceData Data to format
             * @param {{}} identifierObj Idendifier object with keys as identifier and value as identifier value in the source data, value should be in array
             * @returns Formatted Data
             */
            currencyFormatter: function (sourceData, identifierObj) {
                return sourceData.map(eachCaData => {
                    const isIdentified = Object.keys(identifierObj).some((eachidentifierKey) =>
                        identifierObj[eachidentifierKey].includes(eachCaData[eachidentifierKey])
                    )
                    if (isIdentified) {
                        return Object.keys(eachCaData).reduce((acc, eachKey) => {
                            return {
                                ...acc, [eachKey]: eachKey.includes("Doc") ? new Intl.NumberFormat("en-IN", {
                                    style: "currency",
                                    currency: "INR",
                                }).format(eachCaData[eachKey]) : eachCaData[eachKey]
                            }
                        }, {})
                    }
                    return eachCaData;
                })
            },

            //Event will be triggered on icon tab bar selection change
            onITBSelectionChange: function (oEvent) {
                let key = oEvent.getSource().getSelectedKey();
                if (key == "nfatemplate") {
                    let rfqNumber = "7000000026"; //Temp -should be deleted.
                    //let rfqNumber = this.getView().byId("rfqInput").getValue();
                    let nfaData = this.getView().getModel("nfaModel").getProperty("/");
                    if (Object.keys(nfaData).length === 0 && nfaData.constructor === Object) {
                        this.readNFAData(rfqNumber, this.nfaEvent);
                    }
                    this.getView().byId("printPDF").setVisible(true);
                    this.getView().byId("page").setShowFooter(true);
                } else {
                    this.getView().byId("printPDF").setVisible(false);
                    this.getView().byId("page").setShowFooter(false);
                }
            }
        });
    });
