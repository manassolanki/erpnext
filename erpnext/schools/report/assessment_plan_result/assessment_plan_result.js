// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.query_reports["Assessment Plan Result"] = {
	"filters": [
		{
			"fieldname":"assessment_plan",
			"label": __("Assessment Plan"),
			"fieldtype": "Link",
			"options": "Assessment Plan",
			"reqd": 1,
			"width": "100px",
		}
	]
}
