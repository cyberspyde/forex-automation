import pyautogui
import time
import os

mt4_path = 'c:\\Program Files (x86)\\XM Global MT4\\Terminal.exe'
experts_folder = 'C:\\Users\\ilhom\\AppData\\Roaming\\MetaQuotes\\Terminal\\98A82F92176B73A2100FCD1F8ABD7255\\MQL4\\Experts'
result_folder = "d:\Github\\forex-automation\\results"

# Images
expert_advisor = 'expert_advisor.png'
start = 'start.png'
modelling_quality = 'modelling_quality.png'
report = 'report.png'
settings = 'settings.png'

def open_mt4(path_to_mt4):
    os.startfile(path_to_mt4)
    time.sleep(10)

def scan_folder_for_ex4(folder_path):
    ex4_files = []
    for file_name in os.listdir(folder_path):
        if file_name.endswith('.ex4'):
            ex4_files.append(os.path.splitext(file_name)[0])
    return ex4_files

def run_tester_on_bot(bot_name, scroll_top):
    while True:
        time.sleep(5)
        try:
            location = pyautogui.locateOnScreen(expert_advisor, confidence=0.8)
            if location is not None:
                pyautogui.moveTo(location[0]+200, location[1]+5)
                pyautogui.click()
                break
        except pyautogui.ImageNotFoundException:
            print("Expert Advisor button is not found. Please keep the mt4 open and leave the screen on...")

# SCROLLING Ea names
    if scroll_top:
        time.sleep(1)
        pyautogui.scroll(2000000)
    else:
        time.sleep(1)
        pyautogui.scroll(-180)

    while True:
        time.sleep(5)
        try:
            location = pyautogui.locateOnScreen(start, confidence=0.8)
            if location is not None:
                pyautogui.moveTo(location[0]+5, location[1]+5)
                pyautogui.click()
                break
        except pyautogui.ImageNotFoundException:
            print("Start button is not found. Please keep the mt4 open and leave the screen on...")

    print(f"Testing {bot_name} is started...")
    while True:
        time.sleep(5)
        try:
            location = pyautogui.locateOnScreen(report)
            if location is not None:
                pyautogui.moveTo(location[0]+5, location[1]+5)
                pyautogui.click()
                break
        except pyautogui.ImageNotFoundException:
            print("Report button is not found. Please keep the mt4 open and leave the screen on...")

    print(f"Report button is clicked...")

def wait_for_report(bot_name, timeout=1800):
    start_time = time.time()
    while True:
        time.sleep(2)
        try:
            location = pyautogui.locateOnScreen(modelling_quality, confidence=0.8)
            if location is not None:
                pyautogui.moveTo(location[0]+5, location[1]+5)
                time.sleep(1)
                pyautogui.rightClick()
                time.sleep(1)
                pyautogui.moveTo(location[0]+60, location[1]+70)
                time.sleep(1)
                pyautogui.click()
                time.sleep(1)
                pyautogui.typewrite(f"{bot_name}", interval=0.8)
                time.sleep(1)
                pyautogui.press('enter')
                time.sleep(1)
                pyautogui.hotkey('alt', 'f4')
                time.sleep(2)
                location = pyautogui.locateOnScreen(settings, confidence=0.8)
                if location is not None:
                    pyautogui.moveTo(location[0]+20, location[1]+15)
                    pyautogui.click()
                    break
                break
            if time.time() - start_time > timeout:
                raise TimeoutError("Report did not appear within the given timeout period.")
        except pyautogui.ImageNotFoundException:
            print("Test is running...")



if __name__ == '__main__':

    open_mt4(mt4_path)
    ex4_files = scan_folder_for_ex4(experts_folder)

    #running the first bot because the scrolls will be different
    first_bot = ex4_files[0]
    run_tester_on_bot(first_bot, True)
    wait_for_report(first_bot)

    for bot in ex4_files[1:]:
        run_tester_on_bot(bot, False)
        wait_for_report(bot)
        time.sleep(5)

    print("All tests completed!")

