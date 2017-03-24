# -*- coding: utf-8 -*-
# Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc

class FeeRequest(Document):
	pass

@frappe.whitelist()
def get_fee_structure(source_name,target_doc=None):
	fee_request = get_mapped_doc("Fee Structure", source_name,
		{"Fee Structure": {
			"doctype": "Fee Request"
		}}, ignore_permissions=True)
	return fee_request
