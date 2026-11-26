def validate_destination(destination):
    if destination == "ATL" or destination == "BOS" or destination == "LGA":
        return True
    else:
        return False
