// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

// get tax rate
frappe.provide("erpnext.taxes");
frappe.provide("erpnext.taxes.flags");

frappe.ui.form.on(cur_frm.doctype, {

// 	refresh: function(frm) {
// 		if (frm.doc.docstatus == 0 && in_list(["Quotation", "Sales Order", "Sales Invoice", "Delivery Note", "Purchase Order", "Stock Entry", "Material Request"], frm.doctype)) {
// 			var item_childtable = $("div[data-fieldname='items']")[1];
// 			var grid_buttons = $(item_childtable).find(".grid-buttons");
// 			if (!$(grid_buttons).find(".custom-add-multiple-rows").length) {
// 				$(grid_buttons).append(`
// 					<button type="reset" class="custom-add-multiple-rows btn btn-xs btn-default"
// 							style="margin-right: 4px;">
// 						Add Items
// 					</button>
// 				`)
// 			}
// 			$(grid_buttons).find(".custom-add-multiple-rows").click(function() {
// 				console.log("clicked on the custom add button");
// 				frm.events.custom_add_multiple_items(frm);
// 			});
// 		}
// 	},

	custom_add_multiple_items: function(frm) {
		// frappe.custom_mutli_add_dialog(this.frm).show();
		let multi_item_dialog = frappe.custom_mutli_add_dialog(frm);
		multi_item_dialog.show();
		multi_item_dialog.$wrapper.find('.modal-dialog').css("width", "960px");

	},

	setup: function(frm) {
		// set conditional display for rate column in taxes
		$(frm.wrapper).on('grid-row-render', function(e, grid_row) {
			if(in_list(['Sales Taxes and Charges', 'Purchase Taxes and Charges'], grid_row.doc.doctype)) {
				erpnext.taxes.set_conditional_mandatory_rate_or_amount(grid_row);
			}
		});
		
		if (frm.doc.docstatus == 0 && in_list(["Quotation", "Sales Order", "Sales Invoice", "Delivery Note", "Purchase Order", "Stock Entry", "Material Request"], frm.doctype)) {
			var item_childtable = $("div[data-fieldname='items']")[1];
			var grid_buttons = $(item_childtable).find(".grid-buttons");
			if (!$(grid_buttons).find(".custom-add-multiple-rows").length) {
				$(grid_buttons).append(`
					<button type="reset" class="custom-add-multiple-rows btn btn-xs btn-default"
							style="margin-right: 4px;">
						Add Items
					</button>
				`)
			}
			$(grid_buttons).find(".custom-add-multiple-rows").click(function() {
				console.log("clicked on the custom add button");
				frm.events.custom_add_multiple_items(frm);
			});
		}
	},
	onload: function(frm) {
		if(frm.get_field("taxes")) {
			frm.set_query("account_head", "taxes", function(doc) {
				if(frm.cscript.tax_table == "Sales Taxes and Charges") {
					var account_type = ["Tax", "Chargeable", "Expense Account"];
				} else {
					var account_type = ["Tax", "Chargeable", "Income Account", "Expenses Included In Valuation"];
				}

				return {
					query: "erpnext.controllers.queries.tax_account_query",
					filters: {
						"account_type": account_type,
						"company": doc.company
					}
				}
			});

			frm.set_query("cost_center", "taxes", function(doc) {
				return {
					filters: {
						'company': doc.company,
						"is_group": 0
					}
				}
			});
		}
	},
	validate: function(frm) {
		// neither is absolutely mandatory
		if(frm.get_docfield("taxes")) {
			frm.get_docfield("taxes", "rate").reqd = 0;
			frm.get_docfield("taxes", "tax_amount").reqd = 0;
		}

	},
	taxes_on_form_rendered: function(frm) {
		erpnext.taxes.set_conditional_mandatory_rate_or_amount(frm.open_grid_row());
	}
});

frappe.ui.form.on('Sales Invoice Payment', {
	mode_of_payment: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		get_payment_mode_account(frm, d.mode_of_payment, function(account){
			frappe.model.set_value(cdt, cdn, 'account', account)
		})
	}
});

frappe.ui.form.on("Sales Invoice", {
	payment_terms_template: function() {
		cur_frm.trigger("disable_due_date");
	}
});

