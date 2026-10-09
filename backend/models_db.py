from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import datetime
from backend.database import Base

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    environmental_data = relationship("EnvironmentalDataCache", back_populates="location", cascade="all, delete-orphan")
    models = relationship("ModelMetadata", back_populates="location", cascade="all, delete-orphan")

class IndiaStation(Base):
    __tablename__ = "india_stations"
    
    id = Column(String, primary_key=True, index=True) # e.g. "TN_CHE_01"
    station_name = Column(String, index=True, nullable=False)
    city = Column(String, index=True, nullable=False)
    state = Column(String, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    source = Column(String, default="CPCB / Government Open Data Platform")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class IndiaAirQualityRecord(Base):
    __tablename__ = "india_air_quality"
    
    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String, ForeignKey("india_stations.id", ondelete="CASCADE"), nullable=False)
    pollutant = Column(String, index=True, nullable=False) # e.g., "NO2", "O3", "PM2.5", "PM10", "SO2", "CO"
    value = Column(Float, nullable=True)
    unit = Column(String, default="µg/m³")
    observed_at = Column(DateTime, index=True, nullable=False)
    source = Column(String, default="CPCB / Government Open Data Platform")
    status = Column(String, default="Available") # "Available", "Delayed", "Unavailable"

class DataSource(Base):
    __tablename__ = "data_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # "Ground Observation", "Atmospheric Forecast", "ML Prediction"
    api_url = Column(String, nullable=True)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="Active")

class IndiaMLPrediction(Base):
    __tablename__ = "india_ml_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String, ForeignKey("india_stations.id", ondelete="CASCADE"), nullable=False)
    pollutant = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    predicted_value = Column(Float, nullable=False)
    model_name = Column(String, nullable=False)
    unit = Column(String, default="µg/m³")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class EnvironmentalDataCache(Base):
    __tablename__ = "environmental_data_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    
    # Pollutants
    pm2_5 = Column(Float, nullable=True)
    pm10 = Column(Float, nullable=True)
    no2 = Column(Float, nullable=True)
    o3 = Column(Float, nullable=True)
    co = Column(Float, nullable=True)
    so2 = Column(Float, nullable=True)
    
    # Weather
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    precipitation = Column(Float, nullable=True)
    pressure = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    wind_direction = Column(Float, nullable=True)
    
    is_forecast = Column(Boolean, default=False)
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    location = relationship("Location", back_populates="environmental_data")

class ModelMetadata(Base):
    __tablename__ = "model_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    target_pollutant = Column(String, nullable=False) # e.g., "no2" or "o3"
    model_name = Column(String, nullable=False) # e.g., "Linear Regression", "Random Forest", "XGBoost"
    
    # Evaluation metrics
    mae = Column(Float, nullable=True)
    mse = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    r2_score = Column(Float, nullable=True)
    
    file_path = Column(String, nullable=False)
    trained_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    location = relationship("Location", back_populates="models")

