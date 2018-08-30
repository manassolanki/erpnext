
from __future__ import unicode_literals

import json
import frappe
from frappe.defaults import get_user_default_as_list
from erpnext.controllers.queries import item_query
from collections import defaultdict

@frappe.whitelist()
def get_item_details(args):
	"""
		custom script for returning the stock information for a item

	Parameters
	----------
	txt: search text string
	item_code: item_code,
	customer: frm.doc.customer,
	update_stock: frm.doc.update_stock,
	company: frm.doc.company,
	order_type: frm.doc.order_type,
	transaction_date: frm.doc.transaction_date,
	doctype: frm.doc.doctype,
	name: frm.doc.name


	Return
	------
	dict of warehouse wise all stocks

	"""
	if isinstance(args, basestring):
		args = json.loads(args)

	args = frappe._dict(args)
	item_list = []

	if args.item_code:
		# if item code is given only search for the given field
		item_code = args.item_code
		item_warehouse = frappe.db.get_value("Item", item_code, "default_warehouse")
		user_default_warehouse_list = get_user_default_as_list('Warehouse')
		user_default_warehouse = user_default_warehouse_list[0]if len(user_default_warehouse_list) == 1 else ""
		warehouse = user_default_warehouse or item_warehouse or args.warehouse
		item_list = [item_code]

	else:
		# search the given items from the seach fields
		# doctype, txt, searchfield, start, page_len, filters, as_dict=False
		items = item_query("Item", args.txt, "name", 0, 10, {"is_sales_item": 1}, True)
		item_dict =	{d.name: ", ".join(d.values()) for d in items}
		item_list = item_dict.keys()

	custom_uom_info = frappe.get_all("Item", fields=["name", "boxes", "pieces"],
		filters=[["name", "in", item_list]])

	out = defaultdict(dict)
	for item in custom_uom_info:
		out[item.name] = {}
		out[item.name]["item_details"] = item_dict[item.name]
		out[item.name]["item_stock_totals"] = {"actual_qty": 0, "reserved_qty": 0}
		out[item.name]["uom_box"] = item.boxes
		out[item.name]["uom_pieces"] = item.pieces


	# print (item_list)
	# for item in item_list:
	# 	out[item] = {}
	# 	out[item]["item_details"] = item_dict[item]
	# 	out[item]["item_stock_totals"] = {"actual_qty": 0, "reserved_qty": 0}


	# filters["filters"].push(["Warehouse", "rejected_warehouse", "!=", 1]);
	warehouses = frappe.db.get_all("Warehouse", fields=["name"], filters=[["company", "=", args.company], ["rejected_warehouse", "!=", 1]])
	warehouses_list = [warehouse.name for warehouse in warehouses]

	item_details = frappe.db.get_all("Bin", fields=["item_code", "warehouse", "actual_qty", "projected_qty", "reserved_qty"],
						filters=[["item_code", "in", item_list], ["warehouse", "in", warehouses_list]])


	for item in item_details:
		out[item.item_code][item.warehouse] = item

		# out[item.item_code]["item_details"] = item_dict[item.item_code]
		# if "item_stock_totals" not in out[item.item_code]:
		# 	out[item.item_code].update({"item_stock_totals": {"actual_qty": 0, "reserved_qty": 0}})

		out[item.item_code]["item_stock_totals"]["actual_qty"] += item.actual_qty
		out[item.item_code]["item_stock_totals"]["reserved_qty"] += item.reserved_qty

	# item_details = frappe.db.get_value("Bin", {"item_code": item_code, "warehouse": warehouse},
	# 		["projected_qty", "actual_qty"], as_dict=True) \
	# 		or {"projected_qty": 0, "actual_qty": 0}

	# out.update({warehouse: item_details})

	return out



'''

txt: m
searchfield: name
query: erpnext.controllers.queries.item_query
filters: {"is_sales_item":1}
doctype: Item

'''