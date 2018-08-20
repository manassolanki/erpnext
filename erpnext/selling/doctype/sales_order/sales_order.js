// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

{% include 'erpnext/selling/sales_common.js' %}

frappe.ui.form.on("Sales Order", {
	setup: function(frm) {
		frm.custom_make_buttons = {
			'Delivery Note': 'Delivery',
			'Sales Invoice': 'Invoice',
			'Material Request': 'Material Request',
			'Purchase Order': 'Purchase Order',
			'Project': 'Project'
		}
		frm.add_fetch('customer', 'tax_id', 'tax_id');

		// formatter for material request item
		frm.set_indicator_formatter('item_code',
			function(doc) { return (doc.stock_qty<=doc.delivered_qty) ? "green" : "orange" })
	},
	onload: function(frm) {
		erpnext.queries.setup_queries(frm, "Warehouse", function() {
			return erpnext.queries.warehouse(frm.doc);
		});

		frm.set_query('project', function(doc, cdt, cdn) {
			return {
				query: "erpnext.controllers.queries.get_project_name",
				filters: {
					'customer': doc.customer
				}
			}
		});

		erpnext.queries.setup_warehouse_query(frm);
	},

	delivery_date: function(frm) {
		$.each(frm.doc.items || [], function(i, d) {
			if(!d.delivery_date) d.delivery_date = frm.doc.delivery_date;
		});
		refresh_field("items");
	},

	onload_post_render: function(frm) {
		frm.get_field("items").grid.set_multiple_add("item_code", "qty");
	}
});

frappe.ui.form.on("Sales Order Item", {
	item_code: function(frm,cdt,cdn) {
		var row = locals[cdt][cdn];
		if (frm.doc.delivery_date) {
			row.delivery_date = frm.doc.delivery_date;
			refresh_field("delivery_date", cdn, "items");
		} else {
			frm.script_manager.copy_from_first_row("items", row, ["delivery_date"]);
		}
	},
	delivery_date: function(frm, cdt, cdn) {
		if(!frm.doc.delivery_date) {
			erpnext.utils.copy_value_in_all_row(frm.doc, cdt, cdn, "items", "delivery_date");
		}
	}
});

