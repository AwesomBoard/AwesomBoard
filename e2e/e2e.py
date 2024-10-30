from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import random
import string
import time
import textwrap

# Conventions:
# - avoid time.sleep when wait_for can be used instead
# - each scenario should end with the user *not* being in any game

# Set to False to see the script happening in real time. Useful for debugging
HEADLESS = True
# Set to True if somehow the selenium driver is acting like a mobile device (with small screen)
MOBILE = False
USER_RESPONSE_TIME=0.2 # A typical user cannot click faster than once every 200ms, and we may need some more time for displaying some components

class PlayerDriver():
    def __init__(self):
        options = Options()
        if HEADLESS:
            options.add_argument('-headless')
        self.driver = webdriver.Chrome(options=options)
        # If the browser (fake) window is too small, selenium complains that some elements are not clickable, so make sure it's big enough
        self.driver.set_window_size(1920, 1080)
        # Print the window size so that we can detect from the logs if it's done correctly
        print(self.driver.get_window_size())

    def close(self):
        '''Close the browser'''
        self.driver.close()

    def ensure_no_errors(self):
        '''Ensures that no error has been logged in the browser's console'''
        logs = self.driver.get_log('browser')

        # To debug e2e tests, this is a good place. What is nice to do is:
        #   - add console.warn into the frontend
        #   - print(logs) here to see all logs (only warnings and errors are logge)
        # Another useful thing is to display the full page with, e.g.:
        #   print(user.driver.find_element(By.CSS_SELECTOR, 'body').get_attribute('innerHTML'))

        errors = False
        for log in logs:
            print('[browser]' + log['message'])
            if log['level'] == 'SEVERE':
                errors = True
        if errors:
            raise Exception('Errors encountered, stopping here.')

    def go_to_page(self, url):
        '''Visit an URL'''
        self.driver.get(url)
        # Make sure the page has fully loaded
        self.wait_for('app-root')

    def reload_page(self):
        '''Reload the current page'''
        self.driver.get(self.driver.current_url)

    def register(self, name_prefix):
        '''Registers the user by filling in the registration form'''
        self.username = name_prefix + ''.join(random.choices(string.ascii_uppercase + string.digits, k=16))
        self.email = self.username + '@everyboard.org'
        self.password = ''.join(random.choices(string.ascii_uppercase + string.digits, k=16))
        self.go_to_page('http://localhost:4200')
        # Access registration page
        if MOBILE:
            self.click('.navbar-burger')
        self.click('#register')

        # Fill in registration form
        self.fill('#email', self.email)
        self.fill('#username', self.username)
        self.fill('#password', self.password)

        # Click on registration button
        self.click('#registerButton')

        # Click on finalize verification button
        time.sleep(0.5) # Wait for the email verification to be done by the other script
        self.click('#finalizeVerification')
        time.sleep(0.5) # Need to wait a bit before the verification is done, otherwise we risk getting auth/network-request-failed

    def wait_for(self, selector, timeout=120):
        '''Wait for an element to be present on the page. Timeout is in seconds'''
        print('Waiting for "{}"'.format(selector))
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))

    def click(self, selector):
        '''Click somewhere'''
        try:
            print('Clicking button: {}'.format(selector))
            # Force a small wait to mimick a real user. This is to stabilize these tests a bit more
            time.sleep(USER_RESPONSE_TIME)
            button = self.wait_for(selector)
            button.click()
        except Exception as e:
            print('Failed when clicking on button "{}": {}'.format(selector, e))
            raise e

    def fill(self, selector, content):
        '''Fill in a form field'''
        try:
            input = self.wait_for(selector)
            input.clear()
            input.send_keys(content)
        except Exception as e:
            print('Failed when filling in field "{}"'.format(selector))
            raise e

    def click_menu_button(self, hover_selector, button_selector):
        '''Click on a button of the main menu'''
        try:
            if MOBILE:
                self.click('.navbar-burger')
            else:
                hover = self.wait_for(hover_selector)
                actions = ActionChains(self.driver)
                actions.move_to_element(hover).perform()
            self.click(button_selector)
        except Exception as e:
            print('Failed when hovering over "{}" and clicking on button "{}"'.format(hover_selector, button_selector))
            raise e

    def select(self, selector, selection):
        '''Select an element from a <select>'''
        try:
            element = Select(self.wait_for(selector))
            element.select_by_visible_text(selection)
        except Exception as e:
            print('Failed when selecting from drop down "{}"'.format(selector))
            raise e

    def get_text_of(self, selector):
        '''Extract the text of an element'''
        try:
            print('Getting text of {}'.format(selector))
            element = self.wait_for(selector)
            return element.get_attribute('innerText')
        except Exception as e:
            print('Failed when getting text of "{}"'.format(selector))
            raise e

    def get_current_url(self):
        '''Retrieve the URL of the currently displayed page'''
        return self.driver.current_url

    def access_game_list(self):
        '''Accesses the list of games'''
        # Go back to the main page
        self.click('#logo')

        # Go to the lobby
        self.click('#seeGameList')

        # Now I should see the game list (this will throw it if does not find it)
        self.wait_for('#game-list-tab')

    def logout(self):
        '''Logs the current user out'''
        # Just click on the logout button
        self.click_menu_button('#connectedUserName', '#logout')

    def login(self):
        '''Log in an existing user (in case we logged out before)'''
        # Go to the login page
        if MOBILE:
            self.click('.navbar-burger')
        self.click('#login')

        # Fill in the form
        self.fill('#email', self.email)
        self.fill('#password', self.password)

        # Log in
        self.click('#loginButton')

    def use_default_config(self):
        '''Pick the default config on a game, if there is one'''
        try:
            # Click on 'accept config' for configurable games
            accept_config_button = self.driver.find_element(By.ID, 'start-game-with-config')
            accept_config_button.click()
        except:
            # Games that do not have start-game-with-config are not configurable so we already use the default config
            pass

    def create_part(self, opponent):
        '''
        Create an online game and start it
        '''

        # Player 1 creates the part
        self.click('#createOnlineGame')
        self.click('#image-P4')

        # Player 1 configures the part
        self.click('#firstPlayerCreator') # Player 1 will start

        # Player 2 joins the part
        opponent.click('#seeGameList')
        opponent.click('#part-of-{}'.format(self.username))

        # Player 1 sees player 2 arrive and selects them
        self.click('#presenceOf_{}'.format(opponent.username))
        self.click('#proposeConfig')

        # Player 2 accepts
        opponent.click('#acceptConfig')

        self.wait_for('#playerTurn')

    def should_see_element(self, selector):
        self.driver.find_element(By.CSS_SELECTOR, selector)

