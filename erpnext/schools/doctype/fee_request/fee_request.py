# -*- coding: utf-8 -*-
# Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from erpnext.schools.api import get_program_students, get_student_batch_students, get_student_group_students

class FeeRequest(Document):
	def validate(self):
		if not(self.programs or self.student_batches or self.student_groups):
			frappe.throw(_("Select atleast one {0}").format(self.fee_request_against))

		print "========>>>>>> generating payment request"
		student_list, students = [],[]
		if self.fee_request_against == "Program":
			for program in self.programs:
				print "got program", program
				students += get_program_students(program, self.academic_year)
			print students
		elif self.fee_request_against == "Student Batch":
			for student_batch in self.student_batches:
				print "got student batch", student_batch
				students += get_student_batch_students(student_batch, self.academic_year)
			print students
		if self.fee_request_against == "Student Group":
			for student_group in self.student_groups:
				print "got student group", student_group
				students += get_student_group_students(student_group, self.academic_year)
			print students
	
	def on_submit(self):
		for student in students:
			doc = frappe.new_doc("Payment Request")
			


@frappe.whitelist()
def get_fee_structure(source_name,target_doc=None):
	fee_request = get_mapped_doc("Fee Structure", source_name,
		{"Fee Structure": {
			"doctype": "Fee Request"
		}}, ignore_permissions=True)
	return fee_request