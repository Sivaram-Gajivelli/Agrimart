import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
from datetime import timedelta

clean_folder = "datasets/cleaned"

all_data = []

# -----------------------------
# LOAD ALL DATASETS
# -----------------------------
for file in os.listdir(clean_folder):

    if file.endswith(".csv"):

        file_path = os.path.join(clean_folder, file)
        df = pd.read_csv(file_path)

        vegetable = file.replace("cleaned_", "").replace(".csv", "")
        df["Vegetable"] = vegetable

        all_data.append(df)

data = pd.concat(all_data, ignore_index=True)

# -----------------------------
# ENCODE VEGETABLE NAMES
# -----------------------------
veg_names = data["Vegetable"].astype("category")
veg_mapping = dict(enumerate(veg_names.cat.categories))

data["Vegetable"] = veg_names.cat.codes

# -----------------------------
# FEATURES AND TARGET
# -----------------------------
X = data[[
    "Vegetable",
    "Month",
    "Min Price",
    "Max Price",
    "Prev Price",
    "Price Change"
]]

y = data["Modal Price"]

# -----------------------------
# TRAIN TEST SPLIT
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# -----------------------------
# TRAIN RANDOM FOREST
# -----------------------------
model = RandomForestRegressor(
    n_estimators=200,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# -----------------------------
# MODEL EVALUATION
# -----------------------------
predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print("\nMODEL PERFORMANCE")
print("Mean Absolute Error:", round(mae,2))
print("R2 Score:", round(r2,2))

# -----------------------------
# SAVE MODEL DETAILS
# -----------------------------
with open("model_details.txt", "w") as f:
    f.write(str(model))
    f.write("\n\nParameters:\n")
    f.write(str(model.get_params()))

print("Model details saved in model_details.txt")

# -----------------------------
# PREDICTION RESULTS
# -----------------------------
test_data = X_test.copy()
test_data["Vegetable Name"] = test_data["Vegetable"].map(veg_mapping)

results = pd.DataFrame({
    "Vegetable": test_data["Vegetable Name"].values,
    "Actual Price": y_test.values,
    "Predicted Price": predictions
})

results["Predicted Price"] = results["Predicted Price"].round(2)

results.to_csv("prediction_results.csv", index=False)

print("Prediction results saved in prediction_results.csv")

# -----------------------------
# VEGETABLE WISE SUMMARY
# -----------------------------
summary = results.groupby("Vegetable").agg({
    "Actual Price":"mean",
    "Predicted Price":"mean"
}).reset_index()

summary["Error"] = abs(summary["Actual Price"] - summary["Predicted Price"])

summary = summary.round(2)

summary.to_csv("vegetable_price_summary.csv", index=False)

print("Vegetable wise summary saved in vegetable_price_summary.csv")

# -----------------------------
# FUTURE PRICE PREDICTION
# -----------------------------
future_predictions = []

for veg_code, veg_name in veg_mapping.items():

    veg_data = data[data["Vegetable"] == veg_code]

    last_row = veg_data.iloc[-1]

    # Next day prediction date
    prediction_date = pd.to_datetime(last_row["Price Date"]) + timedelta(days=1)

    sample = pd.DataFrame([{
        "Vegetable": veg_code,
        "Month": last_row["Month"],
        "Min Price": last_row["Min Price"],
        "Max Price": last_row["Max Price"],
        "Prev Price": last_row["Prev Price"],
        "Price Change": last_row["Price Change"]
    }])

    predicted_price = model.predict(sample)[0]

    future_predictions.append({
        "Date": prediction_date.strftime("%Y-%m-%d"),
        "Vegetable": veg_name,
        "Current Price": round(last_row["Modal Price"],2),
        "Predicted Price": round(predicted_price,2)
    })

future_df = pd.DataFrame(future_predictions)

future_df.to_csv("future_price_predictions.csv", index=False)

print("Future price predictions saved in future_price_predictions.csv")