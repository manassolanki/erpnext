# -*- coding: utf-8 -*-
# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.model.document import Document

class CouponCode(Document):
	def autoname(self):
		if self.coupon_type == "Promotional":
			self.coupon_code = filter(lambda x: x.isalnum(), self.coupon_name).upper()[0:8]
		elif self.coupon_type == "Gift Card":
			self.coupon_code = frappe.generate_hash()[:10].upper()
		self.name = self.coupon_code

	def validate(self):
		if self.coupon_type == "Gift Card":
			self.maximum_use = 1
			if not self.customer:
				frappe.throw(_("Please select the customer."))