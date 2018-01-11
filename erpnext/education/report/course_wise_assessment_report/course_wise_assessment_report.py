# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import flt
from collections import defaultdict, OrderedDict
from erpnext.education.api import get_grade
import time
from pprint import pprint

def execute(filters=None):
	data = []
	args = frappe._dict()

	args["academic_year"] = filters.get("academic_year")
	args["course"] = filters.get("course")
	args["assessment_group"] = filters.get("assessment_group")

	args["academic_term"] = filters.get("academic_term")
	args["student_group"] = filters.get("student_group")

	if args["assessment_group"] == "All Assessment Groups":
		frappe.throw(_("Please select the assessment group other than 'All Assessment Groups'"))

	start = time.clock()
	print ("==== started")
	student_dict, result_dict, assessment_criteria_dict = create_formatted_result(args)
	print ("total time taken=====>>> ", time.clock() - start, "total student==>> ", len(result_dict))

	columns = get_column(assessment_criteria_dict)
	data = []
	chart = data_to_be_printed = []
	for student in result_dict:
		tmp_dict = {}
		tmp_dict["student"] = student
		tmp_dict["student_name"] = student_dict[student]
		for criteria in assessment_criteria_dict:
			if criteria in result_dict[student][args.course][args.assessment_group]:
				tmp_dict[frappe.scrub(criteria)] = result_dict[student][args.course][args.assessment_group][criteria]["grade"]
				tmp_dict[frappe.scrub(criteria) + "_score"] = result_dict[student][args.course][args.assessment_group][criteria]["score"]
			else:
				tmp_dict[frappe.scrub(criteria)] = ""
				tmp_dict[frappe.scrub(criteria)+ "_score"] = ""
		data.append(tmp_dict)
	return columns, data, None, chart, data_to_be_printed


