// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Coupon Code', {
	refresh: function(frm) {
		if (frm.doc.pricing_rule) {
			frm.add_custom_button(__("Add/Edit Coupon Conditions"), function(){
				frappe.set_route("Form", "Pricing Rule", frm.doc.pricing_rule);
			});
		}
	}
});
