Feature: 잘못된 덧셈
  실패하기 위한 테스트입니다

  Scenario: 5 + 6 = 1???
    Given 숫자 5 랑 6
    When 더하기
    Then 그럼 결과는 1