frappe.ui.form.on('Purchase Invoice', {
	mode_of_payment: function(frm) {
		get_payment_mode_account(frm, frm.doc.mode_of_payment, function(account){
			frm.set_value('cash_bank_account', account);
		})
	},

	payment_terms_template: function() {
		cur_frm.trigger("disable_due_date");
	}
});

frappe.ui.form.on("Payment Schedule", {
	payment_schedule_remove: function() {
		cur_frm.trigger("disable_due_date");
	},

});

frappe.ui.form.on('Payment Entry', {
	mode_of_payment: function(frm) {
		get_payment_mode_account(frm, frm.doc.mode_of_payment, function(account){
			var payment_account_field = frm.doc.payment_type == "Receive" ? "paid_to" : "paid_from";
			frm.set_value(payment_account_field, account);
		})
	}
})

frappe.ui.form.on('Salary Structure', {
	mode_of_payment: function(frm) {
		get_payment_mode_account(frm, frm.doc.mode_of_payment, function(account){
			frm.set_value("payment_account", account);
		})
	}
})

var get_payment_mode_account = function(frm, mode_of_payment, callback) {
	if(!frm.doc.company) {
		frappe.throw(__("Please select the Company first"));
	}

	if(!mode_of_payment) {
		return;
	}

	return  frappe.call({
		method: "erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account",
		args: {
			"mode_of_payment": mode_of_payment,
			"company": frm.doc.company
		},
		callback: function(r, rt) {
			if(r.message) {
				callback(r.message.account)
			}
		}
	});
}


cur_frm.cscript.account_head = function(doc, cdt, cdn) {
	var d = locals[cdt][cdn];
	if(!d.charge_type && d.account_head){
		frappe.msgprint("Please select Charge Type first");
		frappe.model.set_value(cdt, cdn, "account_head", "");
	} else if(d.account_head && d.charge_type!=="Actual") {
		frappe.call({
			type:"GET",
			method: "erpnext.controllers.accounts_controller.get_tax_rate",
			args: {"account_head":d.account_head},
			callback: function(r) {
				frappe.model.set_value(cdt, cdn, "rate", r.message.tax_rate || 0);
				frappe.model.set_value(cdt, cdn, "description", r.message.account_name);
			}
		})
	}
}

cur_frm.cscript.validate_taxes_and_charges = function(cdt, cdn) {
	var d = locals[cdt][cdn];
	var msg = "";

	if(d.account_head && !d.description) {
		// set description from account head
		d.description = d.account_head.split(' - ').slice(0, -1).join(' - ');
	}

	if(!d.charge_type && (d.row_id || d.rate || d.tax_amount)) {
		msg = __("Please select Charge Type first");
		d.row_id = "";
		d.rate = d.tax_amount = 0.0;
	} else if((d.charge_type == 'Actual' || d.charge_type == 'On Net Total') && d.row_id) {
		msg = __("Can refer row only if the charge type is 'On Previous Row Amount' or 'Previous Row Total'");
		d.row_id = "";
	} else if((d.charge_type == 'On Previous Row Amount' || d.charge_type == 'On Previous Row Total') && d.row_id) {
		if (d.idx == 1) {
			msg = __("Cannot select charge type as 'On Previous Row Amount' or 'On Previous Row Total' for first row");
			d.charge_type = '';
		} else if (!d.row_id) {
			msg = __("Please specify a valid Row ID for row {0} in table {1}", [d.idx, __(d.doctype)]);
			d.row_id = "";
		} else if(d.row_id && d.row_id >= d.idx) {
			msg = __("Cannot refer row number greater than or equal to current row number for this Charge type");
			d.row_id = "";
		}
	}
	if(msg) {
		frappe.validated = false;
		refresh_field("taxes");
		frappe.throw(msg);
	}

}

