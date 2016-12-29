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
			new_list.append(new_doc.contact_email)
			if self.owner == "Administrator":
				doc = frappe.get_doc("User", "Administrator")
				new_list.append(doc.email);
			else:
				new_list.append(self.owner)
			self.email = ", ".join(new_list)



def create_subscription_document():
	"""
		Create subscription document depending on the next recurrence date by copying
		the orginal data and notify the concerned people
	"""
	today_doc_list = frappe.get_list("Subscription" fields = [name, ])

