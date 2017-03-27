# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _

def execute(filters=None):
	print "exeecuting report==========="
	columns, data = [], []
	columns = get_columns(filters)

	print dir(filters)
	academic_year = filters.get("academic_year")
	program = filters.get("program")
	student_batch_name = filters.get("student_batch_name")
	print academic_year,program,student_batch_name

	student_list = frappe.get_list("Program Enrollment", fields=["student"],
		filters = {"academic_year":academic_year, "program":program, "student_batch_name":student_batch_name})

	for student in student_list

	print student_list
	data = student_list
	
	return columns, data

def get_columns(filters):
	columns = [ 
		_("Student") + ":Link/Student:90", 
		_("Student Name") + "::150", 
		_("Student Mobile No.") + "::150",
		_("Guardian1 Name.") + "::150",
		_("Relation with Guardian1.") + "::150",
		_("Guardian1 Mobile No") + "::150",
		_("Guardian2 Name.") + "::150",
		_("Relation with Guardian2.") + "::150",
		_("Guardian2 Mobile No") + "::150",
	]
	return columns