def scenario(kind):
    def decorator(func):
        scenarios[kind] = [func] + scenarios[kind]
    return decorator

scenarios = {
    'simple': [],
    'registered': [],
    'two_drivers': [],
}

def launch_scenarios():
    '''
    Launches all the scenarios, stop at the first one that fails.
    It is important that each scenario finishes what it started, e.g., if a part is created, it should be canceled or ended
    '''
    driver = PlayerDriver()
    #driver.get('http://localhost:4200')

    for simple_scenario in scenarios['simple']:
       # Always go back home for a new scenario
       driver.go_to_page('http://localhost:4200')
       driver.ensure_no_errors() # we don't want errors before starting scenarios
       print('----------------------------------------------')
       print('Running scenario: ' + simple_scenario.__name__)
       simple_scenario(driver)
       driver.ensure_no_errors()

    # Now we need a registered account
    driver.register('1-')
    for registered_scenario in scenarios['registered']:
        driver.go_to_page('http://localhost:4200')
        driver.ensure_no_errors()
        print('----------------------------------------------')
        print('Running scenario: ' + registered_scenario.__name__)
        registered_scenario(driver)
        driver.ensure_no_errors()

    # Now we need another driver
    driver2 = PlayerDriver()
    driver2.register('2-')
    for two_drivers_scenario in scenarios['two_drivers']:
        driver.go_to_page('http://localhost:4200')
        driver2.go_to_page('http://localhost:4200')
        driver.ensure_no_errors()
        driver2.ensure_no_errors()
        print('----------------------------------------------')
        print('Running scenario: ' + two_drivers_scenario.__name__)
        two_drivers_scenario(driver, driver2)
        driver.ensure_no_errors()
        driver2.ensure_no_errors()

    driver.close()
    driver2.close()

@scenario('registered')
def can_access_lobby_after_registration(user):
    '''
    Role: I am a logged in user
    Action: I try to access the lobby
    Result: It works
    '''
    user.access_game_list()

@scenario('registered')
def can_logout_and_login(user):
    '''
    Role: I am a registered and logged in user
    Action: I want to be able to log out and log back in
    Result: I am logged in and I can again access the lobby
    '''
    user.logout()
    user.login()
    user.access_game_list()