cur_frm.cscript.validate_inclusive_tax = function(tax) {
	var actual_type_error = function() {
		var msg = __("Actual type tax cannot be included in Item rate in row {0}", [tax.idx])
		frappe.throw(msg);
	};

	var on_previous_row_error = function(row_range) {
		var msg = __("For row {0} in {1}. To include {2} in Item rate, rows {3} must also be included",
			[tax.idx, __(tax.doctype), tax.charge_type, row_range])
		frappe.throw(msg);
	};

	if(cint(tax.included_in_print_rate)) {
		if(tax.charge_type == "Actual") {
			// inclusive tax cannot be of type Actual
			actual_type_error();
		} else if(tax.charge_type == "On Previous Row Amount" &&
			!cint(this.frm.doc["taxes"][tax.row_id - 1].included_in_print_rate)
		) {
			// referred row should also be an inclusive tax
			on_previous_row_error(tax.row_id);
		} else if(tax.charge_type == "On Previous Row Total") {
			var taxes_not_included = $.map(this.frm.doc["taxes"].slice(0, tax.row_id),
				function(t) { return cint(t.included_in_print_rate) ? null : t; });
			if(taxes_not_included.length > 0) {
				// all rows above this tax should be inclusive
				on_previous_row_error(tax.row_id == 1 ? "1" : "1 - " + tax.row_id);
			}
		} else if(tax.category == "Valuation") {
			frappe.throw(__("Valuation type charges can not marked as Inclusive"));
		}
	}
}

if(!erpnext.taxes.flags[cur_frm.cscript.tax_table]) {
	erpnext.taxes.flags[cur_frm.cscript.tax_table] = true;

	frappe.ui.form.on(cur_frm.cscript.tax_table, "row_id", function(frm, cdt, cdn) {
		cur_frm.cscript.validate_taxes_and_charges(cdt, cdn);
	});

	frappe.ui.form.on(cur_frm.cscript.tax_table, "rate", function(frm, cdt, cdn) {
		cur_frm.cscript.validate_taxes_and_charges(cdt, cdn);
	});

	frappe.ui.form.on(cur_frm.cscript.tax_table, "tax_amount", function(frm, cdt, cdn) {
		cur_frm.cscript.validate_taxes_and_charges(cdt, cdn);
	});

	frappe.ui.form.on(cur_frm.cscript.tax_table, "charge_type", function(frm, cdt, cdn) {
		frm.cscript.validate_taxes_and_charges(cdt, cdn);
		var open_form = frm.open_grid_row();
		if(open_form) {
			erpnext.taxes.set_conditional_mandatory_rate_or_amount(open_form);
		} else {
			// apply in current row
			erpnext.taxes.set_conditional_mandatory_rate_or_amount(frm.get_field('taxes').grid.get_row(cdn));
		}
	});

	frappe.ui.form.on(cur_frm.cscript.tax_table, "included_in_print_rate", function(frm, cdt, cdn) {
		var tax = frappe.get_doc(cdt, cdn);
		try {
			cur_frm.cscript.validate_taxes_and_charges(cdt, cdn);
			cur_frm.cscript.validate_inclusive_tax(tax);
		} catch(e) {
			tax.included_in_print_rate = 0;
			refresh_field("included_in_print_rate", tax.name, tax.parentfield);
			throw e;
		}
	});
}

erpnext.taxes.set_conditional_mandatory_rate_or_amount = function(grid_row) {
	if(grid_row) {
		if(grid_row.doc.charge_type==="Actual") {
			grid_row.toggle_editable("tax_amount", true);
			grid_row.toggle_reqd("tax_amount", true);
			grid_row.toggle_editable("rate", false);
			grid_row.toggle_reqd("rate", false);
		} else {
			grid_row.toggle_editable("rate", true);
			grid_row.toggle_reqd("rate", true);
			grid_row.toggle_editable("tax_amount", false);
			grid_row.toggle_reqd("tax_amount", false);
		}
	}
}


// For customizing print
cur_frm.pformat.total = function(doc) { return ''; }
cur_frm.pformat.discount_amount = function(doc) { return ''; }
cur_frm.pformat.grand_total = function(doc) { return ''; }
cur_frm.pformat.rounded_total = function(doc) { return ''; }
cur_frm.pformat.in_words = function(doc) { return ''; }