erpnext.selling.SalesOrderController = erpnext.selling.SellingController.extend({
	onload: function(doc, dt, dn) {
		this._super();
	},

	refresh: function(doc, dt, dn) {
		var me = this;
		this._super();
		var allow_purchase = false;
		var allow_delivery = false;

		if (this.frm.doc.docstatus == 0) {
			var item_childtable = $("div[data-fieldname='items']")[1];
			var grid_buttons = $(item_childtable).find(".grid-buttons");
			if (!$(grid_buttons).hasClass("custom-add-multiple-rows")) {
				$(grid_buttons).append(`
					<button type="reset" class="custom-add-multiple-rows btn btn-xs btn-default"
							style="margin-right: 4px;">
						Add Items
					</button>
				`)
			}
			$(grid_buttons).find(".custom-add-multiple-rows").click(function() {
				me.custom_add_multiple_items();
			})
		}
		if(doc.docstatus==1) {
			if(doc.status != 'Closed') {

				for (var i in this.frm.doc.items) {
					var item = this.frm.doc.items[i];
					if(item.delivered_by_supplier === 1 || item.supplier){
						if(item.qty > flt(item.ordered_qty)
							&& item.qty > flt(item.delivered_qty)) {
							allow_purchase = true;
						}
					}

					if (item.delivered_by_supplier===0) {
						if(item.qty > flt(item.delivered_qty)) {
							allow_delivery = true;
						}
					}

					if (allow_delivery && allow_purchase) {
						break;
					}
				}

				if (this.frm.has_perm("submit")) {
					// close
					if(flt(doc.per_delivered, 6) < 100 || flt(doc.per_billed) < 100) {
						this.frm.add_custom_button(__('Close'),
							function() { me.close_sales_order() }, __("Status"))
					}
				}

				// delivery note
				if(flt(doc.per_delivered, 6) < 100 && ["Sales", "Shopping Cart"].indexOf(doc.order_type)!==-1 && allow_delivery) {
					this.frm.add_custom_button(__('Delivery'),
						function() { me.make_delivery_note_based_on_delivery_date(); }, __("Make"));
					this.frm.add_custom_button(__('Production Order'),
						function() { me.make_production_order() }, __("Make"));

					this.frm.page.set_inner_btn_group_as_primary(__("Make"));
				}

				// sales invoice
				if(flt(doc.per_billed, 6) < 100) {
					this.frm.add_custom_button(__('Invoice'),
						function() { me.make_sales_invoice() }, __("Make"));
				}

				// material request
				if(!doc.order_type || ["Sales", "Shopping Cart"].indexOf(doc.order_type)!==-1
					&& flt(doc.per_delivered, 6) < 100) {
					this.frm.add_custom_button(__('Material Request'),
						function() { me.make_material_request() }, __("Make"));
				}

				// make purchase order
				if(flt(doc.per_delivered, 6) < 100 && allow_purchase) {
					this.frm.add_custom_button(__('Purchase Order'),
						function() { me.make_purchase_order() }, __("Make"));
				}

				// payment request
				if(flt(doc.per_billed)==0) {
					this.frm.add_custom_button(__('Payment Request'),
						function() { me.make_payment_request() }, __("Make"));
					this.frm.add_custom_button(__('Payment'),
						function() { me.make_payment_entry() }, __("Make"));
				}

				// maintenance
				if(flt(doc.per_delivered, 2) < 100 &&
						["Sales", "Shopping Cart"].indexOf(doc.order_type)===-1) {
					this.frm.add_custom_button(__('Maintenance Visit'),
						function() { me.make_maintenance_visit() }, __("Make"));
					this.frm.add_custom_button(__('Maintenance Schedule'),
						function() { me.make_maintenance_schedule() }, __("Make"));
				}

				// project
				if(flt(doc.per_delivered, 2) < 100 && ["Sales", "Shopping Cart"].indexOf(doc.order_type)!==-1 && allow_delivery) {
						this.frm.add_custom_button(__('Project'),
							function() { me.make_project() }, __("Make"));
				}

				if(!doc.subscription) {
					this.frm.add_custom_button(__('Subscription'), function() {
						erpnext.utils.make_subscription(doc.doctype, doc.name)
					}, __("Make"))
				}

			} else {
				if (this.frm.has_perm("submit")) {
					// un-close
					this.frm.add_custom_button(__('Re-open'), function() {
						me.frm.cscript.update_status('Re-open', 'Draft')
					}, __("Status"));
				}
			}
		}

		if (this.frm.doc.docstatus===0) {
			this.frm.add_custom_button(__('Quotation'),
				function() {
					erpnext.utils.map_current_doc({
						method: "erpnext.selling.doctype.quotation.quotation.make_sales_order",
						source_doctype: "Quotation",
						target: me.frm,
						setters: {
							customer: me.frm.doc.customer || undefined
						},
						get_query_filters: {
							company: me.frm.doc.company,
							docstatus: 1,
							status: ["!=", "Lost"],
						}
					})
				}, __("Get items from"));
		}

		this.order_type(doc);
	},

	make_production_order() {
		var me = this;
		this.frm.call({
			doc: this.frm.doc,
			method: 'get_production_order_items',
			callback: function(r) {
				if(!r.message) {
					frappe.msgprint({
						title: __('Production Order not created'),
						message: __('No Items with Bill of Materials to Manufacture'),
						indicator: 'orange'
					});
					return;
				}
				else if(!r.message) {
					frappe.msgprint({
						title: __('Production Order not created'),
						message: __('Production Order already created for all items with BOM'),
						indicator: 'orange'
					});
					return;
				} else {
					var fields = [
						{fieldtype:'Table', fieldname: 'items',
							description: __('Select BOM and Qty for Production'),
							fields: [
								{fieldtype:'Read Only', fieldname:'item_code',
									label: __('Item Code'), in_list_view:1},
								{fieldtype:'Link', fieldname:'bom', options: 'BOM', reqd: 1,
									label: __('Select BOM'), in_list_view:1, get_query: function(doc) {
										return {filters: {item: doc.item_code}};
									}},
								{fieldtype:'Float', fieldname:'pending_qty', reqd: 1,
									label: __('Qty'), in_list_view:1},
								{fieldtype:'Data', fieldname:'sales_order_item', reqd: 1,
									label: __('Sales Order Item'), hidden:1}
							],
							data: r.message,
							get_data: function() {
								return r.message
							}
						}
					]
					var d = new frappe.ui.Dialog({
						title: __('Select Items to Manufacture'),
						fields: fields,
						primary_action: function() {
							var data = d.get_values();
							me.frm.call({
								method: 'make_production_orders',
								args: {
									items: data,
									company: me.frm.doc.company,
									sales_order: me.frm.docname,
									project: me.frm.project
								},
								freeze: true,
								callback: function(r) {
									if(r.message) {
										frappe.msgprint({
											message: __('Production Orders Created: {0}',
												[r.message.map(function(d) {
													return repl('<a href="#Form/Production Order/%(name)s">%(name)s</a>', {name:d})
												}).join(', ')]),
											indicator: 'green'
										})
									}
									d.hide();
								}
							});
						},
						primary_action_label: __('Make')
					});
					d.show();
				}
			}
		});
	},

	order_type: function() {
		this.frm.fields_dict.items.grid.toggle_reqd("delivery_date", this.frm.doc.order_type == "Sales");
	},

	tc_name: function() {
		this.get_terms();
	},

	make_material_request: function() {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_material_request",
			frm: this.frm
		})
	},

	make_delivery_note_based_on_delivery_date: function() {
		var me = this;

		if (this.frm.doc.advance_paid < this.frm.doc.grand_total && !in_list(frappe.user_roles, "Delivery Note Approver")) {
			frappe.msgprint({
				title: __('Payment Not Done'),
				message: __('Not allowed to create the Delivery Note before Payment'),
				indicator: 'orange'
			});
			return;
		}

		var delivery_dates = [];
		$.each(this.frm.doc.items || [], function(i, d) {
			if(!delivery_dates.includes(d.delivery_date)) {
				delivery_dates.push(d.delivery_date);
			}
		});

		var item_grid = this.frm.fields_dict["items"].grid;
		if(!item_grid.get_selected().length && delivery_dates.length > 1) {
			var dialog = new frappe.ui.Dialog({
				title: __("Select Items based on Delivery Date"),
				fields: [{fieldtype: "HTML", fieldname: "dates_html"}]
			});

			var html = $(`
				<div style="border: 1px solid #d1d8dd">
					<div class="list-item list-item--head">
						<div class="list-item__content list-item__content--flex-2">
							${__('Delivery Date')}
						</div>
					</div>
					${delivery_dates.map(date => `
						<div class="list-item">
							<div class="list-item__content list-item__content--flex-2">
								<label>
								<input type="checkbox" data-date="${date}" checked="checked"/>
								${frappe.datetime.str_to_user(date)}
								</label>
							</div>
						</div>
					`).join("")}
				</div>
			`);

			var wrapper = dialog.fields_dict.dates_html.$wrapper;
			wrapper.html(html);

			dialog.set_primary_action(__("Select"), function() {
				var dates = wrapper.find('input[type=checkbox]:checked')
					.map((i, el) => $(el).attr('data-date')).toArray();

				if(!dates) return;

				$.each(dates, function(i, d) {
					$.each(item_grid.grid_rows || [], function(j, row) {
						if(row.doc.delivery_date == d) {
							row.doc.__checked = 1;
						}
					});
				})
				me.make_delivery_note();
				dialog.hide();
			});
			dialog.show();
		} else {
			this.make_delivery_note();
		}
	},

	make_delivery_note: function() {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_delivery_note",
			frm: me.frm
		})
	},

	make_sales_invoice: function() {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice",
			frm: this.frm
		})
	},

	make_maintenance_schedule: function() {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_maintenance_schedule",
			frm: this.frm
		})
	},

	make_project: function() {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_project",
			frm: this.frm
		})
	},

	make_maintenance_visit: function() {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_maintenance_visit",
			frm: this.frm
		})
	},

	make_purchase_order: function(){
		var me = this;
		var dialog = new frappe.ui.Dialog({
			title: __("For Supplier"),
			fields: [
				{"fieldtype": "Link", "label": __("Supplier"), "fieldname": "supplier", "options":"Supplier",
					"get_query": function () {
						return {
							query:"erpnext.selling.doctype.sales_order.sales_order.get_supplier",
							filters: {'parent': me.frm.doc.name}
						}
					}, "reqd": 1 },
				{"fieldtype": "Button", "label": __("Make Purchase Order"), "fieldname": "make_purchase_order", "cssClass": "btn-primary"},
			]
		});

		dialog.fields_dict.make_purchase_order.$input.click(function() {
			var args = dialog.get_values();
			if(!args) return;
			dialog.hide();
			return frappe.call({
				type: "GET",
				method: "erpnext.selling.doctype.sales_order.sales_order.make_purchase_order_for_drop_shipment",
				args: {
					"source_name": me.frm.doc.name,
					"for_supplier": args.supplier
				},
				freeze: true,
				callback: function(r) {
					if(!r.exc) {
						var doc = frappe.model.sync(r.message);
						frappe.set_route("Form", r.message.doctype, r.message.name);
					}
				}
			})
		});
		dialog.show();
	},
	close_sales_order: function(){
		this.frm.cscript.update_status("Close", "Closed")
	},
	update_status: function(label, status){
		var doc = this.frm.doc;
		var me = this;
		frappe.ui.form.is_saving = true;
		frappe.call({
			method: "erpnext.selling.doctype.sales_order.sales_order.update_status",
			args: {status: status, name: doc.name},
			callback: function(r){
				me.frm.reload_doc();
			},
			always: function() {
				frappe.ui.form.is_saving = false;
			}
		});
	},
	on_submit: function(doc, cdt, cdn) {
		if(cint(frappe.boot.notification_settings.sales_order)) {
			this.frm.email_doc(frappe.boot.notification_settings.sales_order_message);
		}
	},

	custom_add_multiple_items: function() {

		// frappe.custom_mutli_add_dialog(this.frm).show();
		let multi_item_dialog = frappe.custom_mutli_add_dialog(this.frm);
		multi_item_dialog.show();
		multi_item_dialog.$wrapper.find('.modal-dialog').css("width", "960px");

	}
});
$.extend(cur_frm.cscript, new erpnext.selling.SalesOrderController({frm: cur_frm}));


