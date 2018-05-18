# -*- coding: utf-8 -*-

from radish import given, when, then


@given("숫자 {number1:g} 랑 {number2:g}")
def have_numbers(step, number1, number2):
    step.context.number1 = number1
    step.context.number2 = number2


@when("더하기")
def sum_numbers(step):
    step.context.result = step.context.number1 + \
        step.context.number2


@then("그럼 결과는 {result:g}")
def expect_result(step, result):
    assert step.context.result == result


