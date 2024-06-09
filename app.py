from fastapi import *
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
import mysql.connector.pooling
import json
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

app=FastAPI()
app.add_middleware(SessionMiddleware, secret_key="qwert54321")
app.mount("/static", StaticFiles(directory="static", html=True),name="static")
con = {
    "user": "root",
    "password": "root",
    "host": "localhost",
    "database": "taipei_day_trip"
}
# con = {
#     "user": "debian-sys-maint",
#     "password": "YNGJmkTnnhw4dDT2",
#     "host": "localhost",
#     "database": "taipei_day_trip"
# }
connection_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="my_pool",
    pool_size=5,
    **con
)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://127.0.0.1:5500"],  # Replace with your frontend origin
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

def execute_query(sql, values=None):
    connection = None
    try:
        connection = connection_pool.get_connection()
        if connection.is_connected():
            cursor = connection.cursor()
            if values:
                cursor.execute(sql, values)
            else:
                cursor.execute(sql)
            result = cursor.fetchall()
            return result
    except mysql.connector.Error as e:
        print(f"Error: {e.msg}")
    finally:
        if connection:
            cursor.close()
            connection.close()

def process_to_JSON(result):
    processed_data=[]
    for row in result:
        processed_row={
            "id": row[0],
            "name": row[1],
            "category": row[2],
            "description": row[3],
            "address": row[4],
            "transport": row[5],
            "mrt": row[6],
            "lat": row[7],
            "lng": row[8],
            "images": json.loads(row[9])
        }
        processed_data.append(processed_row)
    return processed_data
       
# Static Pages (Never Modify Code in this Block)
@app.get("/", include_in_schema=False)
async def index(request: Request):
	return FileResponse("./static/index.html", media_type="text/html")
@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):
	return FileResponse("./static/attraction.html", media_type="text/html")
@app.get("/booking", include_in_schema=False)
async def booking(request: Request):
	return FileResponse("./static/booking.html", media_type="text/html")
@app.get("/thankyou", include_in_schema=False)
async def thankyou(request: Request):
	return FileResponse("./static/thankyou.html", media_type="text/html")

@app.get("/api/attractions")
async def api_attraction(page: int = Query(..., description="Page number", ge=0), keyword: str = Query(None, description="Keyword for search")):
    try:
        PAGE_SIZE=12 
        offset=page*PAGE_SIZE

        if keyword:
            query="SELECT * FROM taipei_spots WHERE name LIKE %s  OR mrt LIKE %s ORDER BY id LIMIT %s OFFSET %s;"
            keyword=f'%{keyword}%'
            result=execute_query(query, (keyword, keyword, PAGE_SIZE, offset, ))
        else:
            query="SELECT * FROM taipei_spots ORDER BY id LIMIT %s OFFSET %s;"
            result=execute_query(query, (PAGE_SIZE, offset, ))
        if not result:
            raise HTTPException(status_code=404, detail="No matching attractions found")
        json_result=process_to_JSON(result)

        # Check if there are more pages
        has_next_page=len(result)==PAGE_SIZE
        next_page=page+1 if has_next_page else None

        json_response={"nextPage": next_page, "data": json_result}
        return JSONResponse(content=json_response)
    except HTTPException as http_exception:
        raise http_exception
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": True, "message": str(e)})

@app.get("/api/attraction/{attractionId}")
async def api_attraction_id(attractionId: int):
    try:
        result=execute_query("SELECT * FROM taipei_spots WHERE id=%s;", (attractionId,))
        if result:
            json_result=process_to_JSON(result)
            json_response={"data": json_result[0]}
            return JSONResponse(content=json_response)
        else:
            error_message={
                 "error": True,
                 "message": "Attraction not found"
            }
            return JSONResponse(status_code=400, content=error_message)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": True, "message": str(e)})

@app.get("/api/mrts")
async def api_mrts():
    try:
        result=execute_query("SELECT mrt, COUNT(name) as count FROM taipei_spots GROUP BY mrt ORDER BY count DESC;")
        return JSONResponse(content={"data":[row[0] for row in result]})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error":True, "message": str(e)})