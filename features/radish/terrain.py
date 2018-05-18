from radish import after

@after.each_scenario
def close_driver(scenario):
    scenario.context.driver.close()