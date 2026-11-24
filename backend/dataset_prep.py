# LINK TO DATASET: https://www.kaggle.com/datasets/dilwong/flightprices?resource=download

# libraries
import pandas as pd

# cols in our dataset. i only chose the 9 that we need
# just a heads up i tried to download the dataset with just these 9 columns, but it took forever. i think i waited for like an hour before giving up. you can try but i dont recommend it. if you do manage to get
# it to download, it would still be too large to add to this gh. i ended up just cutting down the file immensely (check dataset.ipynb)
COLS = ["legId", "searchDate", "flightDate", "startingAirport", "destinationAirport", "isNonStop", "totalFare", "segmentsDepartureTimeRaw", "segmentsAirlineCode"]

parts = []

# file is way too large to read in all at once. this line reads the dataset 500k lines at a time.
for chunk in pd.read_csv("data/raw/itineraries.csv", usecols=COLS, chunksize=500_000): 
    # only doing LAX since the dataset is so large
    parts.append(chunk[chunk.startingAirport == "LAX"])

# turn all LAX flights into a table
df = pd.concat(parts)

# parquet is just a file that is smaller than a CSV and easier to load. 
# pip install pyarrow to run this line.
# index = false means we dont need the first column that stores the indices of each row. redundant.
df.to_parquet("data/raw/lax_flightsLARGE.parquet", index=False)

# check to make sure everything worked
print(len(df), "rows saved")