frappe.provide("frappe")
frappe.custom_mutli_add_dialog = function(frm) {
	var dialog;

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
			console.log("final values-------------------->>");
			console.log(values);
			custom_add_item(frm, values.item_code, values.quantity);
		},
		primary_action_label: __("Add"),
		width: 800
	})

	dialog.fields_dict.item_search_button.input.onclick = function(frm) {
		console.log("clicked")
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
		if (txt) {
			frappe.call({
				method: "erpnext.stock.custom_stock_scripts.get_item_details",
				args: {
					args: {
						txt: txt,
						item_code: item_code,
						customer: cur_frm.doc.customer,
						update_stock: cur_frm.doc.update_stock,
						company: cur_frm.doc.company,
						order_type: cur_frm.doc.order_type,
						transaction_date: cur_frm.doc.transaction_date,
						doctype: cur_frm.doc.doctype,
						name: cur_frm.doc.name
					}
				},
				callback: function(r) {

					let item_details = r.message;
					frappe.custom_item_details = r.message;

					item_html_df = dialog.get_field("item_html");
					$(item_html_df.wrapper).empty();
					let stock_table = '';

					if (r.message) {
						stock_table += custom_warehouse_template1;
						for (let item in item_details) {
							let actual_qty_sqm = item_details[item]["item_stock_totals"]["actual_qty"];
							let actual_qty_box = Math.floor( actual_qty_sqm / item_details[item]["uom_box"] );
							let actual_qty_pieces = Math.round(actual_qty_sqm / (item_details[item]["uom_box"] / item_details[item]["uom_pieces"])) % item_details[item]["uom_pieces"];
							let reserved_qty_sqm = item_details[item]["item_stock_totals"]["reserved_qty"];
							let reserved_qty_box = Math.floor( reserved_qty_sqm / item_details[item]["uom_box"] );
							let reserved_qty_pieces = Math.round(reserved_qty_sqm / (item_details[item]["uom_box"] / item_details[item]["uom_pieces"])) % item_details[item]["uom_pieces"];
							stock_table += `
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
							</tr>
							`;
						}
						stock_table += custom_warehouse_template2;
					} else {
						stock_table += `<div>No Item stock details found.</div>`
					}
					var warehouse_table = $(frappe.render_template(stock_table));
					warehouse_table.appendTo(item_html_df.wrapper);

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
			});
		}

	}

	function create_html_table(frm) {

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

			var item_row = frappe.model.add_child(frm.doc, "Sales Order Item", "items");
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
					frm.refresh_field("items");
					frappe.show_alert({message: __("Added Item - {0} with quantity - {1}", [item_code, item_qty]), indicator: 'green'});
				}
			]);
		}
	}

	return dialog;

}


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