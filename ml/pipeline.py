import os
import joblib
import pandas as pd
import numpy as np
import datetime
from sqlalchemy.orm import Session
from backend.models_db import ModelMetadata
from ml.preprocessing import db_records_to_df, clean_and_impute_data, engineer_features, prepare_training_data
from ml.models import train_and_evaluate, MODELS_DIR

def run_ml_pipeline(db: Session, location_id: int, records, force_retrain: bool = False):
    """
    Orchestrates the ML pipeline:
    1. Loads the historical + forecast dataset from db records.
    2. Cleans and imputes missing values.
    3. Engineers calendar and lag features.
    4. Checks if models are trained. If not or if forced, trains Linear Regression,
       Random Forest, and XGBoost, evaluates them, selects the best, saves it,
       and records metadata in the database.
    5. Performs recursive step-by-step forecasting for the future rows.
    6. Returns forecasts, metrics, and feature importances.
    """
    # 1. Prepare raw dataframe
    df_raw = db_records_to_df(records)
    
    # 2. Clean and Impute
    df_clean = clean_and_impute_data(df_raw)
    
    # 3. Engineer baseline calendar & lag features
    df_features = engineer_features(df_clean)
    
    # 4. Check model status or retrain
    no2_model_path = os.path.join(MODELS_DIR, f"best_model_no2_loc_{location_id}.joblib")
    o3_model_path = os.path.join(MODELS_DIR, f"best_model_o3_loc_{location_id}.joblib")
    
    models_exist = os.path.exists(no2_model_path) and os.path.exists(o3_model_path)
    
    metrics_info = {}
    importances_info = {}
    
    if not models_exist or force_retrain:
        # Prepare training data (only historical observations)
        X, y_no2, y_o3, feature_cols = prepare_training_data(df_features)
        
        if len(X) < 48:
            raise Exception(f"Insufficient historical data to train models. Need at least 48 hours, got {len(X)}")
            
        # Train & Evaluate NO2
        no2_results = train_and_evaluate(X, y_no2, "no2", location_id)
        # Save ModelMetadata to DB
        db.query(ModelMetadata).filter(
            ModelMetadata.location_id == location_id,
            ModelMetadata.target_pollutant == "no2"
        ).delete()
        
        no2_meta = ModelMetadata(
            location_id=location_id,
            target_pollutant="no2",
            model_name=no2_results["best_model_name"],
            mae=no2_results["metrics_comparison"][no2_results["best_model_name"]]["MAE"],
            mse=no2_results["metrics_comparison"][no2_results["best_model_name"]]["MSE"],
            rmse=no2_results["metrics_comparison"][no2_results["best_model_name"]]["RMSE"],
            r2_score=no2_results["metrics_comparison"][no2_results["best_model_name"]]["R2"],
            file_path=no2_results["saved_model_path"]
        )
        db.add(no2_meta)
        
        # Train & Evaluate O3
        o3_results = train_and_evaluate(X, y_o3, "o3", location_id)
        # Save ModelMetadata to DB
        db.query(ModelMetadata).filter(
            ModelMetadata.location_id == location_id,
            ModelMetadata.target_pollutant == "o3"
        ).delete()
        
        o3_meta = ModelMetadata(
            location_id=location_id,
            target_pollutant="o3",
            model_name=o3_results["best_model_name"],
            mae=o3_results["metrics_comparison"][o3_results["best_model_name"]]["MAE"],
            mse=o3_results["metrics_comparison"][o3_results["best_model_name"]]["MSE"],
            rmse=o3_results["metrics_comparison"][o3_results["best_model_name"]]["RMSE"],
            r2_score=o3_results["metrics_comparison"][o3_results["best_model_name"]]["R2"],
            file_path=o3_results["saved_model_path"]
        )
        db.add(o3_meta)
        db.commit()
        
        metrics_info["no2"] = {
            "best_model": no2_results["best_model_name"],
            "comparison": no2_results["metrics_comparison"]
        }
        metrics_info["o3"] = {
            "best_model": o3_results["best_model_name"],
            "comparison": o3_results["metrics_comparison"]
        }
        
        importances_info["no2"] = no2_results["feature_importances"]
        importances_info["o3"] = o3_results["feature_importances"]
        
    else:
        # Load metadata from DB if they exist, otherwise we reconstruct
        no2_meta = db.query(ModelMetadata).filter(
            ModelMetadata.location_id == location_id,
            ModelMetadata.target_pollutant == "no2"
        ).first()
        o3_meta = db.query(ModelMetadata).filter(
            ModelMetadata.location_id == location_id,
            ModelMetadata.target_pollutant == "o3"
        ).first()
        
        # Just reconstruct simple metrics wrapper
        metrics_info["no2"] = {
            "best_model": no2_meta.model_name if no2_meta else "XGBoost",
            "comparison": {
                no2_meta.model_name: {
                    "MAE": no2_meta.mae,
                    "MSE": no2_meta.mse,
                    "RMSE": no2_meta.rmse,
                    "R2": no2_meta.r2_score
                }
            } if no2_meta else {}
        }
        metrics_info["o3"] = {
            "best_model": o3_meta.model_name if o3_meta else "XGBoost",
            "comparison": {
                o3_meta.model_name: {
                    "MAE": o3_meta.mae,
                    "MSE": o3_meta.mse,
                    "RMSE": o3_meta.rmse,
                    "R2": o3_meta.r2_score
                }
            } if o3_meta else {}
        }
        
        # Generate feature importances on the fly using the loaded model
        feature_cols = [
            "pm2_5", "pm10", "temperature", "humidity", "precipitation", 
            "pressure", "wind_speed", "wind_direction",
            "no2_lag_1", "no2_lag_3", "no2_lag_6", "no2_lag_12", "no2_lag_24",
            "o3_lag_1", "o3_lag_3", "o3_lag_6", "o3_lag_12", "o3_lag_24",
            "hour", "day", "month", "day_of_week"
        ]
        try:
            no2_m = joblib.load(no2_model_path)
            o3_m = joblib.load(o3_model_path)
            
            # Extract feature importance for NO2
            if hasattr(no2_m, "feature_importances_"):
                importances_info["no2"] = dict(sorted(
                    [(col, float(imp)) for col, imp in zip(feature_cols, no2_m.feature_importances_)],
                    key=lambda x: x[1],
                    reverse=True
                ))
            elif hasattr(no2_m, "coef_"):
                coefs = np.abs(no2_m.coef_)
                total = np.sum(coefs) if np.sum(coefs) > 0 else 1.0
                importances_info["no2"] = dict(sorted(
                    [(col, float(imp)) for col, imp in zip(feature_cols, coefs / total)],
                    key=lambda x: x[1],
                    reverse=True
                ))
            else:
                importances_info["no2"] = {col: float(1.0 / len(feature_cols)) for col in feature_cols}
                
            # Extract feature importance for O3
            if hasattr(o3_m, "feature_importances_"):
                importances_info["o3"] = dict(sorted(
                    [(col, float(imp)) for col, imp in zip(feature_cols, o3_m.feature_importances_)],
                    key=lambda x: x[1],
                    reverse=True
                ))
            elif hasattr(o3_m, "coef_"):
                coefs = np.abs(o3_m.coef_)
                total = np.sum(coefs) if np.sum(coefs) > 0 else 1.0
                importances_info["o3"] = dict(sorted(
                    [(col, float(imp)) for col, imp in zip(feature_cols, coefs / total)],
                    key=lambda x: x[1],
                    reverse=True
                ))
            else:
                importances_info["o3"] = {col: 1.0 / len(feature_cols) for col in feature_cols}
        except Exception as e:
            print(f"Error loading models for feature importance: {e}")
            importances_info["no2"] = {}
            importances_info["o3"] = {}

    # 5. Recursive step-by-step forecasting for the future rows
    # Load best trained models
    no2_model = joblib.load(no2_model_path)
    o3_model = joblib.load(o3_model_path)
    
    # We will modify df_features to fill in predicted values
    df_forecast = df_features.copy()
    
    # Identify indices where is_forecast is True
    forecast_indices = df_forecast[df_forecast["is_forecast"] == True].index.tolist()
    
    feature_cols = [
        "pm2_5", "pm10", "temperature", "humidity", "precipitation", 
        "pressure", "wind_speed", "wind_direction",
        "no2_lag_1", "no2_lag_3", "no2_lag_6", "no2_lag_12", "no2_lag_24",
        "o3_lag_1", "o3_lag_3", "o3_lag_6", "o3_lag_12", "o3_lag_24",
        "hour", "day", "month", "day_of_week"
    ]
    
    # Run sequential recursive forecasting
    for idx in forecast_indices:
        # Update lags for index `idx` using values from previous hours
        # Lags for NO2
        df_forecast.loc[idx, "no2_lag_1"] = df_forecast.loc[idx - 1, "no2"]
        df_forecast.loc[idx, "no2_lag_3"] = df_forecast.loc[idx - 3, "no2"]
        df_forecast.loc[idx, "no2_lag_6"] = df_forecast.loc[idx - 6, "no2"]
        df_forecast.loc[idx, "no2_lag_12"] = df_forecast.loc[idx - 12, "no2"]
        df_forecast.loc[idx, "no2_lag_24"] = df_forecast.loc[idx - 24, "no2"]
        
        # Lags for O3
        df_forecast.loc[idx, "o3_lag_1"] = df_forecast.loc[idx - 1, "o3"]
        df_forecast.loc[idx, "o3_lag_3"] = df_forecast.loc[idx - 3, "o3"]
        df_forecast.loc[idx, "o3_lag_6"] = df_forecast.loc[idx - 6, "o3"]
        df_forecast.loc[idx, "o3_lag_12"] = df_forecast.loc[idx - 12, "o3"]
        df_forecast.loc[idx, "o3_lag_24"] = df_forecast.loc[idx - 24, "o3"]
        
        # Create single row feature vector matching feature_cols format
        feature_row = df_forecast.loc[[idx], feature_cols]
        
        # Predict target values
        pred_no2 = float(no2_model.predict(feature_row)[0])
        pred_o3 = float(o3_model.predict(feature_row)[0])
        
        # Clip negative predictions to 0 (since concentration cannot be negative)
        pred_no2 = max(0.0, pred_no2)
        pred_o3 = max(0.0, pred_o3)
        
        # Save predictions back into DataFrame
        df_forecast.loc[idx, "no2"] = pred_no2
        df_forecast.loc[idx, "o3"] = pred_o3

    return df_forecast, metrics_info, importances_info
