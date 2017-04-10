cur_frm.add_fetch("student", "title", "student_name");

frappe.ui.form.on("Student Group", {

	onload: function(frm) {
		frm.set_query("academic_term", function() {
			return {
				"filters": {
					"academic_year": (frm.doc.academic_year)
				}
			};
		});
		frm.set_value("academic_year", frappe.defaults.get_default("academic_year"))
		frm.set_value("academic_term", frappe.defaults.get_default("academic_term"))
	},

	refresh: function(frm) {
		if (!frm.doc.__islocal) {
			frm.add_custom_button(__("Course Schedule"), function() {
				// frappe.route_options = {
				// 	student_group: frm.doc.name
				// }
				frappe.set_route("List", "Course Schedule");
			});

			frm.add_custom_button(__("Assessment Plan"), function() {
				// frappe.route_options = {
				// 	student_group: frm.doc.name
				// }
				frappe.set_route("List", "Assessment Plan");
			});
			frm.add_custom_button(__("Update Email Group"), function() {
				frappe.call({
					method: "erpnext.schools.api.update_email_group",
					args: {
						"doctype": "Student Group",
						"name": frm.doc.name
					}
				});
			});
			frm.add_custom_button(__("Newsletter"), function() {
				frappe.set_route("List", "Newsletter");
			});
		}
	},
	group_based_on: function(frm) {
		if (frm.doc.group_based_on == "Batch") {
			frm.doc.course = null;
		}
		else if (frm.doc.group_based_on == "Course") {
			frm.doc.program = null;
			frm.doc.batch = null;
		}

	},

	get_students: function(frm) {
		frm.set_value("students",[]);
		frappe.call({
			method: "get_students",
			doc:frm.doc,
			callback: function(r) {
				if(r.message) {
					frm.set_value("students", r.message);
				}
			}
		})
	},

});