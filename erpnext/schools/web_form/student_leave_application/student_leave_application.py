from __future__ import unicode_literals

import frappe

def get_context(context):
	print "=============================="
	print context
	context.no_cache = 1
	context.show_sidebar = True
	frappe.flags.doc = "hi there"


@frappe.whitelist()
def get_student_detail():
	students = []
	guardian = frappe.db.sql("""select name from `tabGuardian` where email_address = %s""",
		(frappe.session.user), as_list=1)
	if guardian:
		students_list = frappe.get_all("Student Guardian", filters={"guardian": guardian[0][0]}, fields=["parent"])
		for student in students_list:
			student_name = frappe.db.get_value("Student", student.parent, "title")
			if student_name:
				students.append({
					"student": student.parent,
					"student_name": student_name
				})
	return students