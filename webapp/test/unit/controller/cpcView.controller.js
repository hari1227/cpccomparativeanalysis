/*global QUnit*/

sap.ui.define([
	"cpccomparativeanalysis/controller/cpcView.controller"
], function (Controller) {
	"use strict";

	QUnit.module("cpcView Controller");

	QUnit.test("I should test the cpcView controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
