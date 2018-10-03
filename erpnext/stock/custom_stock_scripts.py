
from __future__ import unicode_literals

import json
import frappe
from frappe.defaults import get_user_default_as_list
from frappe.desk.reportview import get_match_cond, get_filters_cond

from collections import defaultdict
from frappe.utils import nowdate

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
		items = custom_item_query("Item", args.txt, "name", 0, 10, {"is_sales_item": 1}, True)
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
		out[item.name]["warehouse_details"] = {}

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
		out[item.item_code]["warehouse_details"][item.warehouse] = item
		out[item.item_code]["warehouse_details"][item.warehouse]["uom_box"] = out[item.item_code]["uom_box"]
		out[item.item_code]["warehouse_details"][item.warehouse]["uom_pieces"] = out[item.item_code]["uom_pieces"]

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




def custom_item_query(doctype, txt, searchfield, start, page_len, filters, as_dict=False):
	conditions = []

	description_cond = ''
	if frappe.db.count('Item', cache=True) < 50000:
		# scan description only if items are less than 50000
		description_cond = 'or tabItem.description LIKE %(txt)s'

	return frappe.db.sql("""select tabItem.name,
		tabItem.item_name as item_name,
		tabItem.item_group,
		tabItem.description as decription
		from tabItem
		where tabItem.docstatus < 2
			and tabItem.has_variants=0
			and tabItem.disabled=0
			and (tabItem.end_of_life > %(today)s or ifnull(tabItem.end_of_life, '0000-00-00')='0000-00-00')
			and (tabItem.`{key}` LIKE %(txt)s
				or tabItem.item_group LIKE %(txt)s
				or tabItem.item_name LIKE %(txt)s
				or tabItem.barcode LIKE %(txt)s
				{description_cond})
			{fcond} {mcond}
		order by
			if(locate(%(_txt)s, name), locate(%(_txt)s, name), 99999),
			if(locate(%(_txt)s, item_name), locate(%(_txt)s, item_name), 99999),
			idx desc,
			name, item_name
		limit %(start)s, %(page_len)s """.format(
			key=searchfield,
			fcond=get_filters_cond(doctype, filters, conditions).replace('%', '%%'),
			mcond=get_match_cond(doctype).replace('%', '%%'),
			description_cond = description_cond),
			{
				"today": nowdate(),
				"txt": "%%%s%%" % txt,
				"_txt": txt.replace("%", ""),
				"start": start,
				"page_len": page_len
			}, as_dict=as_dict)


'''

txt: m
searchfield: name
query: erpnext.controllers.queries.item_query
filters: {"is_sales_item":1}
doctype: Item

'''