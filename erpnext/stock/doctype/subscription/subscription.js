// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Subscription', {
	refresh: function(frm) {
		if(frm.doc.subscription_start_date && frm.doc.subscription_duration) {
			frm.doc.expiry_date = moment(frm.doc.subscription_start_date)
				.add(frm.doc.subscription_duration,'M');
		}
		if(frm.doc.subscription_start_date && frm.doc.repeat_day) {
			var now = moment();
			var next_recc = moment(frm.doc.subscription_start_date)
				.set('date', frm.doc.repeat_day);
			if (next_recc < now) {
				frm.doc.next_recurrence_date = moment(next_recc).add(1, 'M');
			}
			else {
				frm.doc.next_recurrence_date = next_recc;
			}
		}
	}
});