@scenario('simple')
def can_play_tutorial(user):
    '''
    Role: I am a visitor
    Action: I play the four in a row tutorial
    Result: I can complete it fully
    '''
    # Launch the tutorial
    user.click_menu_button('#playOffline', '#tutorial')
    user.click('#image-P4')

    # First step does not require any move, so just click ok
    user.click('#nextButton')

    # In the second step I should play something, so I just do it
    user.click('#click-3-0 > rect')
    user.click('#nextButton')

    # The third step requires me to win, so I do it
    user.click('#click-1-0 > rect')
    user.click('#nextButton')

    # The final step also requires me to win
    user.click('#click-4-0 > rect')
    user.click('#nextButton')

    # Now I should have finished the tuto
    # And it should show a button to play locally
    user.should_see_element('#playLocallyButton')

@scenario('simple')
def can_play_local_2_players(user):
    '''
    Scenario: I am a visitor
    Action: I play a game against a friend on the same computer
    Result: I can go until the end of the game
    '''
    # Launch a game of four in a row
    user.click_menu_button('#playOffline', '#playLocally')
    user.click('#image-P4')
    user.use_default_config()

    # Stupid game between player 0 and 1, where 0 wins
    user.click('#click-3-0 > rect')
    user.click('#click-2-0 > rect')
    user.click('#click-3-0 > rect')
    user.click('#click-2-0 > rect')
    user.click('#click-3-0 > rect')
    user.click('#click-2-0 > rect')
    user.click('#click-3-0 > rect')

    # Now 0 ("Player 1") won
    winner = user.get_text_of('#game-result')
    if winner != 'Player 1 won':
        raise Exception('failed: text should be {}'.format(winner))

@scenario('simple')
def can_play_local_vs_ai(user):
    '''
    Scenario: I am a visitor
    Action: I play a game against the AI
    Result: The AI plays its move and I can play again
    '''

    # Launch a game of four in a row
    user.click_menu_button('#playOffline', '#playLocally')
    user.click('#image-P4')
    user.use_default_config()

    # Select the AI as second player
    user.select('#player-select-1', 'Minimax')
    user.select('#ai-option-select-1', 'Level 1')

    # I play a move
    user.click('#click-2-0 > rect')

    # Let AI play
    # It's back to us when the background is set to our color
    # (it's important to have no space between the CSS class and the id)
    user.wait_for('.player0-bg#board-highlight')

    # AI should have played a second move, I can play again
    user.click('#click-1-0 > rect')

    # Now there should be a piece in #click-1-5 (the bottom row)
    user.wait_for('#click-1-5 > circle')

@scenario('two_drivers')
def can_create_part_and_play(user1, user2):
    '''
    Role: We are two registered users
    Action: We create and play a full game
    Result: We see who has won
    '''
    user1.create_part(user2)
    # Now we are in the game!
    # Let's play it until the end
    user1.wait_for('#playerTurn')
    user1.click('#click-3-0 > rect')
    user2.wait_for('#playerTurn')
    user2.click('#click-2-0 > rect')
    user1.wait_for('#playerTurn')
    user1.click('#click-3-0 > rect')
    user2.wait_for('#playerTurn')
    user2.click('#click-2-0 > rect')
    user1.wait_for('#playerTurn')
    user1.click('#click-3-0 > rect')
    user2.wait_for('#playerTurn')
    user2.click('#click-2-0 > rect')
    user1.wait_for('#playerTurn')
    user1.click('#click-3-0 > rect')

    # Now player 1 has won
    user1.wait_for('#youWonIndicator')
    user2.wait_for('#youLostIndicator')

@scenario('registered')
def can_reload_part_creation(user):
    '''
    Role: I am a registered user with a game in creation
    Action: I reload the page
    Result: It works
    '''
    # I create a part
    user.click('#createOnlineGame')
    user.click('#image-P4')
    user.wait_for('#partCreation')

    # I reload the page
    user.reload_page()

    # Now I should still be on the part creation page
    user.wait_for('#partCreation')

    # Cleanup
    user.click('#cancel')
    time.sleep(1) # needed to make sure that the request has been well handled, otherwise we receive "failed to fetch" errors

@scenario('two_drivers')
def can_reload_game(user1, user2):
    '''
    Role: We are two users in a game
    Action: I reload the page
    Result: It works
    '''
    # A game is being played
    user1.create_part(user2)

    # I reload the page
    user1.reload_page()

    # Now I should still see the game
    user1.wait_for('#game')

    # Cleanup
    user1.click('#resign')
    user1.wait_for('#resignIndicator')

