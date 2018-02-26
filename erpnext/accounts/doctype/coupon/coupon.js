// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Coupon', {
	refresh: function(frm) {
		if (frm.doc.pricing_rule) {
			frm.add_custom_button(__("Add/Edit Coupon Conditions"), function(){
				frappe.set_route("Form", "Pricing Rule", frm.doc.pricing_rule);
			});
		}
	},
	coupon_name: function(frm) {
		if (!frm.doc.coupon_code) {
			let code = frm.doc.coupon_name;
			frm.set_value("coupon_code", code.replace(/[^A-Za-z0-9]/g, '').slice(0, 7).toUpperCase());
		}
	}
});
