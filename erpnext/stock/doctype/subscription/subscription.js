// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Subscription', {
	before_save: function(frm) {
		if(frm.doc.subscription_start_date && frm.doc.subscription_duration) {
			frm.doc.expiry_date = frappe.datetime.add_months(frm.doc.subscription_start_date,
				frm.doc.subscription_duration)
		}
		if(frm.doc.subscription_start_date && frm.doc.repeat_day) {
			var now = moment();
			var next_recc = moment(frm.doc.subscription_start_date);
			tmp2 = next_recc.set('date', frm.doc.repeat_day);
			if (next_recc < now) {
				var tmp3 = next_recc.add(1, 'M');
				frm.doc.next_recurrence_date = tmp3.format()	;
			}
			else {
				frm.doc.next_recurrence_date = next_recc.format();
			}
		}
	}

});
