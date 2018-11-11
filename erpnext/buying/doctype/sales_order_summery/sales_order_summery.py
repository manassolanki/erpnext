# -*- coding: utf-8 -*-
# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.desk.form.linked_with import get_linked_doctypes
from frappe.desk.form.linked_with import get_linked_docs
from collections import defaultdict


class SalesOrderSummery(Document):
	pass


@frappe.whitelist()
def get_related_documents(doctype, docname):
	document_details = defaultdict(list)
	si_list = []
	linked_doc_info = get_linked_doctypes(doctype)

	document_details[doctype].append(frappe.get_doc(doctype, docname).as_dict())

	# also consider the sales return
	for linked_doctype in ["Sales Order", "Material Request", "Stock Entry", "Delivery Note", "Sales Invoice", "Payment Entry"]:
		doc_details = get_linked_docs(doctype, docname, linked_doc_info, linked_doctype)
		for doc in doc_details.get(linked_doctype, []):
			doc_obj = frappe.get_doc(linked_doctype, doc.name)
			if (linked_doctype == "Sales Invoice"):
				si_list.append(doc_obj.name)
			if (linked_doctype == "Sales Invoice") and doc_obj.is_return:
				document_details["Sales Return"].append(doc_obj.as_dict())
			else:
				document_details[linked_doctype].append(doc_obj.as_dict())
	
	# include the Payment Entry against invoice
	if si_list:
		payment_entry = frappe.get_all("Payment Entry", filters=[["reference_name", "in", si_list]])
		payment_entry = frappe.db.sql('''select parent as name from `tabPayment Entry Reference` where reference_name in (%s)''' %
			', '.join(['%s']*len(si_list)), tuple(si_list), as_dict=1)
		for pe in payment_entry:
			pe_doc = frappe.get_doc("Payment Entry", pe.name).as_dict()
			document_details["Payment Entry"].append(pe_doc)

	return document_details

