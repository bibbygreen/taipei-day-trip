import json
import mysql.connector.pooling

# 連線資料庫
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

images=[]
for i in range(len(data['result']['results'])):
    raw_id=int(data['result']['results'][i]['_id'])
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
    images=[part + ".jpg" for part in url_string.split(".jpg")[:-1]]
    images+=[part + ".png" for part in url_string.split(".png")[:-1]]
    images+=[part + ".jpg" for part in url_string.split(".JPG")[:-1]]
    images+=[part + ".png" for part in url_string.split(".PNG")[:-1]]
    images_json = json.dumps(images)
    break
    execute_query("INSERT INTO taipei_spots (raw_id, name, category, description, address, transport, mrt, lat, lng, images) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)", (raw_id, name, category, description, address, transport, mrt, lat, lng, images_json))