cur_frm.pformat.taxes= function(doc){
	//function to make row of table
	var make_row = function(title, val, bold, is_negative) {
		var bstart = '<b>'; var bend = '</b>';
		return '<tr><td style="width:50%;">' + (bold?bstart:'') + title + (bold?bend:'') + '</td>'
			+ '<td style="width:50%;text-align:right;">' + (is_negative ? '- ' : '')
		+ format_currency(val, doc.currency) + '</td></tr>';
	}

	function print_hide(fieldname) {
		var doc_field = frappe.meta.get_docfield(doc.doctype, fieldname, doc.name);
		return doc_field.print_hide;
	}

	out ='';
	if (!doc.print_without_amount) {
		var cl = doc.taxes || [];

		// outer table
		var out='<div><table class="noborder" style="width:100%"><tr><td style="width: 60%"></td><td>';

		// main table

		out +='<table class="noborder" style="width:100%">';

		if(!print_hide('total')) {
			out += make_row('Total', doc.total, 1);
		}

		// Discount Amount on net total
		if(!print_hide('discount_amount') && doc.apply_discount_on == "Net Total" && doc.discount_amount)
			out += make_row('Discount Amount', doc.discount_amount, 0, 1);

		// add rows
		if(cl.length){
			for(var i=0;i<cl.length;i++) {
				if(cl[i].tax_amount!=0 && !cl[i].included_in_print_rate)
					out += make_row(cl[i].description, cl[i].tax_amount, 0);
			}
		}

		// Discount Amount on grand total
		if(!print_hide('discount_amount') && doc.apply_discount_on == "Grand Total" && doc.discount_amount)
			out += make_row('Discount Amount', doc.discount_amount, 0, 1);

		// grand total
		if(!print_hide('grand_total'))
			out += make_row('Grand Total', doc.grand_total, 1);

		if(!print_hide('rounded_total'))
			out += make_row('Rounded Total', doc.rounded_total, 1);

		if(doc.in_words && !print_hide('in_words')) {
			out +='</table></td></tr>';
			out += '<tr><td colspan = "2">';
			out += '<table><tr><td style="width:25%;"><b>In Words</b></td>';
			out += '<td style="width:50%;">' + doc.in_words + '</td></tr>';
		}
		out += '</table></td></tr></table></div>';
	}
	return out;
}


