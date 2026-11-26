from datetime import date

def validate_destination(destination):
    if destination == "ATL" or destination == "BOS" or destination == "LGA":
        return True
    else:
        return False

# Citing code
# Source: https://docs.python.org/3/library/datetime.html
def validate_date(departure_date):
    chosen_date = date.fromisoformat(departure_date)
    current_date = date.today()
    days_ahead = (chosen_date - current_date).days

    if days_ahead < 1 or days_ahead > 60:
        return False

    return True

# Citing code
# Source: https://www.pythonmorsels.com/strptime/
def get_day(departure_date):
    chosen_date = date.fromisoformat(departure_date)
    day = chosen_date.strftime("%a")
    return day

def booking_window(departure_date):
    chosen_date = date.fromisoformat(departure_date)
    current_date = date.today()
    days_ahead = (chosen_date - current_date).days
    if days_ahead >= 1 and days_ahead <= 7:
        return "1-7"
    elif days_ahead >= 8 and days_ahead <= 21:
        return "8-21"
    elif days_ahead >= 22 and days_ahead <= 45:
        return "22-45"
    elif days_ahead >= 46 and days_ahead <= 60:
        return "46-60"
    else:
        return None