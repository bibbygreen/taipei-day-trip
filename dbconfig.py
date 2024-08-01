import mysql.connector.pooling
from dotenv import load_dotenv
import os
load_dotenv()

con={
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_NAME")
}
connection_pool=mysql.connector.pooling.MySQLConnectionPool(
    pool_name="my_pool",
    pool_size=5,
    **con
)