# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
import calendar
import frappe.utils
import frappe.defaults
from frappe.model.document import Document
from frappe.model.naming import make_autoname

from frappe.utils import cint, cstr, getdate, nowdate, \
	get_first_day, get_last_day, split_emails

from frappe import _, msgprint, throw

month_map = {'Monthly': 1, 'Quarterly': 3, 'Half-yearly': 6, 'Yearly': 12}
date_field_map = {
	"Sales Order": "transaction_date",
	"Sales Invoice": "posting_date",
	"Purchase Order": "transaction_date",
	"Purchase Invoice": "posting_date"
}

class Subscription(Document):
	pass
	# def autoname(self):
	# 	self.name = make_autoname("SUBS" + "/.###")

	def validate(self):
		print "=====================>>>>>>>> TEST"
		if self.base_document:
			new_list = []
			new_doc = frappe.get_doc(self.base_document_type, self.base_document)
			if new_doc.contact_email:
				new_list.append(new_doc.contact_email)
			if self.owner == "Administrator":
				doc = frappe.get_doc("User", "Administrator")
				new_list.append(doc.email);
			else:
				new_list.append(self.owner)
			self.email = ", ".join(new_list)

	def submit(self):
		if self.base_document and self.base_document_type:
			frappe.db.set_value(self.base_document_type, self.base_document, "subscription_document", self.name)




def create_subscription_document(next_recurrence_date=None, commit=False):
	"""
		Create subscription document depending on the next recurrence date by copying
		the orginal data and notify the concerned people
	"""
	print nowdate()
	today_doc_list = frappe.get_list("Subscription", fields = ["name", "base_document_type", 
		"base_document", "next_recurrence_date"], filters = {"docstatus": 1})
	print today_doc_list
	for d in today_doc_list:
		# print d.next_recurrence_date == nowdate()
		try:
			base_doc = frappe.get_doc(d.base_document_type, d.base_document)
			new_doc = make_new_doc(base_doc, d)
			print doc, new_doc

			if d.notify_by_emails:
				send_notification(new_doc, d.email)
			if commit:
				frappe.db.commit()
		except:
			if commit:
				frappe.db.rollback()

def make_new_document(base_doc, subscription_doc):
	"""
		Making the new document based on the subscription next date and copying details
		from the base document.
	"""
	new_document = frappe.copy_doc(base_doc, ignore_no_copy=False)
	freq = month_map[subscription_doc.frequency]

	pass

def send_notifications(new_doc, email):
	"""
		Notify concerned person about the subscription document generation.
	"""
	print "in send notifications"
	pass

def set_next_date(doc, current_next_date):
	"""
		Changing the next date of subscription doctype after generating the document.
	"""
	print "in set next date"
	pass

