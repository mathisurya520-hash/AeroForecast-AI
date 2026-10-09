import pandas as pd
import numpy as np

def db_records_to_df(records) -> pd.DataFrame:
    """
    Converts a list of EnvironmentalDataCache SQLAlchemy objects into a clean Pandas DataFrame.
    """
    data = []
    for r in records:
        data.append({
            "timestamp": r.timestamp,
            "pm2_5": r.pm2_5,
            "pm10": r.pm10,
            "no2": r.no2,
            "o3": r.o3,
            "co": r.co,
            "so2": r.so2,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "precipitation": r.precipitation,
            "pressure": r.pressure,
            "wind_speed": r.wind_speed,
            "wind_direction": r.wind_direction,
            "is_forecast": r.is_forecast
        })
    df = pd.DataFrame(data)
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df

def clean_and_impute_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans the dataframe by handling missing values (forward and backward fill)
    and ensuring all essential columns are present and numeric.
    """
    df = df.copy()
    
    # Identify numeric columns for imputation
    cols_to_impute = [
        "pm2_5", "pm10", "no2", "o3", "co", "so2",
        "temperature", "humidity", "precipitation", "pressure", "wind_speed", "wind_direction"
    ]
    
    for col in cols_to_impute:
        if col in df.columns:
            # Force numeric conversion
            df[col] = pd.to_numeric(df[col], errors="coerce")
            
    # Forward fill then backward fill to impute missing environmental data
    df[cols_to_impute] = df[cols_to_impute].ffill().bfill()
    
    # Fill remaining NaNs with 0 if any columns are entirely empty (unlikely but safe)
    df[cols_to_impute] = df[cols_to_impute].fillna(0)
    
    return df

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineers time-series and environmental features:
    - Lag features for NO2 and O3 (1h, 3h, 6h, 12h, 24h)
    - Calendar features (hour, day, month, day_of_week)
    """
    df = df.copy()
    
    # Lags for NO2
    df["no2_lag_1"] = df["no2"].shift(1)
    df["no2_lag_3"] = df["no2"].shift(3)
    df["no2_lag_6"] = df["no2"].shift(6)
    df["no2_lag_12"] = df["no2"].shift(12)
    df["no2_lag_24"] = df["no2"].shift(24)
    
    # Lags for O3
    df["o3_lag_1"] = df["o3"].shift(1)
    df["o3_lag_3"] = df["o3"].shift(3)
    df["o3_lag_6"] = df["o3"].shift(6)
    df["o3_lag_12"] = df["o3"].shift(12)
    df["o3_lag_24"] = df["o3"].shift(24)
    
    # Calendar features
    df["hour"] = df["timestamp"].dt.hour
    df["day"] = df["timestamp"].dt.day
    df["month"] = df["timestamp"].dt.month
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    
    return df

def prepare_training_data(df: pd.DataFrame):
    """
    Splits the historical dataset (where is_forecast == False) into features (X) and targets (y_no2, y_o3).
    Drops rows with NaN values resulting from shift operations.
    """
    # Only train on historical observations
    hist_df = df[df["is_forecast"] == False].copy()
    
    # Feature columns list
    feature_cols = [
        "pm2_5", "pm10", "temperature", "humidity", "precipitation", 
        "pressure", "wind_speed", "wind_direction",
        "no2_lag_1", "no2_lag_3", "no2_lag_6", "no2_lag_12", "no2_lag_24",
        "o3_lag_1", "o3_lag_3", "o3_lag_6", "o3_lag_12", "o3_lag_24",
        "hour", "day", "month", "day_of_week"
    ]
    
    # Drop rows that have NaN in feature columns (first 24 rows will have NaNs due to shift(24))
    hist_df = hist_df.dropna(subset=feature_cols)
    
    X = hist_df[feature_cols]
    y_no2 = hist_df["no2"]
    y_o3 = hist_df["o3"]
    
    return X, y_no2, y_o3, feature_cols