@scenario('two_drivers')
def can_perform_time_actions(user1, user2):
    '''
    Role: We are two users in a game
    Action: I add time to my opponent (turn and global time)
    Result: I see they have more time than before
    '''
    def parse_time(t):
        minutes, seconds = t.split(':')
        return int(minutes) * 60 + int(seconds)

    def check_time_increase(chrono_name):
        remainingTimeBeforeAddition = parse_time(user1.get_text_of('{} span'.format(chrono_name)))

        # I add time to the opponent
        user1.click('{} .button'.format(chrono_name))
        time.sleep(1) # wait a bit to receive the update

        # I can see they have more time now
        remainingTimeAfterAddition = parse_time(user1.get_text_of('{} span'.format(chrono_name)))
        if not(remainingTimeAfterAddition > remainingTimeBeforeAddition):
            print('Time was not added!')
            raise Exception('Test failed')

    # A game is being played
    user1.create_part(user2)

    # I can add global time
    check_time_increase('#chrono-one-global')
    # I can add turn time
    check_time_increase('#chrono-one-turn')

    # Cleanup
    user1.click('#resign')
    user1.wait_for('#resignIndicator')

@scenario('two_drivers')
def can_perform_take_back(user1, user2):
    '''
    Role: We are two users in a game
    Action: I ask a take back and the opponent refuses, but then accepts on my second request
    Result: I took back my turn only after the acceptance
    '''
    def parse_turn(t):
        return int(t[7:]) # Drop the 'Turn n°' part
    # A game is being played for a few turns
    user1.create_part(user2)
    user1.wait_for('#playerTurn')
    user1.click('#click-3-0 > rect')
    user2.wait_for('#playerTurn')
    user2.click('#click-2-0 > rect')
    user1.wait_for('#playerTurn')
    user1.click('#click-3-0 > rect')

    # I can ask for take back
    user1.click('#proposeTakeBack')
    turnBeforeTakeBack = parse_turn(user1.get_text_of('#turn-number'))

    # After take back is accepted, my turn has decreased
    user2.click('#accept')
    time.sleep(1) # make sure we have received the update
    turnAfterTakeBack = parse_turn(user1.get_text_of('#turn-number'))

    if not(turnAfterTakeBack < turnBeforeTakeBack):
        print('Turn has not decreased')
        raise Exception('Test failed')

    # Cleanup
    user1.click('#resign')
    user1.wait_for('#resignIndicator')

@scenario('two_drivers')
def can_draw(user1, user2):
    '''
    Role: We are two users in a game
    Action: I ask to draw and opponent refuses, but then accepts on my second request
    Result: We draw but only after the acceptance
    '''
    # A game is being played
    user1.create_part(user2)
    # I propose draw and the opponent accepts it
    user1.click('#proposeDraw')
    user2.click('#accept')

    # I can see that the part is a draw
    user1.wait_for('#yourOpponentAgreedToDrawIndicator')

@scenario('two_drivers')
def can_hard_draw(user1, user2):
    '''
    Role: We are two users in a game
    Action: We play until the end with a hard draw
    Result: We see that it is indeed a hard draw
    '''
    def play(user, column):
        user.wait_for('#playerTurn')
        user.click('#click-{}-0'.format(column))
    # A game is being played
    user1.create_part(user2)
    # We eventually arrive at a draw
    cols = [(0, 0), (0, 0), (0, 0),
            (1, 1), (1, 1), (1, 1),
            (2, 2), (2, 2), (2, 2),
            (4, 3), (3, 3), (3, 3),
            (3, 4), (4, 4), (4, 4),
            (5, 5), (5, 5), (5, 5),
            (6, 6), (6, 6), (6, 6)]
    for cols_to_play in cols:
        play(user1, cols_to_play[0])
        play(user2, cols_to_play[1])

    # We see the draw
    user1.wait_for('#hardDrawIndicator')
    user2.wait_for('#hardDrawIndicator')

@scenario('two_drivers')
def can_resign(user1, user2):
    '''
    Role: We are two users in a game
    Action: I resign
    Result: I lost
    '''
    # A game is being played
    user1.create_part(user2)
    # I resign
    user1.click('#resign')
    # We can see I resigned
    user1.wait_for('#resignIndicator')
    user2.wait_for('#resignIndicator')

@scenario('two_drivers')
def can_rematch(user1, user2):
    '''
    Role: We are two users in a game
    Action: I resign and ask for rematch, the opponent accepts
    Result: We started a new game
    '''
    # A game has finished
    user1.create_part(user2)
    user1.click('#resign')
    game_url = user1.get_current_url()

    # I ask for a rematch and the user accepts
    user1.click('#proposeRematch')
    user2.click('#accept')
    time.sleep(1) # To make sure the page is reloaded

    # It is a new part
    user1.wait_for('#game')
    new_game_url = user1.get_current_url()
    if not(new_game_url != game_url):
        print('Game has not changed!')
        raise Exception('Test failed')

    user1.click('#resign')
    user1.wait_for('#resignIndicator')

if __name__ == '__main__':
    launch_scenarios()
