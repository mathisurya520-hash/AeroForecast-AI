import os
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "saved_models"))
os.makedirs(MODELS_DIR, exist_ok=True)

def train_and_evaluate(X: pd.DataFrame, y: pd.Series, target_name: str, location_id: int):
    """
    Trains and compares Linear Regression, Random Forest, and XGBoost models
    on a sequential train/test split. Chooses the best model, retrains it on
    the full dataset, saves it, and returns the evaluation metrics & feature importances.
    """
    # 1. Sequential time-aware train/test split (80% train, 20% test)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    # 2. Define the models to compare (optimized for low-latency web serving)
    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=35, max_depth=8, random_state=42, n_jobs=-1),
        "XGBoost": XGBRegressor(n_estimators=35, max_depth=5, learning_rate=0.1, random_state=42, n_jobs=-1)
    }
    
    results = {}
    trained_estimators = {}
    
    # 3. Train and evaluate each model on the split
    for name, model in models.items():
        # Fit model on training set
        model.fit(X_train, y_train)
        trained_estimators[name] = model
        
        # Predict on validation/test set
        preds = model.predict(X_test)
        
        # Calculate metrics
        mae = float(mean_absolute_error(y_test, preds))
        mse = float(mean_squared_error(y_test, preds))
        rmse = float(np.sqrt(mse))
        r2 = float(r2_score(y_test, preds))
        
        results[name] = {
            "MAE": round(mae, 4),
            "MSE": round(mse, 4),
            "RMSE": round(rmse, 4),
            "R2": round(r2, 4)
        }
        
    # 4. Select the best model based on R2 Score (or RMSE if R2 is negative)
    # R2 can be negative if model performs worse than a horizontal line
    best_model_name = max(results, key=lambda k: results[k]["R2"])
    
    # If the best R2 is very poor, fallback to XGBoost
    if results[best_model_name]["R2"] <= 0:
        best_model_name = "XGBoost"
        
    best_estimator = trained_estimators[best_model_name]
    
    # 5. Extract feature importances
    feature_importances = {}
    feature_names = X.columns.tolist()
    
    if best_model_name in ["Random Forest", "XGBoost"]:
        importances = best_estimator.feature_importances_
        for name, imp in zip(feature_names, importances):
            feature_importances[name] = float(imp)
    elif best_model_name == "Linear Regression":
        # For Linear Regression, we can use normalized coefficients as feature importances
        coefs = np.abs(best_estimator.coef_)
        total = np.sum(coefs) if np.sum(coefs) > 0 else 1.0
        importances = coefs / total
        for name, imp in zip(feature_names, importances):
            feature_importances[name] = float(imp)
            
    # Sort feature importances descending
    feature_importances = dict(sorted(feature_importances.items(), key=lambda item: item[1], reverse=True))
    
    # 6. Retrain the best model on the FULL historical dataset
    full_model = models[best_model_name]
    full_model.fit(X, y)
    
    # 7. Save the full model using joblib
    model_filename = f"best_model_{target_name}_loc_{location_id}.joblib"
    model_path = os.path.join(MODELS_DIR, model_filename)
    joblib.dump(full_model, model_path)
    
    return {
        "metrics_comparison": results,
        "best_model_name": best_model_name,
        "feature_importances": feature_importances,
        "saved_model_path": model_path
    }
