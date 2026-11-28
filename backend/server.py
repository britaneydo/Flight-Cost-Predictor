import json
from datetime import date, datetime
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).parent
# point to backend/data/model_params.json after reorganization
MODEL_FILE = Path(BASE_DIR, 'data', 'model_params.json')

# good_deal_days = good_deal_true.value_counts("day", normalize = True)
raw_text = MODEL_FILE.read_text()

raw_text_dict = json.loads(raw_text)

print(raw_text_dict['cond_probs']['True']['destinationAirport'].keys())

@app.route('/flight-options', methods=['GET'])
def get_flights():

    destination = request.args.get('to')
    flight_date = request.args.get('depart')

    if not destination or not flight_date:
        return jsonify({'error': 'make sure destination and flight_date are provided/also may be invalid entry'}), 400

    if destination not in raw_text_dict['cond_probs']['True']['destinationAirport']:
        return jsonify({'error': 'destination does not exist/fetch error'}), 400

    for option in raw_text_dict['options']:

        departure = datetime.strptime(flight_date, "%Y-%m-%d").date()
        day = departure.strftime("%a")
        if destination == option['destinationAirport']:

            flight_airline = option['airline']
            flight_time = option['time']
            flight_stops = option['stops']

            good_deal_true = (raw_text_dict['cond_probs']['True']['time'][flight_time] 
                              * raw_text_dict['cond_probs']['True']['airline'][flight_airline] 
                              * raw_text_dict['cond_probs']['True']['destinationAirport'][destination]
                              * raw_text_dict['cond_probs']['True']['stops'][flight_stops]
                              * raw_text_dict['priors']['True'])
        

   



    