import pandas as pd
import os

raw_folder = "datasets/raw"
clean_folder = "datasets/cleaned"

os.makedirs(clean_folder, exist_ok=True)

for file in os.listdir(raw_folder):

    if file.endswith(".csv"):

        print(f"\nProcessing: {file}")

        file_path = os.path.join(raw_folder, file)

        # Skip title row
        df = pd.read_csv(file_path, skiprows=1)

        # Select required columns
        df = df[["Price Date", "Min Price", "Max Price", "Modal Price"]]

        # Remove commas
        df["Min Price"] = df["Min Price"].astype(str).str.replace(",", "")
        df["Max Price"] = df["Max Price"].astype(str).str.replace(",", "")
        df["Modal Price"] = df["Modal Price"].astype(str).str.replace(",", "")

        # Convert data types
        df["Price Date"] = pd.to_datetime(df["Price Date"], dayfirst=True)

        df["Min Price"] = pd.to_numeric(df["Min Price"], errors="coerce")
        df["Max Price"] = pd.to_numeric(df["Max Price"], errors="coerce")
        df["Modal Price"] = pd.to_numeric(df["Modal Price"], errors="coerce")

        df.dropna(inplace=True)

        # Average same-date prices
        df = df.groupby("Price Date").agg({
            "Min Price": "mean",
            "Max Price": "mean",
            "Modal Price": "mean"
        }).reset_index()

        # Convert Rs/quintal → Rs/kg
        df["Min Price"] /= 100
        df["Max Price"] /= 100
        df["Modal Price"] /= 100

        # Sort by date
        df = df.sort_values("Price Date")

        # ----------------------------
        # FEATURE ENGINEERING
        # ----------------------------

        # Month feature
        df["Month"] = df["Price Date"].dt.month

        # Previous day price
        df["Prev Price"] = df["Modal Price"].shift(1)

        # Price change
        df["Price Change"] = df["Modal Price"] - df["Prev Price"]

        # Remove first row (NaN after shift)
        df.dropna(inplace=True)

        # Round values
        df = df.round(2)

        # Final dataset
        df = df[[
            "Price Date",
            "Month",
            "Min Price",
            "Max Price",
            "Prev Price",
            "Price Change",
            "Modal Price"
        ]]

        # Save cleaned dataset
        output_file = os.path.join(clean_folder, f"cleaned_{file}")
        df.to_csv(output_file, index=False)

        # Stats
        avg_price = round(df["Modal Price"].mean(), 2)
        min_price = round(df["Min Price"].min(), 2)
        max_price = round(df["Max Price"].max(), 2)

        print("Average Price (₹/kg):", avg_price)
        print("Minimum Market Price (₹/kg):", min_price)
        print("Maximum Market Price (₹/kg):", max_price)

print("\nAll datasets cleaned and ML-ready.")