def create_formatted_result(args):
	condition1, condition2, condition3, condition, condition5 = " ", " ", " ", " ", " "
	args_list = [args.academic_year]

	if args.course:
		condition = " and ar.course=%s"
		args_list.append(args.course)

	if args.academic_term:
		condition1 = " and ar.academic_term=%s"
		args_list.append(args.academic_term)

	if args.student_group:
		condition2 = " and ar.student_group=%s"
		args_list.append(args.student_group)

	create_total_dict = False
	group_type = frappe.get_value("Assessment Group", args.assessment_group, "is_group")
	if group_type:
		from frappe.desk.treeview import get_children
		assessment_groups = [d.get("value") for d in get_children("Assessment Group",
			args.assessment_group) if d.get("value") and not d.get("expandable")]
		condition3 = " and ar.assessment_group in (%s)"%(', '.join(['%s']*len(assessment_groups)))
	else:
		assessment_groups = [args.assessment_group]
		condition3 = " and ar.assessment_group=%s"
	args_list += assessment_groups

	# args.student = "STUD01707"
	if args.student:
		condition5 = " and ar.student=%s"
		args_list.append(args.student)


	assessment_result = frappe.db.sql('''
		SELECT
			ar.student, ar.student_name, ar.academic_year, ar.academic_term, ar.program, ar.course,
			ar.assessment_plan, ar.grading_scale, ar.assessment_group, ar.student_group,
			ard.assessment_criteria, ard.maximum_score, ard.grade, ard.score
		FROM
			`tabAssessment Result` ar, `tabAssessment Result Detail` ard
		WHERE
			ar.name=ard.parent and ar.docstatus=1 and ar.academic_year=%s {0} {1} {2} {3} {4}
		ORDER BY
			ard.assessment_criteria'''.format(condition, condition1, condition2, condition3, condition5),
		tuple(args_list), as_dict=1)

	# create the data structure as given below:
	# <variable_name>.<student_name>.<course>.<assessment_group>.<assessment_criteria>.<grade/score/max_score>
	#	{student1: {course1: { assessment_group1: {criteria1: {"score": "__", "grade": "__", "max_score": "__"}, criteria2: {...}, ...}
	#				assessment_group2: {...}}},
	#	 student2: {...}}
	# "total_score" -> assessment criteria used for totaling and args.assessment_group -> for totaling all the assesments

	student_details = {}
	formatted_assessment_result = defaultdict(dict)
	assessment_criteria_dict = OrderedDict()
	if not (len(assessment_groups) == 1 and assessment_groups[0] == args.assessment_group):
		create_total_dict = True


	for result in assessment_result:
		if result.student not in student_details:
			student_details[result.student] = result.student_name

		assessment_criteria_details = frappe._dict({"assessment_criteria": result.assessment_criteria,
			"maximum_score": result.maximum_score, "score": result.score, "grade": result.grade})

		if not formatted_assessment_result[result.student]:
			formatted_assessment_result[result.student] = defaultdict(dict)
		if not formatted_assessment_result[result.student][result.course]:
			formatted_assessment_result[result.student][result.course] = defaultdict(dict)

		formatted_assessment_result[result.student][result.course][result.assessment_group][result.assessment_criteria] = assessment_criteria_details

		# create the assessment criteria "Total Score" with the sum of all the scores of the assessment criteria in a given assessment group
		if "Total Score" not in formatted_assessment_result[result.student][result.course][result.assessment_group]:
			formatted_assessment_result[result.student][result.course][result.assessment_group]["Total Score"] = frappe._dict({"assessment_criteria": "Total Score",
				"maximum_score": result.maximum_score, "score": result.score, "grade": result.grade})
		else:
			formatted_assessment_result[result.student][result.course][result.assessment_group]["Total Score"]["maximum_score"] += result.maximum_score
			formatted_assessment_result[result.student][result.course][result.assessment_group]["Total Score"]["score"] += result.score
			tmp_grade = get_grade(result.grading_scale, ((formatted_assessment_result[result.student][result.course][result.assessment_group]\
				["Total Score"]["score"])/(formatted_assessment_result[result.student][result.course][result.assessment_group]\
				["Total Score"]["maximum_score"]))*100)
			formatted_assessment_result[result.student][result.course][result.assessment_group]["Total Score"]["grade"] = tmp_grade


		# create the total of all the assessment groups criteria-wise
		if create_total_dict:
			if not formatted_assessment_result[result.student][result.course][args.assessment_group]:
				formatted_assessment_result[result.student][result.course][args.assessment_group] = defaultdict(dict)
				formatted_assessment_result[result.student][result.course][args.assessment_group][result.assessment_criteria] = assessment_criteria_details
			elif result.assessment_criteria not in formatted_assessment_result[result.student][result.course][args.assessment_group]:
				formatted_assessment_result[result.student][result.course][args.assessment_group][result.assessment_criteria] = assessment_criteria_details
			elif result.assessment_criteria in formatted_assessment_result[result.student][result.course][args.assessment_group]:
				formatted_assessment_result[result.student][result.course][args.assessment_group][result.assessment_criteria]["maximum_score"] += result.maximum_score
				formatted_assessment_result[result.student][result.course][args.assessment_group][result.assessment_criteria]["score"] += result.score
				temp_grade = get_grade(result.grading_scale, ((formatted_assessment_result[result.student][result.course][args.assessment_group]\
					[result.assessment_criteria]["score"])/(formatted_assessment_result[result.student][result.course][args.assessment_group]\
					[result.assessment_criteria]["maximum_score"]))*100)
				formatted_assessment_result[result.student][result.course][args.assessment_group][result.assessment_criteria]["grade"] = temp_grade

			if "Total Score" not in formatted_assessment_result[result.student][result.course][args.assessment_group]:
				formatted_assessment_result[result.student][result.course][args.assessment_group]["Total Score"] = frappe._dict({"assessment_criteria": "Total Score",
					"maximum_score": result.maximum_score, "score": result.score, "grade": result.grade})
			else:
				formatted_assessment_result[result.student][result.course][args.assessment_group]["Total Score"]["maximum_score"] += result.maximum_score
				formatted_assessment_result[result.student][result.course][args.assessment_group]["Total Score"]["score"] += result.score
				temp_grade = get_grade(result.grading_scale, ((formatted_assessment_result[result.student][result.course][args.assessment_group]\
					["Total Score"]["score"])/(formatted_assessment_result[result.student][result.course][args.assessment_group]\
					["Total Score"]["maximum_score"]))*100)
				formatted_assessment_result[result.student][result.course][args.assessment_group]["Total Score"]["grade"] = temp_grade


		assessment_criteria_dict[result.assessment_criteria] = formatted_assessment_result[result.student][result.course][args.assessment_group][result.assessment_criteria]["maximum_score"]
		total_maximum_score = formatted_assessment_result[result.student][result.course][args.assessment_group]["Total Score"]["maximum_score"]

	assessment_criteria_dict["Total Score"] = total_maximum_score

	return student_details, formatted_assessment_result, assessment_criteria_dict

	# print (formatted_assessment_result)

	# # find all assessment plan and related details linked with the given filters
	# def get_assessment_details():
	# 	if args["student_group"]:
	# 		cond = "and ap.student_group=%(student_group)s"
	# 	else:
	# 		cond = ''

	# 	assessment_plan = frappe.db.sql('''
	# 		select
	# 			ap.name, ap.student_group, ap.grading_scale, apc.assessment_criteria, apc.maximum_score as max_score
	# 		from
	# 			`tabAssessment Plan` ap, `tabAssessment Plan Criteria` apc
	# 		where
	# 			ap.assessment_group=%(assessment_group)s and ap.course=%(course)s and
	# 			ap.name=apc.parent and ap.docstatus=1 {0}
	# 		order by
	# 			apc.assessment_criteria'''.format(cond), (args), as_dict=1)

	# 	assessment_plan_list = list(set([d["name"] for d in assessment_plan]))
	# 	if not assessment_plan_list:
	# 		frappe.throw(_("No assessment plan linked with this assessment group"))

	# 	assessment_criteria_list = list(set([(d["assessment_criteria"],d["max_score"]) for d in assessment_plan]))
	# 	student_group_list = list(set([d["student_group"] for d in assessment_plan]))
	# 	total_maximum_score = flt(sum([flt(d[1]) for d in assessment_criteria_list]))
	# 	grading_scale = assessment_plan[0]["grading_scale"]

	# 	return assessment_plan_list, assessment_criteria_list, total_maximum_score, grading_scale, student_group_list


	# # get all the result and make a dict map student as the key and value as dict of result
	# def get_result_map():
	# 	result_dict = defaultdict(dict)
	# 	kounter = defaultdict(dict)
	# 	assessment_result = frappe.db.sql('''select ar.student, ard.assessment_criteria, ard.grade, ard.score
	# 		from `tabAssessment Result` ar, `tabAssessment Result Detail` ard
	# 		where ar.assessment_plan in (%s) and ar.name=ard.parent and ar.docstatus=1
	# 		order by ard.assessment_criteria''' %', '.join(['%s']*len(assessment_plan_list)),
	# 		tuple(assessment_plan_list), as_dict=1)

	# 	for result in assessment_result:
	# 		if "total_score" in result_dict[result.student]:
	# 			total_score = result_dict[result.student]["total_score"] + result.score
	# 		else:
	# 			total_score = result.score
	# 		total = get_grade(grading_scale, (total_score/total_maximum_score)*100)

	# 		if result.grade in kounter[result.assessment_criteria]:
	# 			kounter[result.assessment_criteria][result.grade] += 1
	# 		else:
	# 			kounter[result.assessment_criteria].update({result.grade: 1})

	# 		if "Total" not in kounter:
	# 			kounter["Total"] = {}

	# 		if "total" in result_dict[result.student]:
	# 			prev_grade = result_dict[result.student]["total"]
	# 			prev_grade_count = kounter["Total"].get(prev_grade) - 1
	# 			kounter["Total"].update({prev_grade: prev_grade_count})
	# 		latest_grade_count = kounter["Total"].get(total)+1 if kounter["Total"].get(total) else 1
	# 		kounter["Total"].update({total: latest_grade_count})

	# 		result_dict[result.student].update({
	# 				frappe.scrub(result.assessment_criteria): result.grade,
	# 				frappe.scrub(result.assessment_criteria)+"_score": result.score,
	# 				"total_score": total_score,
	# 				"total": total
	# 			})

	# 	return result_dict, kounter

	# # make data from the result dict
	# def get_data():
	# 	student_list = frappe.db.sql('''select sgs.student, sgs.student_name
	# 		from `tabStudent Group` sg, `tabStudent Group Student` sgs
	# 		where sg.name = sgs.parent and sg.name in (%s)
	# 		order by sgs.group_roll_number asc''' %', '.join(['%s']*len(student_group_list)),
	# 		tuple(student_group_list), as_dict=1)

	# 	for student in student_list:
	# 		student.update(result_dict[student.student])
	# 	return student_list


	# # get chart data
	# def get_chart():
	# 	grading_scale = frappe.db.get_value("Assessment Plan", list(assessment_plan_list)[0], "grading_scale")
	# 	grades = frappe.db.sql_list('''select grade_code from `tabGrading Scale Interval` where parent=%s''',
	# 		(grading_scale))
	# 	criteria_list = [d[0] for d in assessment_criteria_list] + ["Total"]
	# 	return get_chart_data(grades, criteria_list, kounter)


	# assessment_plan_list, assessment_criteria_list, total_maximum_score, grading_scale,\
	# 	student_group_list = get_assessment_details()
	# result_dict, kounter = get_result_map()
	# data = get_data()

	# columns = get_column(assessment_criteria_list, total_maximum_score)
	# chart = get_chart()
	# data_to_be_printed = [{
	# 	"assessment_plan": ", ".join(assessment_plan_list)
	# }]


def get_column(assessment_criteria):
	columns = [{
		"fieldname": "student",
		"label": _("Student ID"),
		"fieldtype": "Link",
		"options": "Student",
		"width": 90
	},
	{
		"fieldname": "student_name",
		"label": _("Student Name"),
		"fieldtype": "Data",
		"width": 160
	}]
	for d in assessment_criteria:
		columns.append({
			"fieldname": frappe.scrub(d),
			"label": d,
			"fieldtype": "Data",
			"width": 110
		})
		columns.append({
			"fieldname": frappe.scrub(d) +"_score",
			"label": "Score(" + str(int(assessment_criteria[d])) + ")",
			"fieldtype": "Float",
			"width": 100
		})

	return columns

def get_chart_data(grades, assessment_criteria_list, kounter):
	grades = sorted(grades)
	datasets = []

	for grade in grades:
		tmp = frappe._dict({"values":[], "title": grade})
		for criteria in assessment_criteria_list:
			if grade in kounter[criteria]:
				tmp["values"].append(kounter[criteria][grade])
			else:
				tmp["values"].append(0)
		datasets.append(tmp)

	return {
		"data": {
			"labels": assessment_criteria_list,
			"datasets": datasets
		},
		"type": 'bar',
	}