frappe.provide("frappe")
frappe.custom_mutli_add_dialog = function(frm) {
	var dialog;

	const custom_warehouse_template1 = `
	<table class="table table-bordered table-hover table-condensed custom-item-selection-tool">
		<thead>
			<tr>
				<th style="width: 120px" rowspan="2">Item Name</th>
				<th style="width: 240px" rowspan="2">Details</th>
				<th style="width: 220px" colspan="3">Present Qty</th>
				<th style="width: 220px" colspan="3">Reserved Qty</th>
				<th style="width: 90px" >Avail. Qty</th>
			</tr>
			<tr>
				<th>SQM</th>
				<th>Boxes</th>
				<th>Pieces</th>
				<th>SQM</th>
				<th>Boxes</th>
				<th>Pieces</th>
				<th>SQM</th>
			</tr>
		</thead>
		<tbody>
	`;
	
	const custom_warehouse_template2 = `
		</tbody>
	</table>
	`;

	const custom_warehousewise_template1 = `
		<table class="table table-bordered table-hover table-condensed custom-warehouse-detail-tool">
			<thead>
				<tr>
					<th style="width: 280px" rowspan="2">Warehouse Name</th>
					<th style="width: 210px" colspan="3">Present Qty</th>
					<th style="width: 210px" colspan="3">Reserved Qty</th>
					<th style="width: 90px" >Avail. Qty</th>
				</tr>
				<tr>
					<th>SQM</th>
					<th>Boxes</th>
					<th>Pieces</th>
					<th>SQM</th>
					<th>Boxes</th>
					<th>Pieces</th>
					<th>SQM</th>
				</tr>
			</thead>
			<tbody>
		`;
	
	
	let fields = [
			{
				"label": __("Items Beginning with"),
				"fieldname": "item_search",
				"fieldtype": "Data"
			},
			{
				"label": __("Search"),
				"fieldname": "item_search_button",
				"fieldtype": "Button"
			},
			{
				"fieldname": "section_break",
				"fieldtype": "Section Break"
			},
			{
				"label": __("Item Name"),
				"fieldname": "item_code",
				"fieldtype": "Link",
				"options": "Item",
				"onchange": function() {
					console.log("item set");
					renderWarehousewiseItemDetails(frm);
				},
				"reqd": 1,
				"read_only": 1
			},
			{
				"fieldname": "column_break",
				"fieldtype": "Column Break"
			},
			{
				"label": __("Quantity (SQM)"),
				"fieldname": "quantity",
				"fieldtype": "Float",
				"reqd": 1
			},
			{
				"fieldname": "section_break",
				"fieldtype": "Section Break"
			},
			{
				"label": __("Item Detials"),
				"fieldname": "item_html",
				"fieldtype": "HTML"
			}
		]
	dialog = new frappe.ui.Dialog({
		title: __("Select Mutliple Items"),
		fields: fields,
		primary_action: function(values) {
			custom_add_item(frm, values.item_code, values.quantity);
		},
		primary_action_label: __("Add"),
		width: 800
	})

	dialog.fields_dict.item_search_button.input.onclick = function(frm) {
		get_item_details(via_search=true);
	}

	frappe.ui.keys.on("ctrl+f", function() {
		dialog.fields_dict.item_search_button.input.click();
	})

	function get_item_details(via_search) {
		// backend call to find the item details
		let txt = dialog.get_field("item_search").get_value();
		let item_code = '';
		if (!via_search) {
			item_code = dialog.get_field("item_code").get_value();
		}
		if (txt && txt != frappe.custom_item_details_string) {
			frappe.call({
				method: "erpnext.stock.custom_stock_scripts.get_item_details",
				args: {
					args: {
						txt: txt,
						item_code: item_code,
						customer: frm.doc.customer,
						update_stock: frm.doc.update_stock,
						company: frm.doc.company,
						order_type: frm.doc.order_type,
						transaction_date: frm.doc.transaction_date,
						doctype: frm.doc.doctype,
						name: frm.doc.name
					}
				},
				callback: function(r) {
					frappe.custom_item_details = r.message;
					frappe.custom_item_details_string = txt;
					createItemDetailTemplate(frm);
				}
			});
		} else if (true) {
			createItemDetailTemplate(frm);
		}

	}

	function createItemDetailTemplate(frm) {
		let customItemDetailsTemplate = '';
		let item_details = frappe.custom_item_details;
		if (item_details) {
			customItemDetailsTemplate += custom_warehouse_template1;
			for (let item in item_details) {
				let actual_qty_sqm = item_details[item]["item_stock_totals"]["actual_qty"];
				let actual_qty_box = Math.floor( actual_qty_sqm / item_details[item]["uom_box"] );
				let actual_qty_pieces = Math.round(actual_qty_sqm / (item_details[item]["uom_box"] / item_details[item]["uom_pieces"])) % item_details[item]["uom_pieces"];
				let reserved_qty_sqm = item_details[item]["item_stock_totals"]["reserved_qty"];
				let reserved_qty_box = Math.floor( reserved_qty_sqm / item_details[item]["uom_box"] );
				let reserved_qty_pieces = Math.round(reserved_qty_sqm / (item_details[item]["uom_box"] / item_details[item]["uom_pieces"])) % item_details[item]["uom_pieces"];
				customItemDetailsTemplate += `
					<tr data-item=${item} class="custom-item-row">
						<td>${item}</td>
						<td>${item_details[item]["item_details"]}</td>
						<td>${actual_qty_sqm}</td>
						<td>${actual_qty_box || 0}</td>
						<td>${actual_qty_pieces || 0}</td>
						<td>${reserved_qty_sqm}</td>
						<td>${reserved_qty_box || 0}</td>
						<td>${reserved_qty_pieces || 0}</td>
						<td><b>${actual_qty_sqm-reserved_qty_sqm}</b></td>
					</tr>`;
			}
			
			customItemDetailsTemplate += custom_warehouse_template2;
		} else {
			customItemDetailsTemplate += `<div>No Item stock details found.</div>`
		}
		render_html_template(frm, customItemDetailsTemplate);
	}

	function renderWarehousewiseItemDetails(frm) {
		let customWarehouseDetailsTemplate = '';
		// let item_details = frappe.custom_item_details;
		let item_code = dialog.get_field("item_code").get_value();
		let warehouse_dict = frappe.custom_item_details[item_code]["warehouse_details"]
		if (Object.keys(warehouse_dict).length) {
			customWarehouseDetailsTemplate += custom_warehousewise_template1;
			for (let warehouse in warehouse_dict) {
				let actual_qty_sqm = warehouse_dict[warehouse]["actual_qty"];
				let actual_qty_box = Math.floor( actual_qty_sqm / warehouse_dict[warehouse]["uom_box"] );
				let actual_qty_pieces = Math.round(actual_qty_sqm / (warehouse_dict[warehouse]["uom_box"] / warehouse_dict[warehouse]["uom_pieces"])) % warehouse_dict[warehouse]["uom_pieces"];
				let reserved_qty_sqm = warehouse_dict[warehouse]["reserved_qty"];
				let reserved_qty_box = Math.floor( reserved_qty_sqm / warehouse_dict[warehouse]["uom_box"] );
				let reserved_qty_pieces = Math.round(reserved_qty_sqm / (warehouse_dict[warehouse]["uom_box"] / warehouse_dict[warehouse]["uom_pieces"])) % warehouse_dict[warehouse]["uom_pieces"];
				customWarehouseDetailsTemplate += `
				<tr data-item=${warehouse} class="custom-item-row">
					<td>${warehouse}</td>
					<td>${actual_qty_sqm}</td>
					<td>${actual_qty_box || 0}</td>
					<td>${actual_qty_pieces || 0}</td>
					<td>${reserved_qty_sqm}</td>
					<td>${reserved_qty_box || 0}</td>
					<td>${reserved_qty_pieces || 0}</td>
					<td><b>${actual_qty_sqm-reserved_qty_sqm}</b></td>
				</tr>
				`;
				// console.log(warehouse);
			}
			customWarehouseDetailsTemplate += custom_warehouse_template2;
		} else {
			customWarehouseDetailsTemplate += `<div>No Warehouse details found.</div>`
		}
		render_html_template(frm, customWarehouseDetailsTemplate, true);
	}

	function render_html_template(frm, htmlTemplate, warehouseWiseDetails=false) {
		item_html_df = dialog.get_field("item_html");
		$(item_html_df.wrapper).empty();
		var warehouse_table = $(frappe.render_template(htmlTemplate));
		warehouse_table.appendTo(item_html_df.wrapper);

		if (!warehouseWiseDetails) {
			$(".custom-item-row").click( function() {
				let old_item_code = dialog.get_value("item_code");
				let old_quantity = dialog.get_value("quantity");
				let new_quantity = 1;
				let itme_clicked = $(this).attr("data-item");
				dialog.set_value("item_code", itme_clicked);
				if (old_item_code===itme_clicked) {
					new_quantity = old_quantity + 1;
				}
				dialog.set_value("quantity", new_quantity);
			})
		}
	}


	function custom_add_item(frm, item_code, item_qty) {
		// add row or update qty
		var added = false;

		// find row with item if exists
		$.each(frm.doc.items || [], (i, d) => {
			if(d["item_code"]===item_code) {
				frappe.model.set_value(d.doctype, d.name, 'qty', d.qty + item_qty);
				frappe.show_alert({message: __("Added Item  {0} {1}", [item_code, item_qty]), indicator: 'green'});
				added = true;
				return false;
			}
		});

		if(!added) {
			var d = null;

			var item_row = frappe.model.add_child(frm.doc, frm.doctype+" Item", "items");
			item_row.item_code = item_code;
			item_row.qty = item_qty;
			if (frappe.custom_item_details[item_code]) {
				item_row.def_boxes = frappe.custom_item_details[item_code]["uom_box"];
				item_row.def_pieces = frappe.custom_item_details[item_code]["uom_pieces"];
			}

			frm.refresh_field("items");

			frappe.run_serially([
				() => frappe.model.set_value(item_row.doctype, item_row.name, "item_code", item_row.item_code),
				() => frm.script_manager.trigger("item_code", item_row.doctype, item_row.name),
				() => frappe.model.set_value(item_row.doctype, item_row.name, 'qty', item_qty),
				() => frm.script_manager.trigger("qty", item_row.doctype, item_row.name),
				() => frappe.timeout(0.1),
				() => {
					// debugger;
					frm.refresh_field("items");
					frappe.show_alert({message: __("Added Item - {0} with quantity - {1}", [item_code, item_qty]), indicator: 'green'});
				}
			]);
		}
	}

	return dialog;

}
