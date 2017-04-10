# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe import _
from erpnext.schools.utils import validate_duplicate_student
from erpnext.schools.api import get_student_batch_students

class StudentGroup(Document):
	'''
	def autoname(self):
		self.name = frappe.db.get_value("Course", self.course, "course_abbreviation")
		if not self.name:
			self.name = self.course
		if self.student_batch:
			self.name += "-" + self.student_batch
		else:
			prog_abb = frappe.db.get_value("Program", self.program, "program_abbreviation")
			if not prog_abb:
				prog_abb = self.program
			if prog_abb:
				self.name += "-" + prog_abb
			if self.academic_year:
				self.name += "-" + self.academic_year
		if self.academic_term:
			self.name += "-" + self.academic_term
	'''
	
	def validate(self):
		print "===============>>>>>>>>>> Testing <<<<<<<============"
		self.validate_mandatory_fields()
		self.validate_strength()
		# self.validate_student_enrollment()
		# self.validate_student_name()
		# self.validate_name()
		validate_duplicate_student(self.students)

	def validate_mandatory_fields(self):
		if self.group_based_on == "Course" and not self.course:
			frappe.throw(_("Mandatory Field - Course"))
		elif self.group_based_on == "Batch" and (not self.program or not self.batch):
			frappe.throw(_("Mandatory Field - Program and Batch"))

	def validate_strength(self):
		if self.max_strength and len(self.students) > self.max_strength:
			frappe.throw(_("""Cannot enroll more than {0} students for this student group.""").format(self.max_strength))

	def validate_student_enrollment(self):
		program_enrollment = self.get_program_enrollment()
		students = [d.student for d in program_enrollment]
		for d in self.students:
			if d.student not in students:
				frappe.throw(_("Student {0} is not enrolled in the given {1}".format(d.student, self.group_based_on)))

	'''
	def validate_student_name(self):
		for d in self.students:
			d.student_name = frappe.db.get_value("Student", d.student, "title")
		
	def validate_name(self):
			if frappe.db.exists("Student Batch", self.name):
			frappe.throw(_("""Student Batch exists with same name"""))

	def validate_student_batch(self):
		student_batch_students = []
		for d in get_student_batch_students(self.student_batch):
			student_batch_students.append(d.student)
		for d in self.students:
			if d.student not in student_batch_students:
				frappe.throw(_("""Student {0}: {1} does not belong to Student Batch {2}""".format(d.student, d.student_name, self.student_batch)))
	'''

	def get_students(self):
		students = self.get_program_enrollment()
		if students:
			return students
		elif self.group_based_on != "Activity":
			frappe.throw(_("No students are enrolled in the given {}".format(self.group_based_on)))
		else:
			frappe.throw(_("Select students manually for the Activity based Group"))

	def get_program_enrollment(self):
		if self.group_based_on == "Batch":
			program_enrollments = frappe.db.sql('''select student, student_name from `tabProgram Enrollment` where academic_year = %s
				and program = %s and student_batch_name = %s''',(self.academic_year, self.program, self.batch), as_dict=1)

		elif self.group_based_on == "Course":
			return
			# '''
			# students = frappe.db.sql("select student, student_name, student_batch_name from \
			# 	`tabProgram Enrollment` where program = %s and academic_year = %s",(self.program, self.academic_year), as_dict=1)
			# student_list = [d.student for d in students]

			# inactive_students = frappe.db.sql('''
			# 	select name as student, title as student_name from `tabStudent` where name in (%s) and enabled = 0''' %
			# 	', '.join(['%s']*len(student_list)), tuple(student_list), as_dict=1)

			# for student in students:
			# 	if student.student in [d.student for d in inactive_students]:
			# 		students.remove(student)
			# '''
		else:
			return
		return [d for d in program_enrollments if frappe.db.get_value("Student", d.student, "enabled")]
