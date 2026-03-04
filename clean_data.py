import pandas as pd

# Load raw dataset
df = pd.read_csv("datasets/raw/tomatoes.csv", skiprows=1)

# Keep required columns
df = df[["Price Date", "Min Price", "Max Price", "Modal Price"]]

# Remove empty rows
df.dropna(inplace=True)

# Convert data types
df["Price Date"] = pd.to_datetime(df["Price Date"], dayfirst=True)

df["Min Price"] = pd.to_numeric(df["Min Price"], errors="coerce")
df["Max Price"] = pd.to_numeric(df["Max Price"], errors="coerce")
df["Modal Price"] = pd.to_numeric(df["Modal Price"], errors="coerce")

# Remove rows that became NaN after conversion
df.dropna(inplace=True)

# Average prices for same date
df = df.groupby("Price Date").agg({
    "Min Price": "mean",
    "Max Price": "mean",
    "Modal Price": "mean"
}).reset_index()

# Convert from Rs/quintal → Rs/kg
df["Min Price"] = df["Min Price"] / 100
df["Max Price"] = df["Max Price"] / 100
df["Modal Price"] = df["Modal Price"] / 100

# Round prices to 2 decimal places
df["Min Price"] = df["Min Price"].round(2)
df["Max Price"] = df["Max Price"].round(2)
df["Modal Price"] = df["Modal Price"].round(2)

# Sort by date
df = df.sort_values("Price Date")

# Save cleaned dataset
df.to_csv("datasets/cleaned/tomato_clean.csv", index=False)

# Extract statistics
avg_price = round(df["Modal Price"].mean(), 2)
min_price = round(df["Min Price"].min(), 2)
max_price = round(df["Max Price"].max(), 2)

print("Average Price (₹/kg):", avg_price)
print("Minimum Market Price (₹/kg):", min_price)
print("Maximum Market Price (₹/kg):", max_price)