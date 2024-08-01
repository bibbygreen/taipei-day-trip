from dbconfig import connection_pool
from fastapi.responses import JSONResponse
from function import execute_sql
class AttractionModel:
  def get(attractionId):
    try:
      result=execute_sql("SELECT * FROM taipei_spots WHERE id=%s;", (attractionId,))
      return result
    except:
      return "error"