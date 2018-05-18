Feature: 네이버에 접속해 네이버를 검색하기
  네이버에서 네이버를 검색하면 사이트 정보 칸에 네이버 링크가 뜬다
  "네이버"나 "naver" 둘 다 같은 기업으로 링크가 돼야 한다

  Background: 네이버에 접속
    Given 크롬 브라우저를 사용
    And 브라우저로 http://www.naver.com에 접속

  Scenario: 네이버 검색하기
    Given 검색창에 아래 검색어를 입력
      """
      네이버
      """
    When 검색 버튼 누름
    Then 사이트 정보 칸이 나옴
    And 사이트 정보 칸의 홈페이지 주소가 "www.naver.com" 임

  Scenario: naver 검색하기
    Given 검색창에 아래 검색어를 입력
      """
      naver
      """
    When 검색 버튼 누름
    Then 사이트 정보 칸이 나옴
    And 사이트 정보 칸의 홈페이지 주소가 "www.naver.com" 임


