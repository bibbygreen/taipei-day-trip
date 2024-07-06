from fastapi import *
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import mysql.connector.pooling
import json
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Dict
import jwt
import random
import string
import requests

app=FastAPI()
app.mount("/static", StaticFiles(directory="static", html=True),name="static")

# JWT configuration
SECRET_KEY="4321rewq"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

class UserSignin(BaseModel):
    email: str
    password: str

class BookingData(BaseModel):
    attractionId: int
    date: str
    time: str
    price: int

class BookingTable(BaseModel):
    id: int
    user_id: int
    attractionId: int
    date: str
    time: str
    price: int
     
class Attraction(BaseModel):
    # id: int
    name: str
    address: str
    image: str

class Trip(BaseModel):
    attraction: Attraction
    date: str
    time: str

class Contact(BaseModel):
    name: str
    email: str
    phone: str

class Order(BaseModel):
    price: int
    trip: Trip
    contact: Contact

class OrderData(BaseModel):
    prime: str
    order: Order

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
connection=connection_pool.get_connection()
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
        user_id=payload.get("id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        connection=connection_pool.get_connection()
        cursor=connection.cursor(dictionary=True)
        
        select_user_query="SELECT id, name, email FROM members WHERE id = %s"
        cursor.execute(select_user_query, (user_id,))
        user_info=cursor.fetchone()
        
        if user_info:
            return user_info
        else:
            raise HTTPException(status_code=404, detail="User not found")
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

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
async def signup(user_data: UserSignup):
    connection=None
    cursor=None
    try:
        connection=connection_pool.get_connection()
        cursor=connection.cursor()

        select_email_query="SELECT * FROM members WHERE email=%s"
        cursor.execute(select_email_query, (user_data.email,))
        result=cursor.fetchone()
        if result:
            return JSONResponse(content={"error": True, "message": "該帳號已被註冊，請重新輸入"}, status_code=400)
        
        add_member_query="INSERT INTO members (name, email, password) VALUES (%s, %s, %s)"
        member_data=(user_data.name, user_data.email, user_data.password)
        cursor.execute(add_member_query, member_data)
        
        connection.commit()
        return JSONResponse(content={"ok": True})

    except mysql.connector.Error as e:
        return JSONResponse(content={"error": True, "message": f"Database error: {str(e)}"}, status_code=500)

    except Exception as e:
        return JSONResponse(content={"error": True, "message": f"Unexpected error: {str(e)}"}, status_code=500)
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.put("/api/user/auth")
async def signin(user_data: UserSignin):
    try:
        connection=connection_pool.get_connection()
        cursor=connection.cursor()

        select_email_command="SELECT id, name, email FROM members WHERE email=%s AND password=%s"
        cursor.execute(select_email_command, (user_data.email, user_data.password))
        result=cursor.fetchone()

        if result:
            user_id, username, user_email=result
            access_token=create_access_token(data={"id": user_id, "name": username, "email": user_email})
            return JSONResponse(content={"token": access_token})
        else:
            return JSONResponse(content={"error": True, "message": '帳號或密碼輸入有誤'}, status_code=400)
    
    except mysql.connector.Error as e:
        return JSONResponse(content={"error": True, "message": f"Database error: {str(e)}"}, status_code=500)
    
    except Exception as e:
        return JSONResponse(content={"error": True, "message": f"Unexpected error: {str(e)}"}, status_code=500)
    
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.get(path="/api/user/auth")
async def get_api_user_auth(request: Request):
    auth_header=request.headers.get("Authorization")
    if auth_header:
        token=auth_header.split(" ")[1]
        user_info=verify_token(token)
        response_data={
            "id": user_info["id"],
            "name": user_info["name"],
            "email": user_info["email"]
        }          
        return JSONResponse(content={"data": response_data})
    else:
        raise HTTPException(status_code=401, detail="Authorization header missing")

@app.post("/api/booking")
async def create_booking(request: Request, booking_data: BookingData):
    token=request.headers.get("Authorization").split(" ")[1]
    user_info=verify_token(token)
    user_id=user_info["id"]
    try:
        connection=connection_pool.get_connection()
        cursor=connection.cursor()

        select_booking_query="SELECT * FROM bookings WHERE user_id = %s"
        cursor.execute(select_booking_query, (user_id,))
        existing_booking=cursor.fetchone()

        if existing_booking:
            update_booking_query="""
                UPDATE bookings
                SET attraction_id = %s, date =%s, time =%s, price =%s
                WHERE user_id = %s
            """
            cursor.execute(update_booking_query, (booking_data.attractionId, booking_data.date, booking_data.time, booking_data.price, user_id))
        else:
            insert_booking_query="""
                INSERT INTO bookings (user_id, attraction_id, date, time, price)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(insert_booking_query, (user_id, booking_data.attractionId, booking_data.date, booking_data.time, booking_data.price)) 
        connection.commit()
        return JSONResponse(content={"ok": True})
    
    except mysql.connector.Error as e:
        return JSONResponse(content={"error":True, "message":f"Database error: {str(e)}"}, status_code=500)
    except Exception as e:
        return JSONResponse(content={"error": True, "message": f"Unexpected error: {str(e)}"}, status_code=500)
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.get("/api/booking")
async def get_user_booking_data(request: Request):
    token=request.headers.get("Authorization").split(" ")[1]
    user_info=verify_token(token)
    user_id=user_info["id"]
    user_name=user_info["name"]
    try:
        connection=connection_pool.get_connection()
        cursor=connection.cursor()

        select_query="""
            SELECT bookings.date, bookings.time, bookings.price, taipei_spots.name AS attraction_name, taipei_spots.address AS attraction_address, taipei_spots.images
            FROM bookings
            INNER JOIN taipei_spots ON bookings.attraction_id = taipei_spots.id
            WHERE bookings.user_id = %s;    
        """
        cursor.execute(select_query,(user_id,))
        booking_data=cursor.fetchone()

        if booking_data:
            attraction={
                "name": booking_data[3],  
                "address": booking_data[4],
                "images": booking_data[5] 
            }
            booking={
                "date": booking_data[0].isoformat(),
                "time": booking_data[1],
                "price": booking_data[2] 
            }
        else:
            attraction={}
            booking={}

        response_data={
            "attraction": attraction,
            "date": booking.get("date", ""),
            "time": booking.get("time", ""),
            "price": booking.get("price", "")
        }
        return JSONResponse(content={"data": response_data})
    
    except mysql.connector.Error as e:
        print(f"MySQL Error fetching bookings: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        print(f"Error fetching bookings: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        cursor.close()
        connection.close()
        
@app.delete("/api/booking")
async def delete_user_booking_data(request: Request):
    token=request.headers.get("Authorization").split(" ")[1]
    user_info=verify_token(token)
    user_id=user_info["id"]
    
    try:
        connection=connection_pool.get_connection()
        cursor=connection.cursor()

        delete_query="""
            DELETE FROM bookings
            WHERE user_id = %s;
        """
        cursor.execute(delete_query, (user_id,))
        connection.commit()
        return JSONResponse(content={"ok":True})
    except mysql.connector.Error as e:
        print(f"MySQL Error deleting booking data: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        print(f"Error deleting booking data: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        cursor.close()
        connection.close()

@app.post("/api/orders")
async def create_orders(request: Request, order_data: OrderData):
    try:
        token=request.headers.get("Authorization").split(" ")[1]
        user_info=verify_token(token)
        user_id=user_info["id"]
        
        order_number=''.join(random.choices(string.digits, k=14))
        
        payment_status=0
        payment_message="UNPAID"
   
        connection=connection_pool.get_connection()
        cursor=connection.cursor()

        insert_order_query="""
            INSERT INTO orders (user_id, order_number, payment_status, payment_message)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_order_query, (user_id, order_number, payment_status, payment_message))
        connection.commit()
        
        tap_pay_data={
            "prime": order_data.prime,
            "partner_key": "partner_RLLTLiV8ap6pzkVZZ7WdhJilhDePqu9EwGXye5hxBBqXbhjUb0WKevLe",  
            "merchant_id": "a20034425_ESUN",  
            "details": "TapPay Test",
            "amount": int(order_data.order.price),
            "cardholder": {
                "name":order_data.order.contact.name,
                "email": order_data.order.contact.email,
                "phone_number": order_data.order.contact.phone
            },
            "remember": False
        }
        url="https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime"
        headers={
            "Content-Type": "application/json",
            "x-api-key": "partner_RLLTLiV8ap6pzkVZZ7WdhJilhDePqu9EwGXye5hxBBqXbhjUb0WKevLe"  # Replace with your partner key
        }
        print("TapPay data:", tap_pay_data)
        tap_pay_response=requests.post(url, headers=headers, json=tap_pay_data)
        tap_pay_result=tap_pay_response.json()

        if tap_pay_result.get('status') == 0:
            payment_status=1
            payment_message="付款成功"
        else:
            payment_status=2
            payment_message="付款失敗"

        update_payment_query="""
            UPDATE orders
            SET payment_status = %s, payment_message = %s
            WHERE order_number = %s
        """
        cursor.execute(update_payment_query, (payment_status, payment_message, order_number))
        connection.commit()

        # Delete booking data for the current user
        delete_booking_query="""
            DELETE FROM bookings WHERE user_id = %s
        """
        cursor.execute(delete_booking_query, (user_id,))
        connection.commit()

        response_data={
            "number": order_number,
            "payment": {
                "status": payment_status,
                "message": payment_message
            }
        }
        return JSONResponse(content={"data": response_data})
        
    
    except mysql.connector.Error as e:
        return JSONResponse(content={"error": True, "message": f"Database error: {str(e)}"}, status_code=500)
    except Exception as e:
        return JSONResponse(content={"error": True, "message": f"Unexpected error: {str(e)}"}, status_code=500)
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.get("/api/order/{orderNumber}")
async def get_order(orderNumber: str):
    try:
        connection=connection_pool.get_connection()
        cursor=connection.cursor()

        order_query="""
            SELECT orders.order_number, orders.payment_status, orders.payment_message, orders.price,
            bookings.date, bookings.time, bookings.price AS booking_price, 
            taipei_spots.id AS attraction_id, taipei_spots.name AS attraction_name, 
            taipei_spots.address AS attraction_address, taipei_spots.images, 
            members.name AS contact_name, members.email AS contact_email, 
            members.phone AS contact_phone
            FROM orders
            JOIN bookings ON orders.user_id = bookings.user_id
            JOIN taipei_spots ON bookings.attraction_id = taipei_spots.id
            JOIN members ON orders.user_id = members.id
            WHERE orders.order_number = %s
        """
        cursor.execute(order_query, (orderNumber,))
        order=cursor.fetchone()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        response_data={
            "number": order["order_number"],
            "price": order["price"],
            "trip":{
                "attraction":{
                    "id": order["attraction_id"],
                    "name": order["attraction_name"],
                    "address": order["atttraction_address"],
                    "image": json.loads(order["images"])[0] if order["images"] else ""
                },
                "date": order["date"],
                "time": order["time"]
            },
            "contact":{
                "name": order["contact_name"],
                "email": order["contact_email"],
                "phone": order["contact_phone"]
            },
            "status": order["payment_Status"]
        }

        return JSONResponse(content={"data": response_data})
    
    except mysql.connector.Error as e:
        return JSONResponse(content={"error": True, "message": f"Database error: {str(e)}"}, status_code=500)
    except Exception as e:
        return JSONResponse(content={"error": True, "message": f"Unexpected error: {str(e)}"}, status_code=500)
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

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
