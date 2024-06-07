import json
import mysql.connector.pooling
import re
# con = {
#     "user": "debian-sys-maint",
#     "password": "YNGJmkTnnhw4dDT2",
#     "host": "localhost",
#     "database": "taipei_day_trip"
# }
con = {
    "user": "root",
    "password": "root",
    "host": "localhost",
    "database": "taipei_day_trip"
}

connection_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="my_pool",
    pool_size=5,
    **con
)

def execute_query(sql, values=None):
    connection = None
    try:
        # Acquire a connection from the pool
        connection = connection_pool.get_connection()

        if connection.is_connected():
            cursor = connection.cursor()
            if values:
                cursor.execute(sql, values)
                connection.commit()
            else:
                cursor.execute(sql)
            result = cursor.fetchall()
            return result
    except mysql.connector.Error as e:
        print(f"Error: {e.msg}")
    finally:
        if connection:
            # Close cursor and connection to release resources back to the pool
            cursor.close()
            connection.close()

url = "data/taipei-attractions.json"
with open(url, 'r', encoding='utf-8') as file:
    data = json.load(file)

for i in range(len(data['result']['results'])):
    name=data['result']['results'][i]['name']
    category=data['result']['results'][i]['CAT']
    description=data['result']['results'][i]['description']
    address=data['result']['results'][i]['address']
    address=address.replace(" ","")
    transport=data['result']['results'][i]['direction']
    mrt=data['result']['results'][i]['MRT']
    lat=float(data['result']['results'][i]['latitude'])
    lng=float(data['result']['results'][i]['longitude'])

    url_string=data['result']['results'][i]['file']
    
    file = url_string.split("https://")
    images = []  # Reset the images list for each iteration

    for j in file:
        if j.endswith(".jpg") or j.endswith(".JPG"):
            j = "https://" + j
            images.append(j)

    images_json=json.dumps(images)
    execute_query("INSERT INTO taipei_spots (name, category, description, address, transport, mrt, lat, lng, images) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", (name, category, description, address, transport, mrt, lat, lng, images_json))
