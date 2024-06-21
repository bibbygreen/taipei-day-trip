from fastapi import *
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
import mysql.connector.pooling
import json
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import jwt

app=FastAPI()
app.mount("/static", StaticFiles(directory="static", html=True),name="static")

# JWT configuration
SECRET_KEY = "4321rewq"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

con = {
    "user": "debian-sys-maint",
    "password": "YNGJmkTnnhw4dDT2",
    "host": "localhost",
    "database": "taipei_day_trip"
}
connection_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="my_pool",
    pool_size=5,
    **con
)
# Get a connection from the pool
connection = connection_pool.get_connection()
# Create a cursor from the connection
cursor = connection.cursor()

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
def execute_sql(sql, values=None):
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

@app.post("/signup")
async def signup(request: Request, name: str = Form(None), email: str = Form(None), password: str = Form(None)):
    select_email_command = "SELECT * FROM members WHERE email = %s"
    cursor.execute(select_email_command, (email,))
    result=cursor.fetchone()
    if not result:
        add_new_member="INSERT INTO members (name, email, password) VALUES (%s, %s, %s)"
        new_member=(name, email, password)
        cursor.execute(add_new_member, new_member)
        con.commit() #確認執行
        return JSONResponse(content={"detail": "Signup successful!"})
    else:
        return JSONResponse(content={"detail": "該帳號已被註冊，請重新輸入"}, status_code=400)
    
@app.post("/signin")
async def signin(email: str = Form(None), password: str = Form(None)):
    select_email_command = "SELECT * FROM members WHERE email = %s AND password = %s"
    cursor.execute(select_email_command, (email, password))
    result = cursor.fetchone()
    if result:
        access_token = create_access_token(data={"sub": email})
        return JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    else:
        return JSONResponse(content={"detail": "Invalid email or password"}, status_code=400)

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
            result=execute_sql(query, (keyword, keyword, PAGE_SIZE, offset, ))
        else:
            query="SELECT * FROM taipei_spots ORDER BY id LIMIT %s OFFSET %s;"
            result=execute_sql(query, (PAGE_SIZE, offset, ))
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
        result=execute_sql("SELECT * FROM taipei_spots WHERE id=%s;", (attractionId,))
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
        result=execute_sql("SELECT mrt, COUNT(name) as count FROM taipei_spots GROUP BY mrt ORDER BY count DESC;")
        return JSONResponse(content={"data":[row[0] for row in result]})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error":True, "message": str(e)})
    
