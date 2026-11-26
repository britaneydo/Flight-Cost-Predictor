import json
import random
from datetime import date, datetime
from pathlib import Path
import pandas as pd

FEATURES = ["destinationAirport", "day", "time", "window", "stops", "airline"]

AIRLINE_NAMES = {
    "AA": "American", "AS": "Alaska", "B6": "JetBlue", "DL": "Delta",
    "F9": "Frontier", "NK": "Spirit", "SY": "Sun Country", "UA": "United",
}

# loads dataset and convert into 6 chosen categories (destination AIrport, day, time, window, stops, airline)
def load_data(path="data/lax_flights.parquet"):
    df = pd.read_parquet(path)

    flight_date = pd.to_datetime(df["flightDate"])
    days_ahead = (flight_date - pd.to_datetime(df["searchDate"])).dt.days

    df["day"] = flight_date.dt.day_name().str[:3]
    df["window"] = pd.cut(
        days_ahead,
        bins=[-1, 7, 21, 45, 9999],
        labels=["0-7", "8-21", "22-45", "46+"],
    ).astype(str)

    hour = df["segmentsDepartureTimeRaw"].str[11:13].astype(int)
    df["time"] = "Evening"
    df.loc[(hour >= 3) & (hour <= 11), "time"] = "Morning"
    df.loc[(hour >= 12) & (hour <= 17), "time"] = "Afternoon"

    df["stops"] = df["isNonStop"].map({True: "Nonstop", False: "1+"})
    df["airline"] = df["segmentsAirlineCode"].str[:2]
    return df

# uses fit as training method to create proability lookup tables --> multiplies probablilites together
class BasicNaiveBayes:
    def __init__(self, features):
        self.features = features
        self.priors = {}       # P(good_deal=True) and P(good_deal=False)
        self.cond_probs = {}   # P(feature=value | good_deal)

    def fit(self, train_df):
        total = len(train_df)

        for label in [True, False]:
            subset = train_df[train_df["good_deal"] == label]
            class_count = len(subset)

            # calculates the baseline chance of a flight being a good deal vs a bad deal before looking at any flight details
            self.priors[label] = class_count / total
            self.cond_probs[label] = {}

            # how often every category shows up, divides by total number in the class
            for feat in self.features:
                counts = subset[feat].value_counts().to_dict()
                all_values = train_df[feat].unique()
                num_values = len(all_values)

                self.cond_probs[label][feat] = {
                    val: (counts.get(val, 0) + 1) / (class_count + num_values)
                    for val in all_values
                }

    def predict_chance(self, flight):
        """Returns P(good_deal=True | flight) as a number between 0 and 1."""
        # will assume a flight is both a good then a bad deal --> baseline prior and multiplies in the matching conditional probability for each of the 6 features
        joint = {}
        for label in [True, False]:
            prob = self.priors[label]
            for feat in self.features:
                val = flight.get(feat)
                if val is not None:
                    prob *= self.cond_probs[label][feat].get(val, 1e-6)
            joint[label] = prob
        return joint[True] / (joint[True] + joint[False])


# search function destination and flight date --> how many days away it is from today
def get_window(flight_date_str):
    flight_dt = datetime.strptime(flight_date_str, "%Y-%m-%d").date()
    days = (flight_dt - date.today()).days
    if days <= 7:
        return "0-7"
    if days <= 21:
        return "8-21"
    if days <= 45:
        return "22-45"
    return "46+"

# flight detail cominations for the airport (we are using LAX)
def recommend_flights(model, df, destination, flight_date_str):
    flight_dt = datetime.strptime(flight_date_str, "%Y-%m-%d").date()
    day = flight_dt.strftime("%a")
    window = get_window(flight_date_str)

    route_df = df[df["destinationAirport"] == destination]
    options = route_df[["airline", "stops", "time"]].drop_duplicates()

    results = []
    for row in options.itertuples(index=False):
        query = {
            "destinationAirport": destination,
            "day": day,
            "time": row.time,
            "window": window,
            "stops": row.stops,
            "airline": row.airline,
        }
        chance = model.predict_chance(query) * 100
        results.append((chance, row.airline, row.stops, row.time))

    results.sort(reverse=True)

    print(f"\nLAX -> {destination} on {flight_date_str} ({day}, {window} days ahead)")
    print("-" * 58)
    for chance, code, stops, time in results[:10]:
        name = AIRLINE_NAMES.get(code, code)
        print(f"{name:<11} | {stops:<7} | {time:<9} — {chance:.1f}% chance of a good deal")

if __name__ == "__main__":
    df = load_data()

    # 80/20 split grouped by legId so the same flight is never in both train & test
    unique_legs = df["legId"].unique().tolist()
    random.Random(42).shuffle(unique_legs)
    split = int(len(unique_legs) * 0.8)
    train_legs = set(unique_legs[:split])

    train = df[df["legId"].isin(train_legs)].copy()
    test = df[~df["legId"].isin(train_legs)].copy()

    # 33rd-percentile fare separately (computed on train only)
    cutoffs = train.groupby("destinationAirport")["totalFare"].quantile(0.33)
    train["good_deal"] = train["totalFare"] <= train["destinationAirport"].map(cutoffs)
    test["good_deal"] = test["totalFare"] <= test["destinationAirport"].map(cutoffs)

    # train Naive Bayes
    model = BasicNaiveBayes(FEATURES)
    model.fit(train)

    # evaluate accuracy on the test set
    correct = 0
    for row in test[FEATURES + ["good_deal"]].itertuples(index=False):
        query = dict(zip(FEATURES, row[:-1]))
        pred = model.predict_chance(query) >= 0.5
        if pred == row[-1]:
            correct += 1

    print(f"Test Accuracy: {correct / len(test) * 100:.2f}% on {len(test):,} flights")

    # example search
    recommend_flights(model, df, destination="BOS", flight_date_str="2026-12-15")
    
    # retrain on 100% of the data and save a clean model_params.json in data folder for the website
    full_cutoffs = df.groupby("destinationAirport")["totalFare"].quantile(0.33)
    df["good_deal"] = df["totalFare"] <= df["destinationAirport"].map(full_cutoffs)

    final_model = BasicNaiveBayes(FEATURES)
    final_model.fit(df)

    # save the unique flight options + median fare so the website never loads the 85 MB parquet
    grouped = df.groupby(
        ["destinationAirport", "airline", "stops", "time"], observed=True
    )["totalFare"].agg(["median", "count"]).reset_index()

    options = [
        {
            "destinationAirport": row.destinationAirport,
            "airline": row.airline,
            "stops": row.stops,
            "time": row.time,
            "median_fare": round(float(row.median), 2),
        }
        for row in grouped.itertuples(index=False)
        if row.count >= 20
    ]

    model_data = {
        "features": FEATURES,
        "priors": {str(k): v for k, v in final_model.priors.items()},
        "cond_probs": {str(k): v for k, v in final_model.cond_probs.items()},
        "options": options,
    }

    Path("data/model_params.json").write_text(json.dumps(model_data, indent=2))
    print("\nSaved new data/model_params.json")