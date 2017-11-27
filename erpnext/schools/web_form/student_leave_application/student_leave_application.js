frappe.ready(function() {
	// bind events here
	// debugger;
	// var me = this;
	// let student_details = []
	// function get_student_detail() {
	// 	console.log("in the setup");
	// 	frappe.call({
	// 		method: "erpnext.schools.web_form.student_leave_application.student_leave_application.get_student_detail",
	// 		callback: function(r) {
	// 			console.log(r);
	// 			student_details = r.message
	// 			$.each(student_details, function (i, student) {
	// 				$("select[name='student'][data-doctype='Student Leave Application']").append($('<option>', { 
	// 					value: student.student,
	// 					text : student.student
	// 				}));
	// 			});
	// 		}
	// 	})
	// }
	// get_student_detials();
	$("select[name='student'][data-doctype='Student Leave Application']").on("click", function(input){
		student = $(input.target).val();
		console.log("hi there" + student);
		console.log($("select[name='student_name'][data-doctype='Student Leave Application']").val());
	});

})