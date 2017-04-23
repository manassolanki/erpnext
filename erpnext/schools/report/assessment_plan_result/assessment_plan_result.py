# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from erpnext.schools.api import get_student_batch_students, get_result

def execute(filters=None):
	print "testing the report"
	columns, data = [], []

	columns = [ 
		_("Student ID") + ":Link/Student:90", 
		_("Student Name") + "::150"
	]

	assessment_plan = frappe.get_doc("Assessment Plan", filters.get("assessment_plan"))	
	print assessment_plan.student_batch

	for d in assessment_plan.assessment_criteria:
		columns.append(d.assessment_criteria)

	student_list = get_student_batch_students(assessment_plan.student_batch)
	print student_list

	for d in student_list:
		result = get_result(d.student, assessment_plan.name)
		row = [d.student, d.student_name]
		
	# student_list = get_assessment_students(assessment_plan, student_batch)
	# for d in student_list:
		# print d

	# student_result = frappe.db.sql('''
	# 	select sr.student, sr.student_name, sr.grade from `tabStudent` where name in (%s)''' %
	# 	', '.join(['%s']*len(student_list)), tuple(student_list), as_dict=1)

	# columns = get_columns()
	data = student_list

	return columns, [[],[]]

def get_columns():
	columns = [ 
		_("Student ID") + ":Link/Student:90", 
		_("Student Name") + "::150"
	]
	return columns
