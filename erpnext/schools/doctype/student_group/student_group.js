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
	},

	before_save: function(frm) {
		var name;
		if (frm.doc.group_based_on == "Course") {
			name = "Course-" + frm.doc.course + "-" + (frm.doc.academic_term?frm.doc.academic_term:frm.doc.academic_year);
		} else if (frm.doc.group_based_on == "Batch") {
			name = "Batch-" + frm.doc.program + "-" + frm.doc.batch + "-" + (frm.doc.academic_term?frm.doc.academic_term:frm.doc.academic_year); 
		} else if (frm.doc.group_based_on == "Activity") {
			name = "Activity" + "-" + (frm.doc.academic_term?frm.doc.academic_term:frm.doc.academic_year);
		}
		if (!frm.doc.__unnamed) {
			frm.doc.__newname = name;
		}
	},

	refresh: function(frm) {
		if (!frm.doc.__islocal) {
			frm.add_custom_button(__("Course Schedule"), function() {
				frappe.set_route("List", "Course Schedule");
			});

			frm.add_custom_button(__("Assessment Plan"), function() {
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

	students: function(frm) {
		console.log("in students");
	},

	update_students: function(frm) {
		if (frm.doc.students.length === 0) {
			frm.doc.next_group_roll_number = 1;
		}
		frappe.call({
			method: "update_students",
			doc:frm.doc,
			callback: function(r) {
				if(r.message) {
					$.each(r.message, function(i, d) {
						var s = frm.add_child("students");
						s.student = d.student;
						s.student_name = d.student_name;
						if (d.active === 0) {
							s.active = 0;
						}
						s.group_roll_number = frm.doc.next_group_roll_number;
						frm.doc.next_group_roll_number += 1;
					});
					frm.save();
				} else {
					frappe.msgprint(__("Group already updated"))
				}
			}
		})
	}

});