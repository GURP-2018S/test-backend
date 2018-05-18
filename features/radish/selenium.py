from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

from radish import given, when, then, step, custom_type, register_custom_type, TypeBuilder

selenium_grid_url = "http://localhost:4444/wd/hub"


@custom_type('URL',
             r'(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)')
def parse_url(text):
    return (text)


@step('크롬 브라우저를 사용')
def use_chrome(step):
    CHROME = DesiredCapabilities.CHROME.copy()
    step.context.driver = webdriver.Remote(desired_capabilities=CHROME,
                                           command_executor=selenium_grid_url)


@step('브라우저로 {url:URL}에 접속')
def connect_url(step, url):
    step.context.driver.get(url)


@step('검색창에 아래 검색어를 입력')
def naver_search_keyword(step):
    step.context.driver.find_element_by_css_selector('#query').send_keys(step.text)


@step('검색 버튼 누름')
def naver_search_button(step):
    search_button = step.context.driver. \
        find_element_by_css_selector('#search_btn')

    search_button.submit()


@then('사이트 정보 칸이 나옴')
def naver_there_is_enterprise_info(step):
    step.context.driver.save_screenshot('./info.png')
    company_section = step.context.driver. \
        find_element_by_css_selector('div.nsite')


@then('사이트 정보 칸의 홈페이지 주소가 "{url:URL}" 임')
def naver_enterprise_homepage(step, url):
    ent_info = step.context.driver. \
        find_element_by_css_selector('div.nsite .url')

    assert ent_info.text == url
