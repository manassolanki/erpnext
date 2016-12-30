# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt
from __future__ import unicode_literals

import frappe
import unittest
from erpnext.stock.doctype.subscription.subscription import create_subscription_document


# test_records = frappe.get_test_records('Subscription')

class TestSubscription(unittest.TestCase):

	def test_subscription(self):
		create_subscription_document()

