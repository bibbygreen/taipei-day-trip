from fastapi import *
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import mysql.connector.pooling
import json
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import jwt
import traceback

app=FastAPI()
app.mount("/static", StaticFiles(directory="static", html=True),name="static")

# JWT configuration
SECRET_KEY="4321rewq"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

con={
    "user": "debian-sys-maint",
    "password": "YNGJmkTnnhw4dDT2",
    "host": "localhost",
    "database": "taipei_day_trip"
}
connection_pool=mysql.connector.pooling.MySQLConnectionPool(
    pool_name="my_pool",
    pool_size=5,
    **con
)
# Get a connection from the pool
connection=connection_pool.get_connection()
# Create a cursor from the connection
cursor=connection.cursor()

def create_access_token(data: dict, expires_delta: timedelta=None):
    to_encode=data.copy()
    if expires_delta:
        expire=datetime.now() + expires_delta
    else:
        expire=datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt=jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload=jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def execute_sql(sql, values=None):
    connection=None
    try:
        connection=connection_pool.get_connection()
        if connection.is_connected():
            cursor=connection.cursor()
            if values:
                cursor.execute(sql, values)
            else:
                cursor.execute(sql)
            result=cursor.fetchall()
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

@app.post("/api/user")
async def signup(request: Request, name: str=Form(None), email: str=Form(None), password: str=Form(None)):
    connection=None
    cursor=None
    try:
        connection=connection_pool.get_connection()
        cursor=connection.cursor()

        # Check if email already exists
        select_email_query="SELECT * FROM members WHERE email=%s"
        cursor.execute(select_email_query, (email,))
        result=cursor.fetchone()
        if result:
            return JSONResponse(content={"error": True, "message": "該帳號已被註冊，請重新輸入"}, status_code=400)
        
        # Insert new member
        add_member_query="INSERT INTO members (name, email, password) VALUES (%s, %s, %s)"
        member_data=(name, email, password)
        cursor.execute(add_member_query, member_data)
        
        # Commit the transaction
        connection.commit()

        return JSONResponse(content={"ok": True, "message":"註冊成功"})

    except mysql.connector.Error as e:
        traceback.print_exc()
        return JSONResponse(content={"error": True, "message": f"Database error: {str(e)}"}, status_code=500)

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(content={"error": True, "message": f"Unexpected error: {str(e)}"}, status_code=500)
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.put("/api/user/auth")
async def signin(email: str=Form(None), password: str=Form(None)):
    try:
        connection=connection_pool.get_connection()
        cursor=connection.cursor()

        select_email_command="SELECT id, name, email FROM members WHERE email=%s AND password=%s"
        cursor.execute(select_email_command, (email, password))
        result=cursor.fetchone()

        if result:
            user_id, username, user_email=result
            access_token=create_access_token(data={"id": user_id, "name": username, "sub": user_email})
            return JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
        else:
            return JSONResponse(content={"error": True, "message": '帳號或密碼輸入有誤'}, status_code=400)
    
    except mysql.connector.Error as e:
        return JSONResponse(content={"error": True, "message": f"Database error: {str(e)}"}, status_code=500)
    
    except Exception as e:
        return JSONResponse(content={"error": True, "message": f"Unexpected error: {str(e)}"}, status_code=500)
    
    finally:
        cursor.close()
        connection.close()

@app.get(path="/api/user/auth")
async def get_api_user_auth(request: Request):
    auth_header=request.headers.get("Authorization")
    if auth_header:
        token=auth_header.split(" ")[1]
        user_info=verify_token(token)
        return JSONResponse(content={"user_info": user_info})
    else:
        raise HTTPException(status_code=401, detail="Authorization header missing")

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
async def api_attraction(page: int=Query(..., description="Page number", ge=0), keyword: str=Query(None, description="Keyword for search")):
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
    
