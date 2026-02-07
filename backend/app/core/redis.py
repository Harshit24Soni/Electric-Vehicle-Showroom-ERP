import redis
import os
import json

# Create Redis Pool
pool = redis.ConnectionPool(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=True # Returns strings instead of bytes
)

def get_redis():
    """Get a Redis connection from the pool"""
    return redis.Redis(connection_pool=pool)

# Usage Example (Commented out)
# def get_vehicle_models(db):
#     cache = get_redis()
#     # Try to get from RAM first
#     if data := cache.get("vehicle_models"):
#         return json.loads(data)
#     
#     # If missing, get from DB
#     models = db.query(VehicleModel).all()
#     
#     # Save to RAM for 1 hour (3600 seconds)
#     cache.setex("vehicle_models", 3600, json.dumps(models))
#     return models
